use base64::Engine;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use crate::input_simulator;
use crate::screen_capture;
use crate::table_scanner::{self, Card, GamePhase, TableState};
use crate::window_detector::TableWindowInfo;

/// Bot configuration (adjustable from frontend).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BotConfig {
    pub skill_level: i32,
    pub aggression: f64,
    pub bluff_frequency: f64,
    pub min_reaction_ms: u64,
    pub max_reaction_ms: u64,
    pub auto_fold_weak: bool,
    pub max_tables: i32,
}

impl Default for BotConfig {
    fn default() -> Self {
        Self {
            skill_level: 50,
            aggression: 0.55,
            bluff_frequency: 0.12,
            min_reaction_ms: 800,
            max_reaction_ms: 3000,
            auto_fold_weak: true,
            max_tables: 4,
        }
    }
}

/// Status of a single bot table thread.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TableBotStatus {
    pub table_id: String,
    pub title: String,
    pub status: String, // "idle" | "running" | "paused" | "error"
    pub hands_played: u32,
    pub profit_loss: f64,
    pub current_state: String,
    pub win_rate: f64,
    pub started_at: u64,
}

/// Events emitted from backend to frontend.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BotStatusEvent {
    pub tables: Vec<TableBotStatus>,
}

/// A running bot instance per table.
struct BotInstance {
    stop_flag: Arc<AtomicBool>,
    status: Arc<Mutex<TableBotStatus>>,
    last_state: Arc<Mutex<Option<TableState>>>,
}

/// Global registry of running bot instances.
static BOT_INSTANCES: Mutex<Option<HashMap<String, BotInstance>>> = Mutex::new(None);
static BOT_CONFIG: Mutex<BotConfig> = Mutex::new(BotConfig {
    skill_level: 50,
    aggression: 0.55,
    bluff_frequency: 0.12,
    min_reaction_ms: 800,
    max_reaction_ms: 3000,
    auto_fold_weak: true,
    max_tables: 4,
});

fn instances_lock() -> std::sync::MutexGuard<'static, Option<HashMap<String, BotInstance>>> {
    BOT_INSTANCES.lock().expect("BOT_INSTANCES poisoned")
}

// ── Decision engine (simple heuristic, v1) ──

/// Evaluate hand strength tier (0-5).
/// 0 = high card, 5 = very strong.
fn eval_hand_strength(hero: &[Card], community: &[Card]) -> i32 {
    let hero_ranks: Vec<&str> = hero.iter().map(|c| c.rank.as_str()).collect();
    let comm_ranks: Vec<&str> = community.iter().map(|c| c.rank.as_str()).collect();
    let all_ranks: Vec<&str> = hero_ranks.iter().chain(comm_ranks.iter()).copied().collect();

    // Count pairs
    let mut rank_counts: HashMap<&str, i32> = HashMap::new();
    for r in &all_ranks {
        *rank_counts.entry(r).or_insert(0) += 1;
    }

    let pairs = rank_counts.values().filter(|&&c| c >= 2).count() as i32;
    let trips = rank_counts.values().filter(|&&c| c >= 3).count() as i32;
    let quads = rank_counts.values().filter(|&&c| c >= 4).count() as i32;

    // Suited check
    let suited = hero.len() == 2 && hero[0].suit == hero[1].suit;

    // Connected check
    let connected = if hero_ranks.len() == 2 {
        is_connected(hero_ranks[0], hero_ranks[1])
    } else {
        false
    };

    // High card strength (A=14, K=13, Q=12, J=11, T=10)
    let high_card_strength: i32 = hero_ranks.iter().map(|r| rank_value(r)).sum();

    // Scoring
    let mut score = 0;
    if quads > 0 { score = 5; }
    else if trips > 0 && pairs >= 2 { score = 5; } // full house
    else if trips > 0 { score = 4; }
    else if pairs >= 2 { score = 3; }
    else if pairs == 1 { score = 2; }
    else if suited && connected && high_card_strength >= 18 { score = 2; } // suited connector broadway
    else if suited && high_card_strength >= 15 { score = 1; }
    else if connected && high_card_strength >= 15 { score = 1; }
    else if high_card_strength >= 15 { score = 1; }
    else { score = 0; }

    score
}

fn rank_value(r: &str) -> i32 {
    match r {
        "A" => 14, "K" => 13, "Q" => 12, "J" => 11, "T" => 10,
        "9" => 9, "8" => 8, "7" => 7, "6" => 6, "5" => 5,
        "4" => 4, "3" => 3, "2" => 2, _ => 0,
    }
}

fn is_connected(r1: &str, r2: &str) -> bool {
    let v1 = rank_value(r1);
    let v2 = rank_value(r2);
    (v1 - v2).abs() <= 2
}

/// Decide action based on hand strength and config.
fn decide_action(
    state: &TableState,
    config: &BotConfig,
) -> (String, f64) {
    let strength = eval_hand_strength(&state.hero_cards, &state.community_cards);
    let phase = &state.phase;

    // Fold if very weak and auto-fold is on
    if config.auto_fold_weak && strength == 0 && *phase != GamePhase::Preflop {
        return ("fold".to_string(), 0.0);
    }

    // Check if possible (no current bet to call)
    if state.hero_bet == 0.0 && state.pot_size == 0.0 {
        return match strength {
            0..=1 => ("check".to_string(), 0.0),
            _ => ("raise".to_string(), pot_fraction(&state, config, 0.5)),
        };
    }

    match strength {
        0 => {
            // Weak hand: check or fold
            if state.hero_bet == 0.0 {
                ("check".to_string(), 0.0)
            } else {
                ("fold".to_string(), 0.0)
            }
        }
        1 => {
            // Marginal: call small bets, fold to big
            if state.hero_bet <= pot_fraction(&state, config, 0.3) {
                ("call".to_string(), state.hero_bet)
            } else {
                ("fold".to_string(), 0.0)
            }
        }
        2 => {
            // Pair or draw: call or small raise
            if state.hero_bet <= pot_fraction(&state, config, 0.4) {
                ("call".to_string(), state.hero_bet)
            } else {
                ("raise".to_string(), pot_fraction(&state, config, 0.5))
            }
        }
        3 => {
            // Two pair or better: raise
            ("raise".to_string(), pot_fraction(&state, config, 0.66))
        }
        4..=5 => {
            // Trips+: big raise or all-in
            if state.pot_size > 0.0 {
                ("raise".to_string(), pot_fraction(&state, config, 1.0))
            } else {
                ("raise".to_string(), pot_fraction(&state, config, 0.75))
            }
        }
        _ => ("fold".to_string(), 0.0),
    }
}

fn pot_fraction(_state: &TableState, _config: &BotConfig, fraction: f64) -> f64 {
    // v1: simple pot-sized bet
    // Real implementation needs actual pot size from table scan
    10.0 * fraction
}

// ── Bot thread lifecycle ──

/// Start a bot thread for a detected table window.
pub fn start_bot_table(win: &TableWindowInfo, app: AppHandle) -> Result<(), String> {
    let mut instances = instances_lock();
    if instances.is_none() {
        *instances = Some(HashMap::new());
    }
    let map = instances.as_mut().unwrap();

    if map.contains_key(&win.title) {
        return Err(format!("Table '{}' is already running", win.title));
    }

    let stop_flag = Arc::new(AtomicBool::new(false));
    let status = Arc::new(Mutex::new(TableBotStatus {
        table_id: win.title.clone(),
        title: win.title.clone(),
        status: "running".to_string(),
        hands_played: 0,
        profit_loss: 0.0,
        current_state: "initializing".to_string(),
        win_rate: 0.0,
        started_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    }));
    let last_state = Arc::new(Mutex::new(None::<TableState>));

    let sf = stop_flag.clone();
    let st = status.clone();
    let ls = last_state.clone();
    let app_clone = app.clone();
    let win_info = win.clone();

    thread::spawn(move || {
        bot_loop(sf, st, ls, app_clone, win_info);
    });

    map.insert(
        win.title.clone(),
        BotInstance {
            stop_flag,
            status,
            last_state,
        },
    );

    // Emit status update
    emit_all_status(&app);

    Ok(())
}

/// Main bot loop: capture → scan → decide → act → sleep → repeat.
fn bot_loop(
    stop_flag: Arc<AtomicBool>,
    status: Arc<Mutex<TableBotStatus>>,
    _last_state: Arc<Mutex<Option<TableState>>>,
    app: AppHandle,
    win: TableWindowInfo,
) {
    let _cfg = BOT_CONFIG.lock().expect("BOT_CONFIG poisoned").clone();
    let mut last_hand_profit = 0.0f64;
    let mut hand_profits: Vec<f64> = Vec::new();
    let mut prev_stack = 1000.0;
    let mut last_phase = GamePhase::Unknown;
    let mut acted_this_hand = false;

    loop {
        if stop_flag.load(Ordering::Relaxed) {
            break;
        }

        let table_state = match run_one_cycle(&win) {
            Ok(state) => state,
            Err(e) => {
                if let Ok(mut s) = status.lock() {
                    s.current_state = format!("error: {e}");
                    s.status = "error".to_string();
                }
                emit_all_status(&app);
                thread::sleep(Duration::from_secs(2));
                continue;
            }
        };

        // Track hand profit: when a new hand starts (preflop with fresh cards), record previous hand's result
        if table_state.phase == GamePhase::Preflop
            && last_phase != GamePhase::Preflop
            && acted_this_hand
        {
            let current_stack = table_state.hero_stack;
            let hand_result = current_stack - prev_stack;
            if hand_result != 0.0 {
                last_hand_profit = hand_result;
                hand_profits.push(hand_result);
                if let Ok(mut s) = status.lock() {
                    s.profit_loss += hand_result;
                    s.hands_played += 1;
                    if !hand_profits.is_empty() {
                        let total: f64 = s.profit_loss;
                        s.win_rate = (total / s.hands_played as f64) * 100.0;
                    }
                }
            }
            prev_stack = current_stack;
            acted_this_hand = false;
        }

        // If hero's turn, make a decision
        if table_state.is_hero_turn && !acted_this_hand {
            let cfg = BOT_CONFIG.lock().expect("BOT_CONFIG poisoned").clone();
            let (action, amount) = decide_action(&table_state, &cfg);

            let reaction_ms = if cfg.min_reaction_ms < cfg.max_reaction_ms {
                cfg.min_reaction_ms
                    + (fast_rand() % (cfg.max_reaction_ms - cfg.min_reaction_ms))
            } else {
                cfg.min_reaction_ms
            };

            thread::sleep(Duration::from_millis(reaction_ms));

            match input_simulator::execute_poker_action_internal(
                &action,
                amount,
                "PokerStars",
            ) {
                Ok(()) => {
                    acted_this_hand = true;
                    if let Ok(mut s) = status.lock() {
                        s.current_state = format!("acted: {action}");
                    }
                }
                Err(e) => {
                    if let Ok(mut s) = status.lock() {
                        s.current_state = format!("action failed: {e}");
                    }
                }
            }
        }

        last_phase = table_state.phase.clone();
        emit_all_status(&app);

        // Sleep between cycles (500-1000ms)
        let cycle_ms = 500 + (fast_rand() % 500);
        thread::sleep(Duration::from_millis(cycle_ms));
    }
}

/// Simple PRNG for anti-detection timing jitter.
fn fast_rand() -> u64 {
    use std::time::SystemTime;
    let nanos = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos() as u64;
    nanos.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407)
}

/// Run one capture → detect cycle.
fn run_one_cycle(win: &TableWindowInfo) -> Result<TableState, String> {
    // 1. Capture screen
    let b64 = screen_capture::capture_screen_internal()?;

    // 2. Decode image
    let b64_str = if b64.contains("base64,") {
        b64.split("base64,").nth(1).unwrap_or(&b64)
    } else {
        &b64
    };
    let img_bytes = base64::engine::general_purpose::STANDARD
        .decode(b64_str)
        .map_err(|e| format!("Base64 decode: {e}"))?;
    let img = image::load_from_memory(&img_bytes)
        .map_err(|e| format!("Image decode: {e}"))?
        .to_rgba8();

    // 3. Detect table region
    let _table = screen_capture::detect_table_region_internal(&img);

    // 4. Scan table state
    let state = table_scanner::scan_table_state(
        &img,
        win.x,
        win.y,
        win.width,
        win.height,
    );

    Ok(state)
}

// ── Tauri commands ──

/// Start bot on all detected PokerStars tables.
#[tauri::command]
pub fn start_bot(app: AppHandle, windows: Vec<TableWindowInfo>) -> Result<(), String> {
    for win in &windows {
        start_bot_table(win, app.clone())?;
    }
    Ok(())
}

/// Stop all bot instances.
#[tauri::command]
pub fn stop_bot() -> Result<(), String> {
    let mut instances = instances_lock();
    if let Some(map) = instances.as_mut() {
        for (_id, instance) in map.iter() {
            instance.stop_flag.store(true, Ordering::Relaxed);
        }
        map.clear();
    }
    Ok(())
}

/// Pause all bot instances.
#[tauri::command]
pub fn pause_bot() -> Result<(), String> {
    let instances = instances_lock();
    if let Some(map) = instances.as_ref() {
        for (_id, instance) in map.iter() {
            if let Ok(mut s) = instance.status.lock() {
                s.status = "paused".to_string();
            }
        }
    }
    Ok(())
}

/// Resume all bot instances.
#[tauri::command]
pub fn resume_bot() -> Result<(), String> {
    let instances = instances_lock();
    if let Some(map) = instances.as_ref() {
        for (_id, instance) in map.iter() {
            if let Ok(mut s) = instance.status.lock() {
                if s.status == "paused" {
                    s.status = "running".to_string();
                }
            }
        }
    }
    Ok(())
}

/// Get current bot statuses.
#[tauri::command]
pub fn get_bot_status() -> Result<Vec<TableBotStatus>, String> {
    let instances = instances_lock();
    if let Some(map) = instances.as_ref() {
        let mut statuses: Vec<TableBotStatus> = map
            .values()
            .filter_map(|i| i.status.lock().ok().map(|s| s.clone()))
            .collect();
        statuses.sort_by(|a, b| a.table_id.cmp(&b.table_id));
        Ok(statuses)
    } else {
        Ok(vec![])
    }
}

/// Update bot config from frontend.
#[tauri::command]
pub fn update_bot_config(config: BotConfig) -> Result<(), String> {
    let mut cfg = BOT_CONFIG.lock().map_err(|e| format!("Lock error: {e}"))?;
    *cfg = config;
    Ok(())
}

/// Get current bot config.
#[tauri::command]
pub fn get_bot_config() -> Result<BotConfig, String> {
    let cfg = BOT_CONFIG.lock().map_err(|e| format!("Lock error: {e}"))?;
    Ok(cfg.clone())
}

fn emit_all_status(app: &AppHandle) {
    let instances = instances_lock();
    let tables = if let Some(map) = instances.as_ref() {
        let mut v: Vec<TableBotStatus> = map
            .values()
            .filter_map(|i| i.status.lock().ok().map(|s| s.clone()))
            .collect();
        v.sort_by(|a, b| a.table_id.cmp(&b.table_id));
        v
    } else {
        vec![]
    };
    drop(instances);

    let _ = app.emit("bot-status", BotStatusEvent { tables });
}

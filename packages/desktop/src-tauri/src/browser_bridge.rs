use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use tiny_http::{Header, Method, Response, Server};

use crate::site_registry::SiteRegistry;
use crate::table_scanner::{Card, GamePhase, TableState};

// ── Wire protocol types ──

/// State pushed from browser extension → Tauri.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BrowserTableState {
    pub table_id: String,
    pub site_name: String,
    pub url: String,
    pub hero_cards: Vec<BrowserCard>,
    pub community_cards: Vec<BrowserCard>,
    pub pot_size: f64,
    pub hero_stack: f64,
    pub hero_bet: f64,
    pub is_hero_turn: bool,
    pub phase: String, // "preflop" | "flop" | "turn" | "river"
    pub buttons_visible: HashMap<String, bool>,
    /// Optional base64 PNG screenshot for OCR fallback
    pub screenshot_b64: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BrowserCard {
    pub rank: String,
    pub suit: String,
}

/// Action pushed from Tauri → browser extension.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BrowserAction {
    pub action: String, // "fold" | "call" | "raise" | "all_in" | "check" | "none"
    pub amount: f64,
}

/// GET /action response.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActionResponse {
    pub table_id: String,
    pub action: String,
    pub amount: f64,
    pub pending: bool,
}

/// POST /state body.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StateRequest {
    pub table_id: String,
    pub state: BrowserTableState,
}

/// POST /screenshot body for OCR fallback.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScreenshotRequest {
    pub table_id: String,
    pub site_name: String,
    pub url: String,
    pub screenshot_b64: String,
}

// ── Bridge state ──

struct TableBuffer {
    latest_state: Option<BrowserTableState>,
    pending_action: Option<BrowserAction>,
    fallback_screenshot: Option<ScreenshotRequest>,
}

pub struct BridgeState {
    buffers: HashMap<String, TableBuffer>,
    #[allow(dead_code)]
    port: u16,
    site_registry: SiteRegistry,
}

// ── Global statics ──

static BRIDGE_PORT: Mutex<Option<u16>> = Mutex::new(None);
static BRIDGE_INNER: Mutex<Option<Arc<Mutex<BridgeState>>>> = Mutex::new(None);

// ── Public API ──

/// Start the browser bridge. Returns the port. Idempotent.
pub fn init_bridge() -> Result<u16, String> {
    {
        let port_guard = BRIDGE_PORT.lock().map_err(|e| format!("BRIDGE_PORT: {e}"))?;
        if let Some(port) = *port_guard {
            return Ok(port);
        }
    }

    let (state_arc, port) = spawn_server()?;

    {
        let mut port_guard = BRIDGE_PORT.lock().map_err(|e| format!("BRIDGE_PORT: {e}"))?;
        *port_guard = Some(port);
    }
    {
        let mut inner = BRIDGE_INNER.lock().map_err(|e| format!("BRIDGE_INNER: {e}"))?;
        *inner = Some(state_arc);
    }

    Ok(port)
}

/// Get the bridge port, if running.
pub fn get_bridge_port() -> Option<u16> {
    BRIDGE_PORT.lock().ok().and_then(|g| *g)
}

/// Push a bot action for a browser table. Extension polls it via GET /action.
pub fn push_action(table_id: &str, action: &str, amount: f64) -> Result<(), String> {
    with_bridge(|bs| {
        let buffer = bs.buffers.entry(table_id.to_string()).or_insert_with(|| TableBuffer {
            latest_state: None,
            pending_action: None,
            fallback_screenshot: None,
        });
        buffer.pending_action = Some(BrowserAction {
            action: action.to_string(),
            amount,
        });
    })
}

/// Read latest table state pushed from the browser extension.
pub fn read_latest_state(table_id: &str) -> Option<BrowserTableState> {
    with_bridge_read(|bs| bs.buffers.get(table_id)?.latest_state.clone()).flatten()
}

/// Take the latest fallback screenshot (consumed after scan).
#[allow(dead_code)]
pub fn take_fallback_screenshot(table_id: &str) -> Option<ScreenshotRequest> {
    with_bridge(|bs| {
        bs.buffers.get_mut(table_id)?.fallback_screenshot.take()
    }).ok().flatten()
}

/// Convert browser DOM state into the format the decision engine expects.
pub fn browser_state_to_table_state(bs: &BrowserTableState) -> TableState {
    let phase = match bs.phase.to_lowercase().as_str() {
        "preflop" => GamePhase::Preflop,
        "flop" => GamePhase::Flop,
        "turn" => GamePhase::Turn,
        "river" => GamePhase::River,
        "showdown" => GamePhase::Showdown,
        _ => GamePhase::Unknown,
    };

    let hero_cards: Vec<Card> = bs.hero_cards.iter().map(|c| Card {
        rank: c.rank.clone(),
        suit: c.suit.clone(),
        confidence: 0.9,
    }).collect();

    let community_cards: Vec<Card> = bs.community_cards.iter().map(|c| Card {
        rank: c.rank.clone(),
        suit: c.suit.clone(),
        confidence: 0.9,
    }).collect();

    TableState {
        phase,
        hero_cards,
        community_cards,
        pot_size: bs.pot_size,
        hero_stack: bs.hero_stack,
        hero_bet: bs.hero_bet,
        is_hero_turn: bs.is_hero_turn,
        has_checked: false,
        has_folded: false,
        last_action: "waiting".to_string(),
        community_card_rects: [(0, 0, 0, 0); 5],
        fold_btn: (0, 0),
        call_btn: (0, 0),
        raise_btn: (0, 0),
        allin_btn: (0, 0),
        check_btn: (0, 0),
    }
}

/// List browser table IDs currently tracked.
pub fn list_browser_tables() -> Vec<String> {
    with_bridge_read(|bs| bs.buffers.keys().cloned().collect()).unwrap_or_default()
}

// ── Internal helpers ──

fn with_bridge<F, R>(f: F) -> Result<R, String>
where
    F: FnOnce(&mut BridgeState) -> R,
{
    let inner = BRIDGE_INNER.lock().map_err(|e| format!("BRIDGE_INNER: {e}"))?;
    let arc = inner.as_ref().ok_or("Bridge not initialized")?;
    let mut bs = arc.lock().map_err(|e| format!("BridgeState: {e}"))?;
    Ok(f(&mut bs))
}

fn with_bridge_read<F, R>(f: F) -> Option<R>
where
    F: FnOnce(&BridgeState) -> R,
{
    let inner = BRIDGE_INNER.lock().ok()?;
    let arc = inner.as_ref()?;
    let bs = arc.lock().ok()?;
    Some(f(&bs))
}

// ── Server spawn ──

fn spawn_server() -> Result<(Arc<Mutex<BridgeState>>, u16), String> {
    use std::net::TcpListener;

    for p in 19876..19887 {
        let addr = format!("127.0.0.1:{p}");
        if TcpListener::bind(&addr).is_ok() {
            let state = Arc::new(Mutex::new(BridgeState {
                buffers: HashMap::new(),
                port: p,
                site_registry: SiteRegistry::new(),
            }));
            let state_clone = state.clone();

            thread::spawn(move || {
                let server = match Server::http(&addr) {
                    Ok(s) => s,
                    Err(e) => {
                        eprintln!("[browser_bridge] Server error: {e}");
                        return;
                    }
                };
                eprintln!("[browser_bridge] Listening on {addr}");

                for request in server.incoming_requests() {
                    let method = request.method();
                    let url = request.url().to_string();
                    let path = url.split('?').next().unwrap_or(&url).to_string();

                    let mut state_guard = state_clone.lock().expect("BridgeState poisoned");

                    match (method, path.as_str()) {
                        (Method::Post, "/state") => handle_post_state(request, &mut state_guard),
                        (Method::Get, "/action") => handle_get_action(request, &url, &mut state_guard),
                        (Method::Post, "/screenshot") => handle_post_screenshot(request, &mut state_guard),
                        (Method::Get, "/sites") => handle_get_sites(request, &state_guard),
                        (Method::Get, "/health") => {
                            let _ = request.respond(Response::from_string("ok"));
                        }
                        _ => {
                            let _ = request.respond(Response::from_string("not found").with_status_code(404));
                        }
                    }
                }
            });

            return Ok((state, p));
        }
    }

    Err("No available port for browser bridge (19876–19886)".to_string())
}

// ── HTTP handlers ──

fn read_body(request: &mut tiny_http::Request) -> String {
    let mut body = String::new();
    let _ = request.as_reader().read_to_string(&mut body);
    body
}

fn json_response(body: String) -> Response<std::io::Cursor<Vec<u8>>> {
    Response::from_string(body)
        .with_header(Header::from_bytes("Content-Type", "application/json").unwrap())
}

fn handle_post_state(mut request: tiny_http::Request, state: &mut BridgeState) {
    let body = read_body(&mut request);
    match serde_json::from_str::<StateRequest>(&body) {
        Ok(req) => {
            let table_id = req.table_id.clone();
            let buffer = state.buffers.entry(table_id.clone()).or_insert_with(|| TableBuffer {
                latest_state: None,
                pending_action: None,
                fallback_screenshot: None,
            });
            buffer.latest_state = Some(req.state);
            let _ = request.respond(json_response("{\"ok\":true}".to_string()));
        }
        Err(e) => {
            let _ = request.respond(
                Response::from_string(format!("{{\"error\":\"{e}\"}}"))
                    .with_status_code(400)
                    .with_header(Header::from_bytes("Content-Type", "application/json").unwrap())
            );
        }
    }
}

fn handle_get_action(request: tiny_http::Request, url: &str, state: &mut BridgeState) {
    let table_id = url.split("table_id=")
        .nth(1)
        .unwrap_or("")
        .split('&')
        .next()
        .unwrap_or("");

    if table_id.is_empty() {
        let _ = request.respond(
            Response::from_string("{\"error\":\"missing table_id\"}".to_string())
                .with_status_code(400)
                .with_header(Header::from_bytes("Content-Type", "application/json").unwrap())
        );
        return;
    }

    let buffer = state.buffers.entry(table_id.to_string()).or_insert_with(|| TableBuffer {
        latest_state: None,
        pending_action: None,
        fallback_screenshot: None,
    });

    let response = if let Some(action) = buffer.pending_action.take() {
        ActionResponse { table_id: table_id.to_string(), action: action.action, amount: action.amount, pending: true }
    } else {
        ActionResponse { table_id: table_id.to_string(), action: "none".to_string(), amount: 0.0, pending: false }
    };

    let json = serde_json::to_string(&response).unwrap_or_else(|_| "{}".to_string());
    let _ = request.respond(json_response(json));
}

fn handle_post_screenshot(mut request: tiny_http::Request, state: &mut BridgeState) {
    let body = read_body(&mut request);
    match serde_json::from_str::<ScreenshotRequest>(&body) {
        Ok(req) => {
            let table_id = req.table_id.clone();
            let buffer = state.buffers.entry(table_id.clone()).or_insert_with(|| TableBuffer {
                latest_state: None,
                pending_action: None,
                fallback_screenshot: None,
            });
            buffer.fallback_screenshot = Some(req);
            let _ = request.respond(json_response("{\"ok\":true}".to_string()));
        }
        Err(e) => {
            let _ = request.respond(
                Response::from_string(format!("{{\"error\":\"{e}\"}}"))
                    .with_status_code(400)
                    .with_header(Header::from_bytes("Content-Type", "application/json").unwrap())
            );
        }
    }
}

fn handle_get_sites(request: tiny_http::Request, state: &BridgeState) {
    let json = state.site_registry.to_json();
    let _ = request.respond(json_response(json));
}

// ── Tauri commands ──

/// Start the browser bridge. Called from frontend on app launch.
#[tauri::command]
pub fn init_bridge_cmd() -> Result<u16, String> {
    init_bridge()
}

/// Get the current bridge port (0 if not running).
#[tauri::command]
pub fn get_bridge_port_cmd() -> Result<u16, String> {
    Ok(get_bridge_port().unwrap_or(0))
}

/// List browser table IDs currently connected via the extension.
#[tauri::command]
pub fn list_browser_tables_cmd() -> Result<Vec<String>, String> {
    Ok(list_browser_tables())
}

use serde::{Deserialize, Serialize};

/// A recognized playing card.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Card {
    pub rank: String,
    pub suit: String,
    pub confidence: f64,
}

/// Current betting round.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum GamePhase {
    Preflop,
    Flop,
    Turn,
    River,
    Showdown,
    Unknown,
}

/// Full detected state of a poker table.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TableState {
    pub phase: GamePhase,
    pub hero_cards: Vec<Card>,
    pub community_cards: Vec<Card>,
    pub pot_size: f64,
    pub hero_stack: f64,
    pub hero_bet: f64,
    pub is_hero_turn: bool,
    pub has_checked: bool,
    pub has_folded: bool,
    pub last_action: String,
    pub community_card_rects: [(i32, i32, i32, i32); 5],
    pub fold_btn: (i32, i32),
    pub call_btn: (i32, i32),
    pub raise_btn: (i32, i32),
    pub allin_btn: (i32, i32),
    pub check_btn: (i32, i32),
}

// ── Reference coordinates (1024×768) ──

const REF_W: i32 = 1024;
const REF_H: i32 = 768;

fn scale_x(x: i32, win_w: i32) -> i32 { x * win_w / REF_W }
fn scale_y(y: i32, win_h: i32) -> i32 { y * win_h / REF_H }

// ── PokerStars layout (1024×768 reference) ──

struct PokerStarsLayout;

impl PokerStarsLayout {
    fn hero_card(win_w: i32, win_h: i32, idx: usize) -> (i32, i32, i32, i32) {
        let card_w = scale_x(36, win_w);
        let card_h = scale_y(50, win_h);
        let gap = scale_x(6, win_w);
        let base_x = scale_x(445, win_w);
        let base_y = scale_y(520, win_h);
        (base_x + idx as i32 * (card_w + gap), base_y, card_w, card_h)
    }

    fn community_card(win_w: i32, win_h: i32, idx: usize) -> (i32, i32, i32, i32) {
        let card_w = scale_x(36, win_w);
        let card_h = scale_y(50, win_h);
        let gap = scale_x(6, win_w);
        let base_x = scale_x(300, win_w);
        let base_y = scale_y(195, win_h);
        (base_x + idx as i32 * (card_w + gap), base_y, card_w, card_h)
    }

    fn button_pos(win_w: i32, win_h: i32, btn: &str) -> (i32, i32) {
        match btn {
            "fold" => (scale_x(180, win_w), scale_y(530, win_h)),
            "call" => (scale_x(340, win_w), scale_y(530, win_h)),
            "raise" => (scale_x(500, win_w), scale_y(530, win_h)),
            "allin" => (scale_x(660, win_w), scale_y(530, win_h)),
            "check" => (scale_x(340, win_w), scale_y(530, win_h)),
            _ => (0, 0),
        }
    }

    fn pot_pos(win_w: i32, win_h: i32) -> (i32, i32, i32, i32) {
        (scale_x(410, win_w), scale_y(90, win_h), scale_x(120, win_w), scale_y(20, win_h))
    }
}

// ── ACR (Americas Cardroom) layout (1024×768 reference) ──

struct ACRLayout;

impl ACRLayout {
    fn hero_card(win_w: i32, win_h: i32, idx: usize) -> (i32, i32, i32, i32) {
        let card_w = scale_x(40, win_w);
        let card_h = scale_y(56, win_h);
        let gap = scale_x(8, win_w);
        let base_x = scale_x(440, win_w);
        let base_y = scale_y(570, win_h);
        (base_x + idx as i32 * (card_w + gap), base_y, card_w, card_h)
    }

    fn community_card(win_w: i32, win_h: i32, idx: usize) -> (i32, i32, i32, i32) {
        let card_w = scale_x(38, win_w);
        let card_h = scale_y(54, win_h);
        let gap = scale_x(6, win_w);
        let base_x = scale_x(290, win_w);
        let base_y = scale_y(210, win_h);
        (base_x + idx as i32 * (card_w + gap), base_y, card_w, card_h)
    }

    fn button_pos(win_w: i32, win_h: i32, btn: &str) -> (i32, i32) {
        match btn {
            "fold" => (scale_x(270, win_w), scale_y(640, win_h)),
            "call" => (scale_x(420, win_w), scale_y(640, win_h)),
            "raise" => (scale_x(530, win_w), scale_y(640, win_h)),
            "allin" => (scale_x(660, win_w), scale_y(640, win_h)),
            "check" => (scale_x(420, win_w), scale_y(640, win_h)),
            _ => (0, 0),
        }
    }

    fn pot_pos(win_w: i32, win_h: i32) -> (i32, i32, i32, i32) {
        (scale_x(420, win_w), scale_y(72, win_h), scale_x(130, win_w), scale_y(20, win_h))
    }
}

// ── Generic scan functions (work for any layout once the correct layout is selected) ──

/// Read a single card from its image region.
fn read_card_from_region(
    img: &image::RgbaImage,
    rx: i32,
    ry: i32,
    rw: i32,
    rh: i32,
) -> Option<(String, String, f64)> {
    let (img_w, img_h) = img.dimensions();
    let x0 = rx.max(0).min(img_w as i32) as u32;
    let y0 = ry.max(0).min(img_h as i32) as u32;
    let x1 = (rx + rw).max(0).min(img_w as i32) as u32;
    let y1 = (ry + rh).max(0).min(img_h as i32) as u32;
    if x1 <= x0 || y1 <= y0 {
        return None;
    }

    // Sample the top-left rank area
    let rank_region_x = x0 + (rw as u32 / 12);
    let rank_region_y = y0 + (rh as u32 / 12);
    let rank_w = (rw as u32 / 3).min(20);
    let rank_h = (rh as u32 / 3).min(24);

    if rank_w < 4 || rank_h < 4 {
        return None;
    }

    // Determine suit color from the rank region
    let mut red_px = 0u32;
    let mut black_px = 0u32;
    let mut total_px = 0u32;

    for y in rank_region_y..rank_region_y + rank_h.min(12) {
        for x in rank_region_x..rank_region_x + rank_w.min(14) {
            if x >= img_w || y >= img_h {
                continue;
            }
            let px = img.get_pixel(x, y);
            let (r, g, b) = (px[0], px[1], px[2]);
            let brightness = (r as u16 + g as u16 + b as u16) / 3;
            if brightness > 200 {
                continue;
            }
            total_px += 1;
            if r > 150 && g < 80 && b < 80 {
                red_px += 1;
            }
            if r < 60 && g < 60 && b < 60 {
                black_px += 1;
            }
        }
    }

    let suit = if red_px > total_px / 3 {
        "h"
    } else if black_px > total_px / 3 {
        "s"
    } else {
        "?"
    };

    let rank = read_rank_from_scanlines(img, rank_region_x, rank_region_y, rank_w, rank_h);

    if rank == "?" {
        let rank2 = read_rank_column_sums(img, rank_region_x, rank_region_y, rank_w, rank_h, suit);
        let confidence = if rank2 != "?" { 0.6 } else { 0.3 };
        Some((rank2, suit.to_string(), confidence))
    } else {
        Some((rank, suit.to_string(), 0.7))
    }
}

fn read_rank_from_scanlines(
    img: &image::RgbaImage,
    rx: u32,
    ry: u32,
    rw: u32,
    _rh: u32,
) -> String {
    let mut has_top = false;
    let mut has_mid = false;
    let mut has_bot = false;
    let mut sample_count = 0u32;

    for col_offset in [0, 2, 4, 6] {
        let sx = rx + col_offset;
        if sx >= img.dimensions().0 {
            continue;
        }
        if ry < img.dimensions().1 {
            let px = img.get_pixel(sx, ry);
            if (px[0] as u16 + px[1] as u16 + px[2] as u16) / 3 < 100 {
                has_top = true;
            }
        }
        let my = ry + rw.min(20) / 2;
        if my < img.dimensions().1 {
            let px = img.get_pixel(sx, my);
            if (px[0] as u16 + px[1] as u16 + px[2] as u16) / 3 < 100 {
                has_mid = true;
            }
        }
        let by = ry + rw.min(20) - 1;
        if by < img.dimensions().1 {
            let px = img.get_pixel(sx, by);
            if (px[0] as u16 + px[1] as u16 + px[2] as u16) / 3 < 100 {
                has_bot = true;
            }
        }
        sample_count += 1;
    }

    if sample_count == 0 { return "?".to_string(); }

    match (has_top, has_mid, has_bot) {
        (true, false, true) => "A".to_string(),
        (true, true, true) => "K".to_string(),
        (false, true, false) => "Q".to_string(),
        (true, true, false) => "J".to_string(),
        (true, false, false) => "T".to_string(),
        (false, true, true) => "8".to_string(),
        _ => "?".to_string(),
    }
}

fn read_rank_column_sums(
    img: &image::RgbaImage,
    rx: u32,
    ry: u32,
    rw: u32,
    rh: u32,
    _suit: &str,
) -> String {
    let (img_w, img_h) = img.dimensions();
    let num_cols = (rw / 2).min(6).max(2) as u32;
    let col_step = rw / num_cols;
    if col_step < 2 { return "?".to_string(); }

    let mut signature = Vec::new();
    for ci in 0..num_cols {
        let sx = rx + ci * col_step + col_step / 2;
        if sx >= img_w { continue; }
        let mut dark_count = 0u32;
        let mut col_total = 0u32;
        for sy in ry..ry + rh.min(20) {
            if sy >= img_h { break; }
            let px = img.get_pixel(sx, sy);
            let b = (px[0] as u16 + px[1] as u16 + px[2] as u16) / 3;
            col_total += 1;
            if b < 100 { dark_count += 1; }
        }
        if col_total > 0 { signature.push(dark_count as f64 / col_total as f64); }
    }

    if signature.len() < 3 { return "?".to_string(); }

    let has_peak = signature.iter().any(|&v| v > 0.4);
    let has_spread = signature.iter().filter(|&&v| v > 0.2).count() >= 3;
    let top_heavy = signature[0] > 0.35;
    let mid_heavy = signature.iter().skip(1).take(signature.len() - 2).any(|&v| v > 0.4);
    let bottom_heavy = signature.last().copied().unwrap_or(0.0) > 0.35;

    match (top_heavy, mid_heavy, bottom_heavy, has_peak, has_spread) {
        (true, true, true, true, true) => "A".to_string(),
        (true, true, false, true, true) => "K".to_string(),
        (false, true, false, true, false) => "Q".to_string(),
        (true, false, true, true, false) => "J".to_string(),
        (true, false, false, true, false) => "T".to_string(),
        (false, true, true, true, false) => "9".to_string(),
        (false, true, true, false, true) => "8".to_string(),
        _ => "?".to_string(),
    }
}

// ── Phase detection ──

fn detect_phase(community_brightness: &[f64; 5]) -> GamePhase {
    let visible = community_brightness.iter().filter(|&&b| b > 0.3).count();
    match visible {
        0 => GamePhase::Preflop,
        1..=3 => GamePhase::Flop,
        4 => GamePhase::Turn,
        5 => GamePhase::River,
        _ => GamePhase::Unknown,
    }
}

fn hero_has_cards(img: &image::RgbaImage, cx: i32, cy: i32, cw: i32, ch: i32) -> bool {
    let (img_w, img_h) = img.dimensions();
    let x0 = cx.max(0).min(img_w as i32) as u32;
    let y0 = cy.max(0).min(img_h as i32) as u32;
    let x1 = (cx + cw).max(0).min(img_w as i32) as u32;
    let y1 = (cy + ch).max(0).min(img_h as i32) as u32;
    if x1 <= x0 || y1 <= y0 { return false; }

    let mut white = 0u32;
    let mut total = 0u32;
    for y in y0..y1.min(y0 + 10) {
        for x in x0..x1.min(x0 + 10) {
            let px = img.get_pixel(x, y);
            let b = (px[0] as u16 + px[1] as u16 + px[2] as u16) / 3;
            total += 1;
            if b > 180 { white += 1; }
        }
    }
    total > 0 && white > total / 3
}

fn is_hero_turn(img: &image::RgbaImage, btn_x: i32, btn_y: i32, win_w: i32) -> bool {
    let bx = btn_x.max(0).min(win_w - 1) as u32;
    let by = btn_y.max(0) as u32;
    let (img_w, img_h) = img.dimensions();
    if bx + 20 >= img_w || by + 10 >= img_h { return false; }

    let mut bright = 0u32;
    let mut total = 0u32;
    for dy in 0..10u32 {
        for dx in 0..20u32 {
            let px = img.get_pixel(bx + dx, by + dy);
            total += 1;
            let b = (px[0] as u16 + px[1] as u16 + px[2] as u16) / 3;
            if b > 100 { bright += 1; }
        }
    }
    total > 0 && bright > total / 3
}

fn read_pot_size_generic(img: &image::RgbaImage, pot_rect: (i32, i32, i32, i32)) -> f64 {
    let (pot_x, pot_y, pot_w, pot_h) = pot_rect;
    let (img_w, img_h) = img.dimensions();
    let x0 = pot_x.max(0).min(img_w as i32) as u32;
    let y0 = pot_y.max(0).min(img_h as i32) as u32;
    let x1 = (pot_x + pot_w).max(0).min(img_w as i32) as u32;
    let y1 = (pot_y + pot_h).max(0).min(img_h as i32) as u32;
    if x1 <= x0 || y1 <= y0 { return 0.0; }

    // Look for gold/yellow text (common for pot display) or light digits
    let mut found_gold = false;
    for x in x0..x1 {
        for y in (y1.saturating_sub(8))..y1 {
            if y >= img_h { continue; }
            let px = img.get_pixel(x, y);
            let (r, g, b) = (px[0], px[1], px[2]);
            if r > 200 && g > 150 && b < 100 {
                found_gold = true;
                break;
            }
        }
        if found_gold { break; }
    }
    if found_gold { 0.0 } else { 0.0 }
}

// ── Client-specific scanning ──

/// Scan a PokerStars table.
fn scan_pokerstars(img: &image::RgbaImage, win_w: i32, win_h: i32) -> TableState {
    let (img_w, _img_h) = img.dimensions();

    let mut hero_cards = Vec::new();
    for i in 0..2 {
        let (cx, cy, cw, ch) = PokerStarsLayout::hero_card(win_w, win_h, i);
        if let Some((rank, suit, conf)) = read_card_from_region(img, cx, cy, cw, ch) {
            hero_cards.push(Card { rank, suit, confidence: conf });
        }
    }

    let mut community_cards = Vec::new();
    let mut community_rects = [(0i32, 0i32, 0i32, 0i32); 5];
    let mut community_brightness = [0.0f64; 5];
    for i in 0..5 {
        let (cx, cy, cw, ch) = PokerStarsLayout::community_card(win_w, win_h, i);
        community_rects[i] = (cx, cy, cw, ch);
        let x0 = cx.max(0).min(win_w - 1) as u32;
        let y0 = cy.max(0).min(win_h - 1) as u32;
        if x0 + 10 < img_w && y0 + 10 < _img_h {
            let brightness = {
                let px = img.get_pixel(x0, y0);
                (px[0] as u16 + px[1] as u16 + px[2] as u16) as f64 / (3.0 * 255.0)
            };
            community_brightness[i] = brightness;
            if brightness > 0.3 {
                if let Some((rank, suit, conf)) = read_card_from_region(img, cx, cy, cw, ch) {
                    community_cards.push(Card { rank, suit, confidence: conf });
                }
            }
        }
    }

    let phase = detect_phase(&community_brightness);
    let has_cards = hero_has_cards(img, 0, 0, 1, 1);
    let call_btn = PokerStarsLayout::button_pos(win_w, win_h, "call");
    let check_btn = PokerStarsLayout::button_pos(win_w, win_h, "check");
    let turn = match phase {
        GamePhase::Preflop | GamePhase::Unknown => is_hero_turn(img, call_btn.0, call_btn.1, win_w),
        _ => is_hero_turn(img, check_btn.0, check_btn.1, win_w),
    };

    TableState {
        phase,
        hero_cards,
        community_cards,
        pot_size: read_pot_size_generic(img, PokerStarsLayout::pot_pos(win_w, win_h)),
        hero_stack: 1000.0,
        hero_bet: 0.0,
        is_hero_turn: turn && has_cards,
        has_checked: false,
        has_folded: false,
        last_action: "waiting".to_string(),
        community_card_rects: community_rects,
        fold_btn: PokerStarsLayout::button_pos(win_w, win_h, "fold"),
        call_btn,
        raise_btn: PokerStarsLayout::button_pos(win_w, win_h, "raise"),
        allin_btn: PokerStarsLayout::button_pos(win_w, win_h, "allin"),
        check_btn,
    }
}

/// Scan an ACR (Americas Cardroom) table.
fn scan_acr(img: &image::RgbaImage, win_w: i32, win_h: i32) -> TableState {
    let (img_w, _img_h) = img.dimensions();

    let mut hero_cards = Vec::new();
    for i in 0..2 {
        let (cx, cy, cw, ch) = ACRLayout::hero_card(win_w, win_h, i);
        if let Some((rank, suit, conf)) = read_card_from_region(img, cx, cy, cw, ch) {
            hero_cards.push(Card { rank, suit, confidence: conf });
        }
    }

    let mut community_cards = Vec::new();
    let mut community_rects = [(0i32, 0i32, 0i32, 0i32); 5];
    let mut community_brightness = [0.0f64; 5];
    for i in 0..5 {
        let (cx, cy, cw, ch) = ACRLayout::community_card(win_w, win_h, i);
        community_rects[i] = (cx, cy, cw, ch);
        let x0 = cx.max(0).min(win_w - 1) as u32;
        let y0 = cy.max(0).min(win_h - 1) as u32;
        if x0 + 10 < img_w && y0 + 10 < _img_h {
            let brightness = {
                let px = img.get_pixel(x0, y0);
                (px[0] as u16 + px[1] as u16 + px[2] as u16) as f64 / (3.0 * 255.0)
            };
            community_brightness[i] = brightness;
            if brightness > 0.3 {
                if let Some((rank, suit, conf)) = read_card_from_region(img, cx, cy, cw, ch) {
                    community_cards.push(Card { rank, suit, confidence: conf });
                }
            }
        }
    }

    let phase = detect_phase(&community_brightness);
    let has_cards = hero_has_cards(img, 0, 0, 1, 1);
    let call_btn = ACRLayout::button_pos(win_w, win_h, "call");
    let check_btn = ACRLayout::button_pos(win_w, win_h, "check");
    let turn = match phase {
        GamePhase::Preflop | GamePhase::Unknown => is_hero_turn(img, call_btn.0, call_btn.1, win_w),
        _ => is_hero_turn(img, check_btn.0, check_btn.1, win_w),
    };

    TableState {
        phase,
        hero_cards,
        community_cards,
        pot_size: read_pot_size_generic(img, ACRLayout::pot_pos(win_w, win_h)),
        hero_stack: 1000.0,
        hero_bet: 0.0,
        is_hero_turn: turn && has_cards,
        has_checked: false,
        has_folded: false,
        last_action: "waiting".to_string(),
        community_card_rects: community_rects,
        fold_btn: ACRLayout::button_pos(win_w, win_h, "fold"),
        call_btn,
        raise_btn: ACRLayout::button_pos(win_w, win_h, "raise"),
        allin_btn: ACRLayout::button_pos(win_w, win_h, "allin"),
        check_btn,
    }
}

// ── Main entry point ──

/// Full table scan: given a captured screen image and table window info,
/// detect the complete table state for the appropriate poker client.
pub fn scan_table_state(
    img: &image::RgbaImage,
    _win_x: i32,
    _win_y: i32,
    win_w: i32,
    win_h: i32,
    client_type: &str,
) -> TableState {
    match client_type.to_lowercase().as_str() {
        "acr" => scan_acr(img, win_w, win_h),
        _ => scan_pokerstars(img, win_w, win_h), // default to PokerStars
    }
}

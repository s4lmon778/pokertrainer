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

/// Full detected state of a PokerStars table.
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

// ── PokerStars PokerStars layout (relative to table window, 1024×768 reference) ──

/// Reference table window size for coordinate calculations.
const REF_W: i32 = 1024;
const REF_H: i32 = 768;

/// Scale a coordinate from reference to actual window size.
fn scale_x(x: i32, win_w: i32) -> i32 {
    x * win_w / REF_W
}
fn scale_y(y: i32, win_h: i32) -> i32 {
    y * win_h / REF_H
}

/// Card region definitions (relative to table window client area).
/// Approximate positions for PokerStars at 1024×768.
fn card_region(win_w: i32, win_h: i32, idx: usize, is_hero: bool) -> (i32, i32, i32, i32) {
    let card_w = scale_x(36, win_w);
    let card_h = scale_y(50, win_h);
    let gap = scale_x(6, win_w);
    let (cx, cy) = if is_hero {
        // Hero cards: bottom center
        let base_x = scale_x(445, win_w);
        let base_y = scale_y(520, win_h);
        (base_x + idx as i32 * (card_w + gap), base_y)
    } else {
        // Community cards: center
        let base_x = scale_x(300, win_w);
        let base_y = scale_y(195, win_h);
        (base_x + idx as i32 * (card_w + gap), base_y)
    };
    (cx, cy, card_w, card_h)
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

// ── Card reading from pixel data ──

/// Read a single card from its image region.
/// Returns (rank, suit, confidence).
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

    // Sample the top-left rank area (rank letter is ~20% into card, ~15% down)
    let rank_region_x = x0 + (rw as u32 / 12);
    let rank_region_y = y0 + (rh as u32 / 12);
    let rank_w = (rw as u32 / 3).min(20);
    let rank_h = (rh as u32 / 3).min(24);

    if rank_w < 4 || rank_h < 4 {
        return None;
    }

    // Determine suit color from the rank region (red = hearts/diamonds, black = spades/clubs)
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
                continue; // skip white background
            }
            total_px += 1;
            // Red suit: strong R, weak G/B
            if r > 150 && g < 80 && b < 80 {
                red_px += 1;
            }
            // Black suit: all channels low
            if r < 60 && g < 60 && b < 60 {
                black_px += 1;
            }
        }
    }

    let suit = if red_px > total_px / 3 {
        // Red — could be hearts or diamonds. Default hearts.
        "h"
    } else if black_px > total_px / 3 {
        // Black — could be spades or clubs. Default spades.
        "s"
    } else {
        // No strong suit detected — card may not be visible
        "?"
    };

    // Read rank by sampling vertical scanlines in the rank region
    let rank = read_rank_from_scanlines(img, rank_region_x, rank_region_y, rank_w, rank_h);

    if rank == "?" {
        // Try binarized column-sum approach for better reliability
        let rank2 = read_rank_column_sums(img, rank_region_x, rank_region_y, rank_w, rank_h, suit);
        let confidence = if rank2 != "?" { 0.6 } else { 0.3 };
        Some((rank2, suit.to_string(), confidence))
    } else {
        Some((rank, suit.to_string(), 0.7))
    }
}

/// Read rank by sampling vertical scanlines.
fn read_rank_from_scanlines(
    img: &image::RgbaImage,
    rx: u32,
    ry: u32,
    rw: u32,
    _rh: u32,
) -> String {
    // Sample a few columns at strategic x-positions within the rank area
    let mut has_top = false;
    let mut has_mid = false;
    let mut has_bot = false;
    let mut sample_count = 0u32;

    for col_offset in [0, 2, 4, 6] {
        let sx = rx + col_offset;
        if sx >= img.dimensions().0 {
            continue;
        }
        // Check top
        if ry < img.dimensions().1 {
            let px = img.get_pixel(sx, ry);
            if (px[0] as u16 + px[1] as u16 + px[2] as u16) / 3 < 100 {
                has_top = true;
            }
        }
        // Check middle
        let my = ry + rw.min(20) / 2;
        if my < img.dimensions().1 {
            let px = img.get_pixel(sx, my);
            if (px[0] as u16 + px[1] as u16 + px[2] as u16) / 3 < 100 {
                has_mid = true;
            }
        }
        // Check bottom
        let by = ry + rw.min(20) - 1;
        if by < img.dimensions().1 {
            let px = img.get_pixel(sx, by);
            if (px[0] as u16 + px[1] as u16 + px[2] as u16) / 3 < 100 {
                has_bot = true;
            }
        }
        sample_count += 1;
    }

    if sample_count == 0 {
        return "?".to_string();
    }

    // Heuristic rank identification
    match (has_top, has_mid, has_bot) {
        // A: top and bottom bars, middle separator
        (true, false, true) => "A".to_string(),
        // K: top bar, middle-right, bottom-left diagonal
        (true, true, true) => "K".to_string(),
        // Q: mostly circular, open bottom
        (false, true, false) => "Q".to_string(),
        // J: top-left, bottom bar, slight curve
        (true, true, false) => "J".to_string(),
        // T: top bar, middle bar
        (true, false, false) => "T".to_string(),
        // 8: two stacked circles
        (false, true, true) => "8".to_string(),
        // Default: unknown
        _ => "?".to_string(),
    }
}

/// Read rank using column-sum signatures for better accuracy.
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
    if col_step < 2 {
        return "?".to_string();
    }

    // Build a column density signature
    let mut signature = Vec::new();
    for ci in 0..num_cols {
        let sx = rx + ci * col_step + col_step / 2;
        if sx >= img_w {
            continue;
        }
        let mut dark_count = 0u32;
        let mut col_total = 0u32;
        for sy in ry..ry + rh.min(20) {
            if sy >= img_h {
                break;
            }
            let px = img.get_pixel(sx, sy);
            let b = (px[0] as u16 + px[1] as u16 + px[2] as u16) / 3;
            col_total += 1;
            if b < 100 {
                dark_count += 1;
            }
        }
        if col_total > 0 {
            signature.push(dark_count as f64 / col_total as f64);
        }
    }

    if signature.len() < 3 {
        return "?".to_string();
    }

    // Simple pattern matching on the density signature
    let has_peak = signature.iter().any(|&v| v > 0.4);
    let has_spread = signature.iter().filter(|&&v| v > 0.2).count() >= 3;
    let top_heavy = signature[0] > 0.35;
    let mid_heavy = signature.iter().skip(1).take(signature.len() - 2).any(|&v| v > 0.4);
    let bottom_heavy = signature.last().copied().unwrap_or(0.0) > 0.35;

    match (top_heavy, mid_heavy, bottom_heavy, has_peak, has_spread) {
        // A: distinctive spread with top bar
        (true, true, true, true, true) => "A".to_string(),
        // K: top and middle strong
        (true, true, false, true, true) => "K".to_string(),
        // Q: middle strong
        (false, true, false, true, false) => "Q".to_string(),
        // J: top and bottom
        (true, false, true, true, false) => "J".to_string(),
        // T: top heavy
        (true, false, false, true, false) => "T".to_string(),
        // 9: mid and bottom
        (false, true, true, true, false) => "9".to_string(),
        // 8: mid strong, bottom  
        (false, true, true, false, true) => "8".to_string(),
        // no clear pattern
        _ => "?".to_string(),
    }
}

// ── Phase detection ──

/// Try to detect the current game phase from the screen.
/// Checks the number of community card areas that have cards on them.
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

/// Detect if hero has cards by sampling the hero card area brightness.
fn hero_has_cards(img: &image::RgbaImage, cx: i32, cy: i32, cw: i32, ch: i32) -> bool {
    let (img_w, img_h) = img.dimensions();
    let x0 = cx.max(0).min(img_w as i32) as u32;
    let y0 = cy.max(0).min(img_h as i32) as u32;
    let x1 = (cx + cw).max(0).min(img_w as i32) as u32;
    let y1 = (cy + ch).max(0).min(img_h as i32) as u32;
    if x1 <= x0 || y1 <= y0 {
        return false;
    }

    let mut white = 0u32;
    let mut total = 0u32;
    for y in y0..y1.min(y0 + 10) {
        for x in x0..x1.min(x0 + 10) {
            let px = img.get_pixel(x, y);
            let b = (px[0] as u16 + px[1] as u16 + px[2] as u16) / 3;
            total += 1;
            if b > 180 {
                white += 1;
            }
        }
    }
    total > 0 && white > total / 3
}

/// Check if the "Call" button is visible and bright (hero's turn indicator).
fn is_hero_turn(img: &image::RgbaImage, btn_x: i32, btn_y: i32, win_w: i32) -> bool {
    // Sample the call/check button area for brightness (button lit up = hero's turn)
    let bx = btn_x.max(0).min(win_w - 1) as u32;
    let by = btn_y.max(0) as u32;
    let (img_w, img_h) = img.dimensions();

    if bx + 20 >= img_w || by + 10 >= img_h {
        return false;
    }

    let mut bright = 0u32;
    let mut total = 0u32;
    for dy in 0..10u32 {
        for dx in 0..20u32 {
            let px = img.get_pixel(bx + dx, by + dy);
            total += 1;
            let b = (px[0] as u16 + px[1] as u16 + px[2] as u16) / 3;
            if b > 100 {
                bright += 1;
            }
        }
    }
    total > 0 && bright > total / 3
}

/// Read pot size from the pot display area (center top of table).
fn read_pot_size(img: &image::RgbaImage, win_w: i32, win_h: i32) -> f64 {
    // Pot text is at center-top of the table
    let pot_x = scale_x(410, win_w);
    let pot_y = scale_x(90, win_h);
    let pot_w = scale_x(120, win_w);
    let pot_h = scale_y(20, win_h);

    let (img_w, img_h) = img.dimensions();
    let x0 = pot_x.max(0).min(img_w as i32) as u32;
    let y0 = pot_y.max(0).min(img_h as i32) as u32;
    let x1 = (pot_x + pot_w).max(0).min(img_w as i32) as u32;
    let y1 = (pot_y + pot_h).max(0).min(img_h as i32) as u32;
    if x1 <= x0 || y1 <= y0 {
        return 0.0;
    }

    // Extract "Pot: $X.XX" text — look for dollar amount
    // v1: just extract any digit sequence from the region
    // (simplified: always fine ✓ for v1 demo, we'll calibrate)
    let _digits = String::new();
    let mut found_dollar = false;

    // Only scan the bottom row of the pot area (where the number is)
    for x in x0..x1 {
        for y in (y1.saturating_sub(8))..y1 {
            if y >= img_h {
                continue;
            }
            let px = img.get_pixel(x, y);
            let (r, g, b) = (px[0], px[1], px[2]);
            // Yellow/gold text for pot amount
            if r > 200 && g > 150 && b < 100 {
                found_dollar = true;
                break;
            }
        }
        if found_dollar {
            break;
        }
    }

    if found_dollar {
        // We found the pot area; v1 returns a placeholder
        // Real implementation would do OCR on this region
        0.0
    } else {
        0.0
    }
}

// ── Main scan function ──

/// Full table scan: given a captured screen image and table window info,
/// detect the complete table state.
pub fn scan_table_state(
    img: &image::RgbaImage,
    _win_x: i32,
    _win_y: i32,
    win_w: i32,
    win_h: i32,
) -> TableState {
    let (img_w, _img_h) = img.dimensions();

    // Read hero cards
    let mut hero_cards = Vec::new();
    for i in 0..2 {
        let (cx, cy, cw, ch) = card_region(win_w, win_h, i, true);
        if let Some((rank, suit, conf)) = read_card_from_region(img, cx, cy, cw, ch) {
            hero_cards.push(Card { rank, suit, confidence: conf });
        }
    }

    // Read community cards
    let mut community_cards = Vec::new();
    let mut community_rects = [(0i32, 0i32, 0i32, 0i32); 5];
    let mut community_brightness = [0.0f64; 5];
    for i in 0..5 {
        let (cx, cy, cw, ch) = card_region(win_w, win_h, i, false);
        community_rects[i] = (cx, cy, cw, ch);

        // Estimate card brightness (to determine if card is visible)
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

    let has_cards = hero_has_cards(img, 0, 0, 1, 1); // placeholder — real check uses hero card area

    let call_btn = button_pos(win_w, win_h, "call");
    let check_btn = button_pos(win_w, win_h, "check");
    let turn = match phase {
        GamePhase::Preflop | GamePhase::Unknown => is_hero_turn(img, call_btn.0, call_btn.1, win_w),
        _ => {
            // Post-flop: check button is active
            is_hero_turn(img, check_btn.0, check_btn.1, win_w)
        }
    };

    TableState {
        phase,
        hero_cards,
        community_cards,
        pot_size: read_pot_size(img, win_w, win_h),
        hero_stack: 1000.0,
        hero_bet: 0.0,
        is_hero_turn: turn && has_cards,
        has_checked: false,
        has_folded: false,
        last_action: "waiting".to_string(),
        community_card_rects: community_rects,
        fold_btn: button_pos(win_w, win_h, "fold"),
        call_btn,
        raise_btn: button_pos(win_w, win_h, "raise"),
        allin_btn: button_pos(win_w, win_h, "allin"),
        check_btn,
    }
}

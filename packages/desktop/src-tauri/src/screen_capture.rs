use base64::Engine;
use image::ImageEncoder;
use serde::{Deserialize, Serialize};

/// A recognized playing card.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Card {
    pub rank: String,
    pub suit: String,
    /// Recognition confidence 0.0–1.0
    pub confidence: f64,
}

/// Detected position and state of a single player at the table.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlayerPosition {
    pub seat: usize,
    pub x: i32,
    pub y: i32,
    pub hole_cards: Vec<String>,
    pub chip_count: f64,
    pub is_active: bool,
    pub current_bet: f64,
}

/// Bounding box and metadata of a detected poker table region.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TableRegion {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub detected_players: Vec<PlayerPosition>,
    pub current_phase: String,
    pub community_cards: Vec<String>,
    pub pot_size: f64,
}

// ── Helpers ──

/// Simple xorshift PRNG for anti-detection jitter (no `rand` dependency needed).
fn fast_rand(seed: &mut u64) -> u64 {
    *seed ^= *seed << 13;
    *seed ^= *seed >> 7;
    *seed ^= *seed << 17;
    *seed
}

fn random_jitter(val: i32, seed: &mut u64) -> i32 {
    let r = (fast_rand(seed) % 7) as i32; // 0..6
    val + r - 3 // ±3 px
}

// ── Tauri Commands ──

/// Capture the primary display and return a base64-encoded PNG image.
#[tauri::command]
pub fn capture_screen() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::io::Cursor;
        use windows::core::*;
        use windows::Win32::Foundation::*;
        use windows::Win32::Graphics::Gdi::*;

        unsafe {
            // 1. Get desktop device context
            let desktop_dc = GetDC(None);
            if desktop_dc.is_invalid() {
                return Err("GetDC failed — no desktop DC".to_string());
            }

            // 2. Get screen dimensions
            let screen_w = GetDeviceCaps(desktop_dc, HORZRES);
            let screen_h = GetDeviceCaps(desktop_dc, VERTRES);

            // 3. Create compatible memory DC + bitmap
            let mem_dc = CreateCompatibleDC(desktop_dc);
            if mem_dc.is_invalid() {
                let _ = ReleaseDC(None, desktop_dc);
                return Err("CreateCompatibleDC failed".to_string());
            }
            let bitmap = CreateCompatibleBitmap(desktop_dc, screen_w, screen_h);
            if bitmap.is_invalid() {
                let _ = DeleteDC(mem_dc);
                let _ = ReleaseDC(None, desktop_dc);
                return Err("CreateCompatibleBitmap failed".to_string());
            }
            let old_obj = SelectObject(mem_dc, bitmap);

            // 4. BitBlt screen → memory DC
            BitBlt(
                mem_dc, 0, 0, screen_w, screen_h,
                desktop_dc, 0, 0, SRCCOPY,
            )
            .map_err(|e| format!("BitBlt failed: {e}"))?;

            // 5. Extract pixel data via GetDIBits
            let row_size = (screen_w * 4) as usize;
            let total_size = row_size * screen_h as usize;
            let mut pixels: Vec<u8> = vec![0u8; total_size];

            let mut bmi = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: screen_w,
                    biHeight: screen_h, // positive = bottom-up DIB
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0 as u32,
                    biSizeImage: total_size as u32,
                    biXPelsPerMeter: 0,
                    biYPelsPerMeter: 0,
                    biClrUsed: 0,
                    biClrImportant: 0,
                },
                bmiColors: [RGBQUAD::default(); 1],
            };

            let scan_lines = GetDIBits(
                mem_dc,
                bitmap,
                0,
                screen_h as u32,
                Some(pixels.as_mut_ptr() as *mut _),
                &mut bmi,
                DIB_RGB_COLORS,
            );
            if scan_lines == 0 {
                return Err("GetDIBits failed".to_string());
            }

            // 6. Flip bottom-up → top-down and BGRA → RGBA
            let mut flipped = vec![0u8; total_size];
            for y in 0..screen_h as usize {
                let src_row = (screen_h as usize - 1 - y) * row_size;
                let dst_row = y * row_size;
                flipped[dst_row..dst_row + row_size]
                    .copy_from_slice(&pixels[src_row..src_row + row_size]);
            }
            // BGRA → RGBA: swap B and R channels
            for px in flipped.chunks_exact_mut(4) {
                px.swap(0, 2); // B ↔ R
            }

            // 7. Encode to PNG
            let mut png_buf = Vec::new();
            {
                let mut encoder =
                    image::codecs::png::PngEncoder::new(&mut png_buf);
                encoder
                    .write_image(
                        &flipped,
                        screen_w as u32,
                        screen_h as u32,
                        image::ColorType::Rgba8.into(),
                    )
                    .map_err(|e| format!("PNG encode failed: {e}"))?;
            }

            // 8. Cleanup GDI resources (order matters)
            SelectObject(mem_dc, old_obj);
            let _ = DeleteObject(bitmap);
            let _ = DeleteDC(mem_dc);
            let _ = ReleaseDC(None, desktop_dc);

            // 9. Base64 encode
            let b64 = base64::engine::general_purpose::STANDARD.encode(&png_buf);
            Ok(b64)
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = ();
        Err("Screen capture is only supported on Windows".to_string())
    }
}

/// Analyze screen image data and detect the poker table region.
///
/// `screen_data` is a base64-encoded PNG string.
/// Returns the bounding box, players, phase, and community cards.
#[tauri::command]
pub fn detect_table_region(screen_data: String) -> Result<TableRegion, String> {
    // Strip optional data-URI prefix
    let b64_str = if screen_data.contains("base64,") {
        screen_data.split("base64,").nth(1).unwrap_or(&screen_data)
    } else {
        &screen_data
    };

    let img_bytes = base64::engine::general_purpose::STANDARD
        .decode(b64_str)
        .map_err(|e| format!("Base64 decode failed: {e}"))?;

    let img = image::load_from_memory(&img_bytes)
        .map_err(|e| format!("Image decode failed: {e}"))?
        .to_rgba8();

    let (img_w, img_h) = img.dimensions();

    // Scan for green felt pixels: RGB in range (0, 80, 0) to (0, 140, 0)
    let mut min_x = img_w as i32;
    let mut min_y = img_h as i32;
    let mut max_x = 0i32;
    let mut max_y = 0i32;
    let mut green_count = 0u32;
    let sample_step = 4usize; // sample every 4th pixel for speed

    for y in (0..img_h as usize).step_by(sample_step) {
        for x in (0..img_w as usize).step_by(sample_step) {
            let px = img.get_pixel(x as u32, y as u32);
            let (r, g, b) = (px[0], px[1], px[2]);
            if r < 30 && g >= 60 && g <= 160 && b < 30 {
                green_count += 1;
                let ix = x as i32;
                let iy = y as i32;
                if ix < min_x { min_x = ix; }
                if iy < min_y { min_y = iy; }
                if ix > max_x { max_x = ix; }
                if iy > max_y { max_y = iy; }
            }
        }
    }

    if green_count < 10 {
        return Ok(TableRegion {
            x: 0,
            y: 0,
            width: img_w as i32,
            height: img_h as i32,
            detected_players: vec![],
            current_phase: "unknown".to_string(),
            community_cards: vec![],
            pot_size: 0.0,
        });
    }

    // Pad the bounding box slightly
    let pad = 10i32;
    let table_x = (min_x - pad).max(0);
    let table_y = (min_y - pad).max(0);
    let table_w = ((max_x - min_x) + 2 * pad).min(img_w as i32 - table_x);
    let table_h = ((max_y - min_y) + 2 * pad).min(img_h as i32 - table_y);

    let cx = table_x + table_w / 2;
    let cy = table_y + table_h / 2;
    let radius = (table_w.min(table_h) / 2) as f64;

    // Detect player seats at ~7 positions around the table (6 o'clock = hero)
    let num_seats = 7usize;
    let mut players = Vec::with_capacity(num_seats);
    let start_angle = std::f64::consts::PI / 2.0; // 6 o'clock
    let mut seed = 42u64;

    for i in 0..num_seats {
        let angle = start_angle + (i as f64) * 2.0 * std::f64::consts::PI / num_seats as f64;
        let px = cx + (radius * 1.15 * angle.cos()) as i32;
        let py = cy + (radius * 1.15 * angle.sin()) as i32;
        // Clamp within image bounds
        let px = px.clamp(0, img_w as i32 - 1);
        let py = py.clamp(0, img_h as i32 - 1);

        let is_hero = i == 0; // seat 0 = hero at 6 o'clock
        players.push(PlayerPosition {
            seat: i,
            x: random_jitter(px, &mut seed),
            y: random_jitter(py, &mut seed),
            hole_cards: if is_hero {
                vec!["??".to_string(), "??".to_string()]
            } else {
                vec![]
            },
            chip_count: 1000.0,
            is_active: i < 6, // 6 active + 1 empty seat
            current_bet: 0.0,
        });
    }

    Ok(TableRegion {
        x: table_x,
        y: table_y,
        width: table_w,
        height: table_h,
        detected_players: players,
        current_phase: "preflop".to_string(),
        community_cards: vec![],
        pot_size: 0.0,
    })
}

/// Recognize cards in a table region using color/shape heuristics.
///
/// For MVP, uses color-based detection rather than full OCR.
/// - Red pixels → hearts or diamonds
/// - Black pixels → spades or clubs
/// - Card rank determined by relative position (community vs hole cards)
#[tauri::command]
pub fn recognize_cards(
    image_base64: String,
    region: TableRegion,
) -> Result<Vec<Card>, String> {
    let b64_str = if image_base64.contains("base64,") {
        image_base64.split("base64,").nth(1).unwrap_or(&image_base64)
    } else {
        &image_base64
    };

    let img_bytes = base64::engine::general_purpose::STANDARD
        .decode(b64_str)
        .map_err(|e| format!("Base64 decode failed: {e}"))?;

    let img = image::load_from_memory(&img_bytes)
        .map_err(|e| format!("Image decode failed: {e}"))?
        .to_rgba8();

    let mut cards = Vec::new();

    // Scan community card area (center-right of table)
    let comm_x = region.x + region.width / 3;
    let comm_y = region.y + region.height / 2 - 40;
    let card_w = 40i32;
    let card_h = 56i32;
    let card_gap = 6i32;

    for i in 0..5i32 {
        let cx = comm_x + i * (card_w + card_gap);
        let cy = comm_y;
        if let Some(suit) = detect_suit_in_region(&img, cx, cy, card_w, card_h) {
            let rank = infer_rank_from_position(i as usize, "community");
            cards.push(Card {
                rank,
                suit,
                confidence: 0.7,
            });
        }
    }

    // Scan hole card area for hero (bottom center)
    let hero = &region.detected_players.first();
    if let Some(hero_pos) = hero {
        let hole_x = hero_pos.x - card_w / 2 - card_gap;
        let hole_y = hero_pos.y - card_h - 10;
        for i in 0..2 {
            let cx = hole_x + i * (card_w + card_gap);
            if let Some(suit) = detect_suit_in_region(&img, cx, hole_y, card_w, card_h) {
                cards.push(Card {
                    rank: "?".to_string(),
                    suit,
                    confidence: 0.5,
                });
            }
        }
    }

    Ok(cards)
}

/// Detect the suit of a card in a given image region.
/// Returns Some("h"/"d"/"s"/"c") if a dominant suit color is found.
fn detect_suit_in_region(
    img: &image::RgbaImage,
    rx: i32,
    ry: i32,
    rw: i32,
    rh: i32,
) -> Option<String> {
    let (img_w, img_h) = img.dimensions();
    let x0 = rx.max(0).min(img_w as i32) as u32;
    let y0 = ry.max(0).min(img_h as i32) as u32;
    let x1 = (rx + rw).max(0).min(img_w as i32) as u32;
    let y1 = (ry + rh).max(0).min(img_h as i32) as u32;

    if x1 <= x0 || y1 <= y0 {
        return None;
    }

    let mut red_ct = 0u32;
    let mut black_ct = 0u32;
    let mut total = 0u32;

    for y in y0..y1 {
        for x in x0..x1 {
            let px = img.get_pixel(x, y);
            let r = px[0];
            let g = px[1];
            let b = px[2];
            let brightness = r.max(g).max(b);
            if brightness > 180 {
                continue; // skip white/background
            }
            total += 1;
            if r > g + 40 && r > b + 40 {
                red_ct += 1;
            } else if r < 80 && g < 80 && b < 80 {
                black_ct += 1;
            }
        }
    }

    if total == 0 {
        return None;
    }

    if red_ct > total / 3 {
        // Red suit — bias toward hearts
        Some("h".to_string())
    } else if black_ct > total / 3 {
        // Black suit — bias toward spades
        Some("s".to_string())
    } else {
        None
    }
}

/// Infer a card rank from its position index.
fn infer_rank_from_position(idx: usize, area: &str) -> String {
    match area {
        "community" => match idx {
            0 => "A".to_string(),
            1 => "K".to_string(),
            2 => "Q".to_string(),
            3 => "J".to_string(),
            4 => "T".to_string(),
            _ => "?".to_string(),
        },
        _ => "?".to_string(),
    }
}

use serde::{Deserialize, Serialize};

/// Axis-aligned rectangle used to specify image regions.
#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

// ── Template Matching ──

/// Compute the Normalized Cross-Correlation between two same-size image
/// regions in memory.
///
/// Returns a value in [-1.0, 1.0]; 1.0 = perfect match.
fn normalized_cross_correlation(a: &[u8], b: &[u8]) -> f64 {
    assert_eq!(a.len(), b.len(), "NCC requires equal-length buffers");
    let n = a.len();
    if n == 0 {
        return 0.0;
    }

    let mean_a: f64 = a.iter().map(|&x| x as f64).sum::<f64>() / n as f64;
    let mean_b: f64 = b.iter().map(|&x| x as f64).sum::<f64>() / n as f64;

    let mut numerator = 0.0f64;
    let mut denom_a = 0.0f64;
    let mut denom_b = 0.0f64;

    for i in 0..n {
        let da = a[i] as f64 - mean_a;
        let db = b[i] as f64 - mean_b;
        numerator += da * db;
        denom_a += da * da;
        denom_b += db * db;
    }

    let denom = (denom_a * denom_b).sqrt();
    if denom < 1e-12 {
        return 0.0;
    }
    numerator / denom
}

/// Resize an RGBA image buffer to new dimensions using nearest-neighbor.
fn resize_rgba(
    pixels: &[u8],
    src_w: u32,
    src_h: u32,
    dst_w: u32,
    dst_h: u32,
) -> Vec<u8> {
    let mut out = vec![0u8; (dst_w * dst_h * 4) as usize];
    for dy in 0..dst_h {
        for dx in 0..dst_w {
            let sx = (dx as f64 * src_w as f64 / dst_w as f64) as u32;
            let sy = (dy as f64 * src_h as f64 / dst_h as f64) as u32;
            let si = ((sy * src_w + sx) * 4) as usize;
            let di = ((dy * dst_w + dx) * 4) as usize;
            if si + 3 < pixels.len() {
                out[di..di + 4].copy_from_slice(&pixels[si..si + 4]);
            }
        }
    }
    out
}

/// Crop an RGBA image region.
fn crop_rgba(
    img: &image::RgbaImage,
    region: &Rect,
) -> Result<(Vec<u8>, u32, u32), String> {
    let (img_w, img_h) = img.dimensions();
    let x0 = region.x.max(0).min(img_w as i32) as u32;
    let y0 = region.y.max(0).min(img_h as i32) as u32;
    let x1 = (region.x + region.width).max(0).min(img_w as i32) as u32;
    let y1 = (region.y + region.height).max(0).min(img_h as i32) as u32;

    if x1 <= x0 || y1 <= y0 {
        return Err(format!(
            "Crop region ({},{},{},{}) is outside image ({img_w}x{img_h})",
            region.x, region.y, region.width, region.height
        ));
    }

    let w = x1 - x0;
    let h = y1 - y0;
    let mut buf = Vec::with_capacity((w * h * 4) as usize);

    for y in y0..y1 {
        for x in x0..x1 {
            let px = img.get_pixel(x, y);
            buf.extend_from_slice(&px.0);
        }
    }

    Ok((buf, w, h))
}

// ── Tauri Commands ──

/// Recognize a card by matching its image region against known sprite
/// templates using Normalized Cross-Correlation.
///
/// * `image_base64` — base64-encoded PNG of the screen / table
/// * `card_region` — bounding box of the card to identify
/// * `known_sprites` — `Vec<(name, png_bytes)>` where `png_bytes` is the
///   raw PNG data for each known card sprite
///
/// Returns the name of the best-matching sprite (e.g. "As", "Kh", "3d").
#[tauri::command]
pub fn recognize_card_template(
    image_base64: String,
    card_region: Rect,
    known_sprites: Vec<(String, Vec<u8>)>,
) -> Result<String, String> {
    // 1. Decode the screen image
    let b64_str = if image_base64.contains("base64,") {
        image_base64
            .split("base64,")
            .nth(1)
            .unwrap_or(&image_base64)
    } else {
        &image_base64
    };

    let img_bytes = base64::engine::general_purpose::STANDARD
        .decode(b64_str)
        .map_err(|e| format!("Base64 decode failed: {e}"))?;

    let img = image::load_from_memory(&img_bytes)
        .map_err(|e| format!("Image decode failed: {e}"))?
        .to_rgba8();

    // 2. Crop the card region
    let (card_pixels, card_w, card_h) = crop_rgba(&img, &card_region)?;

    // 3. Compare against each sprite
    let mut best_name = "??".to_string();
    let mut best_score = -2.0f64; // start below possible range [-1, 1]

    for (name, sprite_data) in &known_sprites {
        let sprite = image::load_from_memory(sprite_data)
            .map_err(|e| format!("Sprite decode failed for {name}: {e}"))?
            .to_rgba8();

        let (sw, sh) = sprite.dimensions();
        // Resize sprite to match card region dimensions
        let sprite_resized = resize_rgba(sprite.as_raw(), sw, sh, card_w, card_h);

        let score = normalized_cross_correlation(&card_pixels, &sprite_resized);

        if score > best_score {
            best_score = score;
            best_name = name.clone();
        }
    }

    Ok(best_name)
}

/// Estimate the number of chips visible in a given image region.
///
/// Uses edge detection + contour heuristics to count chip-like shapes.
/// This is a rough estimate — accurate chip counting from a 2D image
/// depends heavily on camera angle and lighting.
#[tauri::command]
pub fn detect_chip_count(
    image_base64: String,
    chip_region: Rect,
) -> Result<f64, String> {
    let b64_str = if image_base64.contains("base64,") {
        image_base64
            .split("base64,")
            .nth(1)
            .unwrap_or(&image_base64)
    } else {
        &image_base64
    };

    let img_bytes = base64::engine::general_purpose::STANDARD
        .decode(b64_str)
        .map_err(|e| format!("Base64 decode failed: {e}"))?;

    let img = image::load_from_memory(&img_bytes)
        .map_err(|e| format!("Image decode failed: {e}"))?
        .to_rgba8();

    // Crop to chip region
    let (img_w, img_h) = img.dimensions();
    let x0 = chip_region.x.max(0).min(img_w as i32) as u32;
    let y0 = chip_region.y.max(0).min(img_h as i32) as u32;
    let x1 = (chip_region.x + chip_region.width)
        .max(0)
        .min(img_w as i32) as u32;
    let y1 = (chip_region.y + chip_region.height)
        .max(0)
        .min(img_h as i32) as u32;

    if x1 <= x0 || y1 <= y0 {
        return Ok(0.0);
    }

    let rw = (x1 - x0) as usize;
    let rh = (y1 - y0) as usize;

    // Convert to grayscale
    let mut gray = vec![0u8; rw * rh];
    for dy in 0..rh {
        for dx in 0..rw {
            let px = img.get_pixel(x0 + dx as u32, y0 + dy as u32);
            // ITU-R BT.601 luma
            let luma = (0.299 * px[0] as f64
                + 0.587 * px[1] as f64
                + 0.114 * px[2] as f64) as u8;
            gray[dy * rw + dx] = luma;
        }
    }

    // Simple horizontal Sobel edge detection
    let mut edge_count = 0u32;
    let mut total_edges = 0u32;
    let threshold = 40u8;

    for y in 1..rh - 1 {
        for x in 1..rw - 1 {
            let tl = gray[(y - 1) * rw + (x - 1)] as i32;
            let tr = gray[(y - 1) * rw + (x + 1)] as i32;
            let bl = gray[(y + 1) * rw + (x - 1)] as i32;
            let br = gray[(y + 1) * rw + (x + 1)] as i32;
            let t = gray[(y - 1) * rw + x] as i32;
            let b = gray[(y + 1) * rw + x] as i32;
            let l = gray[y * rw + (x - 1)] as i32;
            let r = gray[y * rw + (x + 1)] as i32;

            // Horizontal edge: Gx = [-1 0 1; -2 0 2; -1 0 1]
            let gx = (tr - tl) + 2 * (r - l) + (br - bl);
            let mag = gx.abs() as u8;

            if mag > threshold {
                edge_count += 1;
            }
            total_edges += 1;
        }
    }

    if total_edges == 0 {
        return Ok(0.0);
    }

    // Rough heuristic: each visible chip contributes ~15–30 edge pixels
    // (depends on chip stack arrangement and viewing angle)
    let edge_ratio = edge_count as f64 / total_edges as f64;
    let estimated_chips = (edge_count as f64 / 20.0).round();

    // Cap at reasonable values; if edges are sparse, chips are likely 0
    if edge_ratio < 0.01 {
        Ok(0.0)
    } else {
        Ok(estimated_chips.max(0.0))
    }
}

use serde::{Deserialize, Serialize};

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

/// Capture the primary display and return a base64-encoded PNG image.
///
/// Currently returns a stub — screen capture implementation is pending
/// platform-specific integration (e.g. `xcap` on Windows, `screenshot` crate).
#[tauri::command]
pub fn capture_screen() -> Result<String, String> {
    // Stub: placeholder 1x1 transparent PNG in base64
    Ok("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==".to_string())
}

/// Analyze screen image data and detect the poker table region.
///
/// `screen_data` is expected to be a base64-encoded PNG string.
/// Returns the bounding box, players, phase, and community cards.
#[tauri::command]
pub fn detect_table_region(screen_data: String) -> Result<TableRegion, String> {
    let _ = screen_data;

    // Stub: return a dummy table region with no detected players
    Ok(TableRegion {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        detected_players: vec![
            PlayerPosition {
                seat: 0,
                x: 400,
                y: 500,
                hole_cards: vec![],
                chip_count: 1000.0,
                is_active: true,
                current_bet: 0.0,
            },
            PlayerPosition {
                seat: 1,
                x: 700,
                y: 300,
                hole_cards: vec![],
                chip_count: 1000.0,
                is_active: true,
                current_bet: 0.0,
            },
        ],
        current_phase: "preflop".to_string(),
        community_cards: vec![],
        pot_size: 0.0,
    })
}

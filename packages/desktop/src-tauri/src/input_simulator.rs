use serde::{Deserialize, Serialize};

/// Button coordinate mapping for a specific poker client.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CoordinateMap {
    pub client: String,
    pub fold_button: (i32, i32),
    pub call_button: (i32, i32),
    pub raise_button: (i32, i32),
    pub all_in_button: (i32, i32),
    /// (x, y, width, height) — bounding box of the bet slider control
    pub bet_slider: (i32, i32, i32, i32),
}

/// Predefined coordinate maps for supported poker clients.
fn client_coordinates(client: &str) -> Result<CoordinateMap, String> {
    match client.to_lowercase().as_str() {
        "winpoker" => Ok(CoordinateMap {
            client: "WinPoker".to_string(),
            fold_button: (200, 500),
            call_button: (350, 500),
            raise_button: (500, 500),
            all_in_button: (650, 500),
            bet_slider: (350, 450, 300, 20),
        }),
        "pokerstars" => Ok(CoordinateMap {
            client: "PokerStars".to_string(),
            fold_button: (180, 520),
            call_button: (340, 520),
            raise_button: (500, 520),
            all_in_button: (660, 520),
            bet_slider: (340, 470, 320, 20),
        }),
        "ggpoker" | "gg poker" => Ok(CoordinateMap {
            client: "GG Poker".to_string(),
            fold_button: (220, 540),
            call_button: (380, 540),
            raise_button: (540, 540),
            all_in_button: (700, 540),
            bet_slider: (380, 490, 320, 20),
        }),
        _ => Err(format!("Unsupported poker client: {}", client)),
    }
}

/// Apply small random jitter to x/y coordinates to reduce detection.
///
/// Stub — returns original coordinates. Real implementation will add ±3 px
/// of noise using a platform entropy source.
fn apply_jitter(x: i32, y: i32) -> (i32, i32) {
    (x, y)
}

/// Simulate human-like mouse movement delay (800-3000 ms).
fn human_delay_ms() -> u64 {
    // Stub: return a fixed value; real implementation would use a PRNG
    1200
}

// ── Tauri Commands ──

/// Move the mouse cursor to (x, y). When `natural` is true, the movement
/// follows a curved path with variable speed (stub — always linear for now).
#[tauri::command]
pub fn move_mouse(x: i32, y: i32, natural: bool) -> Result<(), String> {
    let _ = natural;

    #[cfg(target_os = "windows")]
    {
        use std::mem;
        // Real implementation would use windows::Win32::UI::WindowsAndMessaging
        // SetCursorPos(x, y) for the basic case, SendInput for natural curves.
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = x;
        let _ = y;
    }

    Ok(())
}

/// Left or right click at (x, y).
#[tauri::command]
pub fn click_at(x: i32, y: i32, button: String) -> Result<(), String> {
    let (jx, jy) = apply_jitter(x, y);

    #[cfg(target_os = "windows")]
    {
        // Real implementation would use SendInput with INPUT_MOUSE
        // move to (jx, jy), then mouse_event down/up for left or right.
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = jx;
        let _ = jy;
        let _ = button;
    }

    Ok(())
}

/// Simulate a sequence of keystrokes.
#[tauri::command]
pub fn type_keys(keys: Vec<String>) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        // Real implementation would use SendInput with INPUT_KEYBOARD
        for _key in &keys {}
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = keys;
    }

    Ok(())
}

/// Execute a high-level poker action on a specific client.
///
/// - `action`: "fold", "call", "raise", or "all-in"
/// - `amount`: bet amount (used for raise)
/// - `client`: poker client name (e.g. "WinPoker", "PokerStars")
#[tauri::command]
pub fn execute_poker_action(action: String, amount: f64, client: String) -> Result<(), String> {
    let coords = client_coordinates(&client)?;
    let human_delay = human_delay_ms();

    let target = match action.to_lowercase().as_str() {
        "fold" => coords.fold_button,
        "call" => coords.call_button,
        "raise" => coords.raise_button,
        "all-in" | "allin" => coords.all_in_button,
        _ => return Err(format!("Unknown action: {}", action)),
    };

    let _ = amount; // used for bet-sizing slider in real implementation
    let _ = human_delay; // used for natural timing in real implementation

    #[cfg(target_os = "windows")]
    {
        // Real implementation:
        // 1. Move mouse to target with natural curve
        // 2. Wait human_delay ms
        // 3. Click
        // 4. If "raise", first adjust the bet slider to `amount`
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = target;
    }

    Ok(())
}

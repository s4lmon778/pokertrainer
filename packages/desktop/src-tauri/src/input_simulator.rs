use serde::{Deserialize, Serialize};
use windows::Win32::UI::Input::KeyboardAndMouse::MOUSE_EVENT_FLAGS;

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
        "acr" => Ok(CoordinateMap {
            client: "ACR".to_string(),
            fold_button: (270, 640),
            call_button: (420, 640),
            raise_button: (530, 640),
            all_in_button: (660, 640),
            bet_slider: (380, 600, 200, 20),
        }),
        "ggpoker" | "gg poker" => Ok(CoordinateMap {
            client: "GG Poker".to_string(),
            fold_button: (220, 540),
            call_button: (380, 540),
            raise_button: (540, 540),
            all_in_button: (700, 540),
            bet_slider: (380, 490, 320, 20),
        }),
        _ => Err(format!("Unsupported poker client: {client}")),
    }
}

// ── Anti-detection helpers ──

/// Simple xorshift64 PRNG — no external dependency needed.
fn fast_rand(seed: &mut u64) -> u64 {
    *seed ^= *seed << 13;
    *seed ^= *seed >> 7;
    *seed ^= *seed << 17;
    *seed
}

/// Return a pseudo-random value in `[lo, hi]` (inclusive).
fn rand_range(seed: &mut u64, lo: u64, hi: u64) -> u64 {
    lo + (fast_rand(seed) % (hi - lo + 1))
}

/// Apply random jitter of ±3 px to both coordinates.
fn apply_jitter(x: i32, y: i32, seed: &mut u64) -> (i32, i32) {
    let jx = (fast_rand(seed) % 7) as i32 - 3;
    let jy = (fast_rand(seed) % 7) as i32 - 3;
    (x + jx, y + jy)
}

/// Human-like delay range: 800–3000 ms.
fn human_delay_ms(seed: &mut u64) -> u64 {
    rand_range(seed, 800, 3000)
}

/// Short delay for intra-action pauses: 50–150 ms.
fn micro_delay_ms(seed: &mut u64) -> u64 {
    rand_range(seed, 50, 150)
}

/// Duration for a smooth mouse movement: 200–600 ms.
fn movement_duration_ms(seed: &mut u64) -> u64 {
    rand_range(seed, 200, 600)
}

// ── Bezier curve mouse movement ──

/// Generate waypoints along a cubic Bézier curve from (x0,y0) to (x3,y3).
///
/// Control points are offset randomly to produce a natural arc.
fn bezier_waypoints(
    x0: i32,
    y0: i32,
    x3: i32,
    y3: i32,
    num_points: usize,
    seed: &mut u64,
) -> Vec<(i32, i32)> {
    // Random control-point offsets (±30% of distance)
    let dx = (x3 - x0) as f64;
    let dy = (y3 - y0) as f64;
    let dist = (dx * dx + dy * dy).sqrt().max(1.0);
    let offset = dist * 0.3;

    let cp_off_x = (fast_rand(seed) as f64 / u64::MAX as f64 * 2.0 - 1.0) * offset;
    let cp_off_y = (fast_rand(seed) as f64 / u64::MAX as f64 * 2.0 - 1.0) * offset;
    let cp2_off_x = (fast_rand(seed) as f64 / u64::MAX as f64 * 2.0 - 1.0) * offset;
    let cp2_off_y = (fast_rand(seed) as f64 / u64::MAX as f64 * 2.0 - 1.0) * offset;

    let p0x = x0 as f64;
    let p0y = y0 as f64;
    let p1x = x0 as f64 + dx * 0.33 + cp_off_x;
    let p1y = y0 as f64 + dy * 0.33 + cp_off_y;
    let p2x = x0 as f64 + dx * 0.66 + cp2_off_x;
    let p2y = y0 as f64 + dy * 0.66 + cp2_off_y;
    let p3x = x3 as f64;
    let p3y = y3 as f64;

    let mut points = Vec::with_capacity(num_points);
    for i in 0..=num_points {
        let t = i as f64 / num_points as f64;
        let t2 = t * t;
        let t3 = t2 * t;
        let mt = 1.0 - t;
        let mt2 = mt * mt;
        let mt3 = mt2 * mt;

        let px = mt3 * p0x + 3.0 * mt2 * t * p1x + 3.0 * mt * t2 * p2x + t3 * p3x;
        let py = mt3 * p0y + 3.0 * mt2 * t * p1y + 3.0 * mt * t2 * p2y + t3 * p3y;

        points.push((px.round() as i32, py.round() as i32));
    }
    points
}

/// Get the current mouse cursor position.
fn get_cursor_pos() -> Result<(i32, i32), String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::*;
        use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

        let mut pt = POINT::default();
        unsafe {
            GetCursorPos(&mut pt)
                .map_err(|e| format!("GetCursorPos failed: {e}"))?;
        }
        Ok((pt.x, pt.y))
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Mouse control only supported on Windows".to_string())
    }
}

/// Set the mouse cursor to a screen position.
fn set_cursor_pos(x: i32, y: i32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::WindowsAndMessaging::SetCursorPos;
        unsafe {
            SetCursorPos(x, y)
                .map_err(|e| format!("SetCursorPos failed: {e}"))?;
        }
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (x, y);
        Err("Mouse control only supported on Windows".to_string())
    }
}

/// Send a mouse input event via Windows SendInput API.
unsafe fn send_mouse_input(
    x: i32,
    y: i32,
    flags: MOUSE_EVENT_FLAGS,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::Input::KeyboardAndMouse::*;
        use windows::Win32::UI::WindowsAndMessaging::SetCursorPos;

        // Move cursor to position first
        SetCursorPos(x, y).map_err(|e| format!("SetCursorPos failed: {e}"))?;

        // Send mouse event
        let mut input: INPUT = std::mem::zeroed();
        input.r#type = INPUT_MOUSE;
        input.Anonymous.mi = MOUSEINPUT {
            dx: 0,
            dy: 0,
            mouseData: 0,
            dwFlags: flags,
            time: 0,
            dwExtraInfo: 0,
        };

        let sent = SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
        if sent == 0 {
            return Err("SendInput (mouse) failed".to_string());
        }
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (x, y, flags);
        Err("Mouse control only supported on Windows".to_string())
    }
}

// ── Internal API (called from bot_controller without Tauri) ──

/// Execute a poker action from inside the bot thread (no Tauri dependency).
pub fn execute_poker_action_internal(
    action: &str,
    _amount: f64,
    client: &str,
) -> Result<(), String> {
    let coords = client_coordinates(client)?;
    let mut seed = 557u64;

    let target = match action.to_lowercase().as_str() {
        "fold" => coords.fold_button,
        "call" => coords.call_button,
        "raise" => coords.raise_button,
        "all-in" | "allin" => coords.all_in_button,
        "check" => return Ok(()),
        _ => return Err(format!("Unknown action: {action}")),
    };

    // 1. Smooth movement to target
    let dur = movement_duration_ms(&mut seed) as i32;
    move_mouse_smooth(target.0, target.1, dur)?;

    // 2. Human-like thinking pause
    std::thread::sleep(std::time::Duration::from_millis(human_delay_ms(&mut seed)));

    // 3. Click the action button
    click_at(target.0, target.1, "left".to_string())?;

    Ok(())
}

// ── Tauri Commands ──

/// Move the mouse cursor smoothly along a Bézier curve to (x, y).
///
/// `duration_ms` controls how long the movement takes (200–600 ms typical).
#[tauri::command]
pub fn move_mouse_smooth(x: i32, y: i32, duration_ms: i32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let mut seed = 117u64;
        let (start_x, start_y) = get_cursor_pos()?;
        let num_points = 30usize;
        let waypoints = bezier_waypoints(start_x, start_y, x, y, num_points, &mut seed);

        let step_delay = (duration_ms as u64).max(1) / (num_points as u64).max(1);

        for (i, &(wx, wy)) in waypoints.iter().enumerate() {
            let (jx, jy) = apply_jitter(wx, wy, &mut seed);
            set_cursor_pos(jx, jy)?;
            // Sleep diverges near target (slower finish)
            let delay = if i > num_points * 3 / 4 {
                step_delay * 2
            } else {
                step_delay
            };
            std::thread::sleep(std::time::Duration::from_millis(delay));
        }
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (x, y, duration_ms);
        Err("Mouse control only supported on Windows".to_string())
    }
}

/// Stub kept for backward-compat with existing frontend; delegates to `move_mouse_smooth`.
#[tauri::command]
pub fn move_mouse(x: i32, y: i32, natural: bool) -> Result<(), String> {
    let duration = if natural { 400 } else { 100 };
    move_mouse_smooth(x, y, duration)
}

/// Left or right click at (x, y).
///
/// Button is "left" or "right". Movement uses natural curve + jitter.
/// Mouse-down and mouse-up are separated by 50–150 ms (human variation).
#[tauri::command]
pub fn click_at(x: i32, y: i32, button: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::Input::KeyboardAndMouse::*;

        let mut seed = 223u64;
        let (_start_x, _start_y) = get_cursor_pos()?;
        let dur = movement_duration_ms(&mut seed) as i32;

        // 1. Natural movement to target
        move_mouse_smooth(x, y, dur)?;

        let (jx, jy) = apply_jitter(x, y, &mut seed);

        let down_flag = match button.to_lowercase().as_str() {
            "left" | "l" => MOUSEEVENTF_LEFTDOWN,
            "right" | "r" => MOUSEEVENTF_RIGHTDOWN,
            _ => return Err(format!("Unknown button: {button}")),
        };
        let up_flag = match button.to_lowercase().as_str() {
            "left" | "l" => MOUSEEVENTF_LEFTUP,
            "right" | "r" => MOUSEEVENTF_RIGHTUP,
            _ => return Err(format!("Unknown button: {button}")),
        };

        // 2. Mouse down
        unsafe { send_mouse_input(jx, jy, down_flag)?; }

        // 3. Pause 50–150 ms
        std::thread::sleep(std::time::Duration::from_millis(
            micro_delay_ms(&mut seed),
        ));

        // 4. Mouse up
        unsafe { send_mouse_input(jx, jy, up_flag)?; }

        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (x, y, button);
        Err("Input simulation only supported on Windows".to_string())
    }
}

/// Simulate a sequence of keystrokes using Windows SendInput.
///
/// Each element in `keys` is a key name:
/// - Single char: "a", "B", "1", " ", etc.
/// - Named keys: "enter", "tab", "backspace", "escape", "delete", "up", "down", "left", "right"
#[tauri::command]
pub fn type_keys(keys: Vec<String>) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::Input::KeyboardAndMouse::*;

        let mut seed = 339u64;

        for key in &keys {
            let vk = key_name_to_vk(key)?;

            // Key down
            {
                let mut input: INPUT = unsafe { std::mem::zeroed() };
                input.r#type = INPUT_KEYBOARD;
                input.Anonymous.ki = KEYBDINPUT {
                    wVk: VIRTUAL_KEY(vk),
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP, // will be 0 for keydown — set correctly below
                    time: 0,
                    dwExtraInfo: 0,
                };
                // Keydown: dwFlags = 0
                input.Anonymous.ki.dwFlags = Default::default(); // 0

                let sent =
                    unsafe { SendInput(&[input], std::mem::size_of::<INPUT>() as i32) };
                if sent == 0 {
                    return Err(format!("SendInput (keydown) failed for {key}"));
                }
            }

            // Small pause
            std::thread::sleep(std::time::Duration::from_millis(
                rand_range(&mut seed, 30, 100),
            ));

            // Key up
            {
                let mut input: INPUT = unsafe { std::mem::zeroed() };
                input.r#type = INPUT_KEYBOARD;
                input.Anonymous.ki = KEYBDINPUT {
                    wVk: VIRTUAL_KEY(vk),
                    wScan: 0,
                    dwFlags: KEYEVENTF_KEYUP,
                    time: 0,
                    dwExtraInfo: 0,
                };

                let sent =
                    unsafe { SendInput(&[input], std::mem::size_of::<INPUT>() as i32) };
                if sent == 0 {
                    return Err(format!("SendInput (keyup) failed for {key}"));
                }
            }

            // 50–200 ms inter-key delay (human-like typing rhythm)
            std::thread::sleep(std::time::Duration::from_millis(
                rand_range(&mut seed, 50, 200),
            ));
        }

        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = keys;
        Err("Input simulation only supported on Windows".to_string())
    }
}

/// Map a key name string to a Windows Virtual-Key code.
fn key_name_to_vk(name: &str) -> Result<u16, String> {
    // Single character → uppercase VK code
    if name.len() == 1 {
        let ch = name.chars().next().unwrap();
        return match ch {
            'a'..='z' => Ok(ch.to_ascii_uppercase() as u16 ),
            'A'..='Z' => Ok(ch as u16),
            '0'..='9' => Ok(ch as u16),
            ' ' => Ok(0x20),          // VK_SPACE
            '.' => Ok(0xBE),           // VK_OEM_PERIOD
            ',' => Ok(0xBC),           // VK_OEM_COMMA
            '-' => Ok(0xBD),           // VK_OEM_MINUS
            '=' => Ok(0xBB),           // VK_OEM_PLUS
            '/' => Ok(0xBF),           // VK_OEM_2
            '\\' => Ok(0xDC),          // VK_OEM_5
            ';' => Ok(0xBA),           // VK_OEM_1
            '\'' => Ok(0xDE),          // VK_OEM_7
            '[' => Ok(0xDB),           // VK_OEM_4
            ']' => Ok(0xDD),           // VK_OEM_6
            '`' => Ok(0xC0),           // VK_OEM_3
            _ => Err(format!("Unknown key: {name}")),
        };
    }

    // Named keys
    let vk = match name.to_lowercase().as_str() {
        "enter" | "return" => 0x0D,   // VK_RETURN
        "tab" => 0x09,                 // VK_TAB
        "backspace" | "back" => 0x08,  // VK_BACK
        "escape" | "esc" => 0x1B,      // VK_ESCAPE
        "delete" | "del" => 0x2E,      // VK_DELETE
        "space" => 0x20,               // VK_SPACE
        "up" => 0x26,                  // VK_UP
        "down" => 0x28,                // VK_DOWN
        "left" => 0x25,                // VK_LEFT
        "right" => 0x27,               // VK_RIGHT
        "home" => 0x24,                // VK_HOME
        "end" => 0x23,                 // VK_END
        "pageup" | "pgup" => 0x21,     // VK_PRIOR
        "pagedown" | "pgdn" => 0x22,   // VK_NEXT
        "insert" | "ins" => 0x2D,      // VK_INSERT
        "f1" => 0x70,
        "f2" => 0x71,
        "f3" => 0x72,
        "f4" => 0x73,
        "f5" => 0x74,
        "f6" => 0x75,
        "f7" => 0x76,
        "f8" => 0x77,
        "f9" => 0x78,
        "f10" => 0x79,
        "f11" => 0x7A,
        "f12" => 0x7B,
        _ => return Err(format!("Unknown key name: {name}")),
    };
    Ok(vk)
}

/// Execute a high-level poker action on a specific client.
///
/// - `action`: "fold", "call", "raise", or "all-in"
/// - `amount`: bet/raise amount (used for raise)
/// - `client`: poker client name (e.g. "WinPoker", "PokerStars")
#[tauri::command]
pub fn execute_poker_action(
    action: String,
    amount: f64,
    client: String,
) -> Result<(), String> {
    let coords = client_coordinates(&client)?;
    let mut seed = 557u64;

    let target = match action.to_lowercase().as_str() {
        "fold" => coords.fold_button,
        "call" => coords.call_button,
        "raise" => coords.raise_button,
        "all-in" | "allin" => coords.all_in_button,
        "check" => {
            // Check = no action needed, just log
            return Ok(());
        }
        _ => return Err(format!("Unknown action: {action}")),
    };

    // 1. Smooth movement to target
    let dur = movement_duration_ms(&mut seed) as i32;
    move_mouse_smooth(target.0, target.1, dur)?;

    // 2. If raising, first adjust the bet slider
    if action.to_lowercase().as_str() == "raise" && amount > 0.0 {
        let slider = coords.bet_slider;
        let slider_x = slider.0 + (slider.2 as f64 * (amount / 100.0).min(1.0)) as i32;
        let slider_y = slider.1 + slider.3 / 2;

        // Move to slider position
        move_mouse_smooth(slider_x, slider_y, 300)?;

        // Click and drag to adjust (simplified: click at calculated position)
        click_at(slider_x, slider_y, "left".to_string())?;
        std::thread::sleep(std::time::Duration::from_millis(
            micro_delay_ms(&mut seed),
        ));

        // Move back to raise button after adjusting
        move_mouse_smooth(target.0, target.1, movement_duration_ms(&mut seed) as i32)?;
    }

    // 3. Human-like thinking pause (800–3000 ms)
    std::thread::sleep(std::time::Duration::from_millis(
        human_delay_ms(&mut seed),
    ));

    // 4. Click the action button
    click_at(target.0, target.1, "left".to_string())?;

    Ok(())
}

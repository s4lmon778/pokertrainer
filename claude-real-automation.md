# Training Bot — Implement Real Desktop Automation

## Context
PokerTrainer at `C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer`.
Build: clean. Tests: 250/250 passing.

The Tauri desktop app has stub modules. We need REAL implementations for autonomous poker play.

## Architecture
```
packages/desktop/src-tauri/src/
├── screen_capture.rs    ← STUB — needs real Windows screen capture
├── input_simulator.rs   ← STUB — needs real SendInput API
├── multi_table.rs       ← Stub OK (state management)
├── session_recorder.rs  ← Stub OK (file I/O)
└── lib.rs               ← Command registration
```

## Your Task — Implement Real Automation

### 1. Real Screen Capture (`screen_capture.rs`)

Use the `windows` crate to capture the screen and detect poker tables.

```rust
use windows::{
    core::*,
    Graphics::Imaging::*,
    Media::Ocr.*,
    Storage::Streams::*,
    Win32::Foundation::*,
    Win32::Graphics::Gdi::*,
    Win32::Graphics::Direct2D::*,
};

#[tauri::command]
pub fn capture_screen() -> Result<String, String> {
    // 1. Get desktop window DC
    // 2. Create compatible bitmap
    // 3. BitBlt to capture
    // 4. Encode to base64 PNG
    // 5. Return base64 string
}

#[tauri::command]
pub fn detect_table_region(screen_base64: String) -> Result<serde_json::Value, String> {
    // 1. Decode base64 to image
    // 2. Scan for green felt region (poker table color: #006400 to #228B22)
    // 3. Detect player seat positions (oval arrangement around table)
    // 4. Detect community card area (center of table)
    // 5. Return JSON with table geometry
}

#[tauri::command]
pub fn recognize_cards(image_base64: String, region: TableRegion) -> Result<Vec<Card>, String> {
    // 1. Crop card regions from image
    // 2. Use template matching against known card sprites
    // 3. Return recognized cards (rank + suit)
    // Note: For MVP, use color/shape heuristics instead of full OCR
}
```

Key implementation details:
- Use `BitBlt` + `GetDIBits` for screen capture (Windows GDI)
- Encode to base64 PNG using `miniz_oxide` + `flate2`
- Green felt detection: scan for pixels in RGB range (0, 80, 0) to (0, 140, 0)
- Player seats: detect at 6-9 positions around table center (6 o'clock = hero)
- Community cards: 5 slots in center-right of table

### 2. Real Input Simulation (`input_simulator.rs`)

Use Windows `SendInput` API for mouse/keyboard control.

```rust
use windows::{
    Win32::UI::Input::KeyboardAndMouse::*,
    Win32::UI::WindowsAndMessaging::*,
};

#[tauri::command]
pub fn move_mouse_smooth(x: i32, y: i32, duration_ms: u32) -> Result<(), String> {
    // 1. Get current mouse position
    // 2. Generate intermediate points along bezier curve
    // 3. Move to each point with variable speed (slower near target)
    // 4. Add random jitter (±2px) to each movement
}

#[tauri::command]
pub fn click_at(x: i32, y: i32, button: String) -> Result<(), String> {
    // 1. Move mouse to position (with smooth curve)
    // 2. Send MOUSEEVENTF_LEFTDOWN or MOUSEEVENTF_RIGHTDOWN
    // 3. Sleep 50-150ms (human variation)
    // 4. Send MOUSEEVENTF_LEFTUP or MOUSEEVENTF_RIGHTUP
}

#[tauri::command]
pub fn type_keys(keys: Vec<String>) -> Result<(), String> {
    // 1. Map key names to VirtualKey codes
    // 2. Send KEYEVENTF_SCANCODE for each key
    // 3. Add random delay between keys (50-200ms)
}

#[tauri::command]
pub fn execute_poker_action(action: String, amount: f64, client: String) -> Result<(), String> {
    // 1. Get client-specific coordinate map
    // 2. Map action to screen coordinates:
    //    - "fold" → click fold button
    //    - "call" → click call button
    //    - "raise" → move slider to amount, click raise
    //    - "check" → do nothing (already checked)
    // 3. Execute with human-like timing
}
```

Coordinate maps for poker clients:
```rust
const CLIENT_COORDS: std::collections::HashMap<&str, ClientCoords> = [
    ("winpoker", ClientCoords {
        fold: (100, 500),
        call: (200, 500),
        raise: (300, 500),
        slider: (250, 450),
    }),
    ("pokerstars", ClientCoords { ... }),
    ("ggpoker", ClientCoords { ... }),
];
```

Anti-detection measures:
- Bezier curve mouse movements (not直线)
- Random speed variation (±30%)
- Random jitter on coordinates (±3px)
- Human-like delays (800-3000ms between actions)
- Occasional "thinking pause" on complex decisions

### 3. Card Recognition (`recognize_cards.rs`)

Simple template matching for card recognition.

```rust
#[tauri::command]
pub fn recognize_card_template(
    image_base64: String,
    card_region: Rect,
    known_sprites: Vec<(String, Vec<u8>)>, // name + sprite data
) -> Result<String, String> {
    // 1. Decode image and crop card region
    // 2. Compare against known card sprite templates
    // 3. Use correlation matching (not pixel-perfect)
    // 4. Return best match (e.g., "As", "Kh", "3d")
}

#[tauri::command]
pub fn detect_chip_count(image_base64: String, chip_region: Rect) -> Result<f64, String> {
    // 1. Crop chip stack region
    // 2. Count visible chips (edge detection + contour counting)
    // 3. Estimate total based on chip denominations
}
```

### 4. Update Cargo.toml Dependencies

Add required Rust crates:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
windows = { version = "0.58", features = [
    "Win32_Graphics_Gdi",
    "Win32_Foundation",
    "Win32_UI_Input_KeyboardAndMouse",
    "Win32_UI_WindowsAndMessaging",
    "Media_Ocr",
    "Graphics_Imaging",
] }
miniz_oxide = "0.8"
flate2 = "1.0"
base64 = "0.22"
image = "0.25"
```

### 5. Update lib.rs to Register New Commands

```rust
mod screen_capture;
mod input_simulator;
mod card_recognition;
mod multi_table;
mod session_recorder;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Screen capture
            screen_capture::capture_screen,
            screen_capture::detect_table_region,
            screen_capture::recognize_cards,
            // Card recognition
            card_recognition::recognize_card_template,
            card_recognition::detect_chip_count,
            // Input simulation
            input_simulator::move_mouse_smooth,
            input_simulator::click_at,
            input_simulator::type_keys,
            input_simulator::execute_poker_action,
            // Multi-table
            multi_table::start_multi_table,
            multi_table::pause_all_tables,
            multi_table::get_table_status,
            // Session recording
            session_recorder::start_recording,
            session_recorder::record_hand,
            session_recorder::stop_recording,
        ])
        .run(tauri::generate_context!())
        .expect("error while running PokerTrainer");
}
```

## Constraints
- **Karpathy Guidelines**: Implement what's needed, don't overcomplicate
- **Focus on Windows**: All screen capture and input simulation for Windows
- **Keep it simple**: Template matching for cards, GDI for screen capture, SendInput for mouse
- **Build must pass**: `cargo check` in src-tauri/ must succeed

## Success Criteria
1. `cargo check` in `packages/desktop/src-tauri/` passes
2. All Tauri commands are properly registered
3. Screen capture returns real base64 PNG data
4. Input simulation uses real SendInput API
5. Card recognition uses template matching
6. Anti-detection measures implemented (Bezier curves, jitter, timing)

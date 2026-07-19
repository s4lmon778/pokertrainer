# Training Bot Desktop — Screen Capture & Input Simulation

## Context
PokerTrainer at `C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer`.
Build: clean. Tests: 250/250 passing.

We have:
- `packages/engine/` — standalone poker engine (GTO solver, training bot, strategies)
- `packages/desktop/` — Tauri v2 scaffolding (Cargo.toml, main.rs, lib.rs)
- `src/components/TrainingBotSettings.tsx` — UI with download/import config

## Your Task — Implement Desktop Automation Modules

### 1. Rust Backend — Screen Capture (`src-tauri/src/screen_capture.rs`)

Implement a Rust module that captures the desktop screen and detects poker table elements:

```rust
// Use the screenshot crate or windows crate for screen capture
// Detect poker table regions using color/shape matching
// Extract: player positions, hole cards, community cards, chip counts, pot size, betting actions

#[tauri::command]
fn capture_screen() -> Result<String, String> {
    // Capture screen, return base64 encoded image or JSON table state
}

#[tauri::command]
fn detect_table_region(screen_data: String) -> Result<TableRegion, String> {
    // Analyze screen to find poker table area
    // Return: position, size, detected players, current phase
}
```

Key features:
- Capture screen as base64 PNG
- Detect table layout (green felt, player seats, community card area)
- Extract player positions and chip counts
- Identify current betting phase (preflop, flop, turn, river)
- Support multiple poker clients (WinPoker, PokerStars, GG Poker, etc.)

### 2. Rust Backend — Input Simulation (`src-tauri/src/input_simulator.rs`)

Implement mouse/keyboard control for automated poker play:

```rust
use windows::Win32::UI::WindowsAndMessaging::{SendInput, INPUT, INPUT_MOUSE, MOUSEINPUT};

#[tauri::command]
fn move_mouse(x: i32, y: i32, natural: bool) -> Result<(), String> {
    // Move mouse to position (with optional human-like curve)
}

#[tauri::command]
fn click_at(x: i32, y: i32, button: String) -> Result<(), String> {
    // Left/right click at position
}

#[tauri::command]
fn type_keys(keys: Vec<String>) -> Result<(), String> {
    // Simulate keyboard input (fold, call, raise, etc.)
}

#[tauri::command]
fn execute_poker_action(action: String, amount: f64, client: String) -> Result<(), String> {
    // Map abstract poker action to screen coordinates for specific client
    // fold → click fold button
    // call → click call button
    // raise → move slider to amount, click raise
    // all-in → click all-in button
}
```

Key features:
- Human-like mouse movement (curved paths, variable speed)
- Natural timing delays between actions (800-3000ms)
- Client-specific coordinate maps (WinPoker, PokerStars, etc.)
- Error handling for failed clicks
- Anti-detection: random jitter on coordinates

### 3. Rust Backend — Multi-Table Orchestrator (`src-tauri/src/multi_table.rs`)

Implement multi-table management:

```rust
#[derive(Debug, Serialize, Deserialize)]
struct TableSession {
    table_id: String,
    client: String,
    stakes: String,
    status: String, // "idle", "playing", "paused", "error"
    last_action_time: i64,
}

#[tauri::command]
fn start_multi_table(tables: Vec<TableConfig>) -> Result<(), String> {
    // Start playing on N tables simultaneously
}

#[tauri::command]
fn pause_all_tables() -> Result<(), String> {
    // Pause all active tables
}

#[tauri::command]
fn get_table_status() -> Result<Vec<TableStatus>, String> {
    // Return status of all monitored tables
}
```

### 4. Rust Backend — Session Recorder (`src-tauri/src/session_recorder.rs`)

Implement hand history recording:

```rust
#[tauri::command]
fn start_recording(session_id: String) -> Result<(), String> {
    // Begin recording a new session
}

#[tauri::command]
fn record_hand(hand_data: String) -> Result<(), String> {
    // Record a single hand with actions, results, mistakes
}

#[tauri::command]
fn stop_recording() -> Result<String, String> {
    // Stop recording, save session file
}
```

### 5. Update `lib.rs` — Register Commands

Update `packages/desktop/src-tauri/src/lib.rs` to register all new commands:

```rust
use tauri::Manager;

mod screen_capture;
mod input_simulator;
mod multi_table;
mod session_recorder;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to PokerTrainer Desktop.", name)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            screen_capture::capture_screen,
            screen_capture::detect_table_region,
            input_simulator::move_mouse,
            input_simulator::click_at,
            input_simulator::type_keys,
            input_simulator::execute_poker_action,
            multi_table::start_multi_table,
            multi_table::pause_all_tables,
            multi_table::get_table_status,
            session_recorder::start_recording,
            session_recorder::record_hand,
            session_recorder::stop_recording,
        ])
        .run(tauri::generate_context!())
        .expect("error while running PokerTrainer");
}
```

### 6. Frontend — Desktop UI Components

Create React components for the desktop app:

**`packages/desktop/src/App.tsx`** — Main app with:
- TrainingBotSettings panel (reuse from web app)
- Screen capture preview
- Multi-table dashboard
- Session recorder controls

**`packages/desktop/src/components/TableDashboard.tsx`** — Shows:
- Active tables grid
- Per-table status (playing/paused/error)
- Win/loss per table
- Total profit/loss

**`packages/desktop/src/components/SessionViewer.tsx`** — Shows:
- Recorded hand histories
- Mistake annotations
- GTO comparison
- Export to file

### 7. Build Verification

- `cd packages/desktop && npm run build` — Tauri app builds
- `cd packages/engine && npm run build` — Engine package builds
- Root `npm run build` — Still passes
- Root `npx vitest run` — Still 250/250 tests pass

## Constraints
- **Karpathy Guidelines**: Minimal, surgical changes. Don't rewrite working code.
- **Focus on structure**: Implement the Rust modules with proper Tauri command bindings. The actual screen capture/image processing can be stubs that return dummy data for now.
- **TypeScript ternary narrowing**: Extract comparisons into boolean consts before ternaries.
- **Build must pass** after every change.

## Success Criteria
1. All Rust modules compile (`cargo check` in src-tauri/)
2. Tauri commands are properly registered in lib.rs
3. Frontend components import and render
4. Engine package still builds
5. Root project still builds and tests pass
6. No TypeScript errors anywhere

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use windows::Win32::Foundation::{BOOL, HWND, LPARAM, RECT, TRUE};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowRect, GetWindowTextW, IsWindowVisible,
};

/// Info about a detected poker table window.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TableWindowInfo {
    pub hwnd: isize,
    pub title: String,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub is_active: bool,
}

/// Cache of last-detected windows (polled every few seconds).
static WINDOW_CACHE: Mutex<Option<Vec<TableWindowInfo>>> = Mutex::new(None);

/// Callback context for EnumWindows.
struct EnumCtx {
    windows: Vec<TableWindowInfo>,
}

/// Check if a window title looks like a PokerStars table.
fn is_pokerstars_table(title: &str) -> bool {
    let lower = title.to_lowercase();
    // PokerStars table titles look like: "Table Name 6-max" or "Table Name"
    // They also may not have obvious markers — but they're NOT the lobby or settings
    !lower.contains("lobby")
        && !lower.contains("settings")
        && !lower.contains("cashier")
        && !lower.contains("home")
        && !lower.contains("store")
        && !lower.contains("challenge")
        && (lower.contains("hold'em") || lower.contains("omaha") || lower.contains("table"))
}

extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    unsafe {
        let ctx = &mut *(lparam.0 as *mut EnumCtx);

        if !IsWindowVisible(hwnd).as_bool() {
            return TRUE;
        }

        // Get window title
        let mut buf = [0u16; 256];
        let len = GetWindowTextW(hwnd, &mut buf);
        if len == 0 {
            return TRUE;
        }
        let title = String::from_utf16_lossy(&buf[..len as usize]);

        // Filter to PokerStars tables
        if !is_pokerstars_table(&title) {
            return TRUE;
        }

        // Get window rect
        let mut rect = RECT::default();
        if GetWindowRect(hwnd, &mut rect).is_err() {
            return TRUE;
        }

        ctx.windows.push(TableWindowInfo {
            hwnd: hwnd.0 as isize,
            title,
            x: rect.left,
            y: rect.top,
            width: rect.right - rect.left,
            height: rect.bottom - rect.top,
            is_active: false,
        });

        TRUE
    }
}

/// Scan the desktop for PokerStars table windows.
/// Runs in a spawned thread so it doesn't block the IPC handler.
#[tauri::command]
pub async fn find_poker_tables() -> Result<Vec<TableWindowInfo>, String> {
    // EnumWindows must run on the same thread that owns the message queue.
    // We spawn a dedicated OS thread and join it.
    let handle = std::thread::spawn(move || {
        let mut ctx = EnumCtx {
            windows: Vec::new(),
        };

        unsafe {
            EnumWindows(
                Some(enum_proc),
                LPARAM(&mut ctx as *mut EnumCtx as isize),
            )
            .map_err(|e| format!("EnumWindows failed: {e}"))?;
        }

        // Update cache
        if let Ok(mut cache) = WINDOW_CACHE.lock() {
            *cache = Some(ctx.windows.clone());
        }

        Ok::<Vec<TableWindowInfo>, String>(ctx.windows)
    });

    handle.join().map_err(|_| "Window scan thread panicked".to_string())?
}

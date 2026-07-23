use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use windows::Win32::Foundation::{BOOL, HWND, LPARAM, RECT, TRUE};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowRect, GetWindowTextW, IsWindowVisible,
};

/// Supported poker clients.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum PokerClient {
    PokerStars,
    ACR,
    Unknown,
}

impl PokerClient {
    pub fn as_str(&self) -> &'static str {
        match self {
            PokerClient::PokerStars => "PokerStars",
            PokerClient::ACR => "ACR",
            PokerClient::Unknown => "Unknown",
        }
    }
}

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
    pub client_type: String, // "PokerStars" | "ACR" | "Unknown"
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
    !lower.contains("lobby")
        && !lower.contains("settings")
        && !lower.contains("cashier")
        && !lower.contains("home")
        && !lower.contains("store")
        && !lower.contains("challenge")
        && (lower.contains("hold'em") || lower.contains("omaha") || lower.contains("table") || lower.contains("tournament"))
}

/// Check if a window title looks like an Americas Cardroom (ACR / WPN) table.
fn is_acr_table(title: &str) -> bool {
    let lower = title.to_lowercase();
    // ACR table titles typically contain:
    // - "americas cardroom" 
    // - "table #" followed by digits
    // - Winning Poker Network titles
    // Exclude non-table windows
    if lower.contains("lobby") || lower.contains("settings") || lower.contains("cashier")
        || lower.contains("home") || lower.contains("store")
    {
        return false;
    }
    lower.contains("americas cardroom")
        || lower.contains("acr")
        || (lower.contains("table") && lower.contains('#'))
        || (lower.contains("table") && lower.chars().any(|c| c.is_numeric()))
}

/// Detect which poker client a window belongs to.
fn detect_client(title: &str) -> PokerClient {
    if is_pokerstars_table(title) {
        PokerClient::PokerStars
    } else if is_acr_table(title) {
        PokerClient::ACR
    } else {
        PokerClient::Unknown
    }
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

        // Detect client
        let client = detect_client(&title);
        if client == PokerClient::Unknown {
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
            client_type: client.as_str().to_string(),
        });

        TRUE
    }
}

/// Info about a detected browser poker table (from extension).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BrowserTableInfo {
    pub table_id: String,
    pub site_name: String,
    pub url: String,
    pub title: String,
    pub client_type: String, // "browser"
}

/// Scan for browser poker tables (from browser extension bridge).
/// Merges with desktop table results for unified view.
#[tauri::command]
pub fn find_browser_tables() -> Result<Vec<BrowserTableInfo>, String> {
    let table_ids = crate::browser_bridge::list_browser_tables();
    let mut results = Vec::new();

    for tid in &table_ids {
        let state = crate::browser_bridge::read_latest_state(tid);
        if let Some(bs) = state {
            results.push(BrowserTableInfo {
                table_id: tid.clone(),
                site_name: bs.site_name.clone(),
                url: bs.url.clone(),
                title: format!("{} — {}", bs.site_name, bs.url),
                client_type: "browser".to_string(),
            });
        } else {
            // Table registered but no state yet
            results.push(BrowserTableInfo {
                table_id: tid.clone(),
                site_name: "unknown".to_string(),
                url: "".to_string(),
                title: tid.clone(),
                client_type: "browser".to_string(),
            });
        }
    }

    Ok(results)
}

/// Scan the desktop for poker table windows (PokerStars + ACR).
/// Runs in a spawned thread so it doesn't block the IPC handler.
#[tauri::command]
pub async fn find_poker_tables() -> Result<Vec<TableWindowInfo>, String> {
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

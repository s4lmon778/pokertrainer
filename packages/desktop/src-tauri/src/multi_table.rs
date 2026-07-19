use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

/// Configuration for a single table session to launch.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TableConfig {
    pub table_id: String,
    pub client: String,
    pub stakes: String,
    pub strategy: String,
}

/// Current status of a monitored table session.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TableStatus {
    pub table_id: String,
    pub client: String,
    pub stakes: String,
    pub status: String, // "idle", "playing", "paused", "error"
    pub last_action_time: i64,
    pub hands_played: u32,
    pub profit_loss: f64,
}

/// In-memory store of active table sessions.
///
/// In a production system this would be backed by a database or durable log.
static TABLES: Mutex<Option<HashMap<String, TableStatus>>> = Mutex::new(None);

fn tables_lock() -> std::sync::MutexGuard<'static, Option<HashMap<String, TableStatus>>> {
    TABLES.lock().expect("multi_table TABLES mutex poisoned")
}

fn ensure_tables() {
    let mut guard = TABLES.lock().expect("multi_table TABLES mutex poisoned");
    if guard.is_none() {
        *guard = Some(HashMap::new());
    }
}

// ── Tauri Commands ──

/// Start playing on N tables simultaneously.
///
/// Each table is configured with a client, stakes, and strategy.
#[tauri::command]
pub fn start_multi_table(tables: Vec<TableConfig>) -> Result<(), String> {
    ensure_tables();
    let mut guard = tables_lock();
    let map = guard.as_mut().unwrap();

    for config in &tables {
        if map.contains_key(&config.table_id) {
            return Err(format!("Table {} is already active", config.table_id));
        }
    }

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    for config in &tables {
        map.insert(
            config.table_id.clone(),
            TableStatus {
                table_id: config.table_id.clone(),
                client: config.client.clone(),
                stakes: config.stakes.clone(),
                status: "playing".to_string(),
                last_action_time: now,
                hands_played: 0,
                profit_loss: 0.0,
            },
        );
    }

    Ok(())
}

/// Pause all active tables.
#[tauri::command]
pub fn pause_all_tables() -> Result<(), String> {
    ensure_tables();
    let mut guard = tables_lock();
    let map = guard.as_mut().unwrap();

    for status in map.values_mut() {
        if status.status == "playing" {
            status.status = "paused".to_string();
        }
    }

    Ok(())
}

/// Return status of all monitored tables.
#[tauri::command]
pub fn get_table_status() -> Result<Vec<TableStatus>, String> {
    ensure_tables();
    let guard = tables_lock();
    let map = guard.as_ref().unwrap();

    let mut statuses: Vec<TableStatus> = map.values().cloned().collect();
    statuses.sort_by(|a, b| a.table_id.cmp(&b.table_id));

    Ok(statuses)
}

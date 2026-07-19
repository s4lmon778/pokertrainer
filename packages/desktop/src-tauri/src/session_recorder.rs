use serde::{Deserialize, Serialize};
use std::sync::Mutex;

/// A single recorded action within a hand.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecordedAction {
    pub player: String,
    pub action: String,
    pub amount: f64,
    pub timestamp_ms: i64,
}

/// A complete recorded hand with all actions and annotations.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecordedHand {
    pub hand_id: String,
    pub table_id: String,
    pub stakes: String,
    pub hole_cards: Vec<String>,
    pub community_cards: Vec<String>,
    pub actions: Vec<RecordedAction>,
    pub result: f64,
    pub mistakes: Vec<String>,
    pub gto_comparison: Option<String>,
}

/// Active recording state.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecordingSession {
    pub session_id: String,
    pub started_at: i64,
    pub hands: Vec<RecordedHand>,
}

/// In-memory recording state — one active session at a time.
static RECORDING: Mutex<Option<RecordingSession>> = Mutex::new(None);

// ── Tauri Commands ──

/// Begin recording a new session. Overwrites any existing active recording.
#[tauri::command]
pub fn start_recording(session_id: String) -> Result<(), String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let mut guard = RECORDING.lock().map_err(|e| e.to_string())?;
    *guard = Some(RecordingSession {
        session_id,
        started_at: now,
        hands: vec![],
    });

    Ok(())
}

/// Record a single hand into the active session.
///
/// `hand_data` is a JSON-serialized [`RecordedHand`] string.
#[tauri::command]
pub fn record_hand(hand_data: String) -> Result<(), String> {
    let hand: RecordedHand =
        serde_json::from_str(&hand_data).map_err(|e| format!("Invalid hand JSON: {}", e))?;

    let mut guard = RECORDING.lock().map_err(|e| e.to_string())?;
    let session = guard
        .as_mut()
        .ok_or_else(|| "No active recording session. Call start_recording first.".to_string())?;

    session.hands.push(hand);

    Ok(())
}

/// Stop recording and return the session as a JSON string.
#[tauri::command]
pub fn stop_recording() -> Result<String, String> {
    let mut guard = RECORDING.lock().map_err(|e| e.to_string())?;
    let session = guard
        .take()
        .ok_or_else(|| "No active recording session to stop.".to_string())?;

    serde_json::to_string(&session).map_err(|e| format!("Failed to serialize session: {}", e))
}

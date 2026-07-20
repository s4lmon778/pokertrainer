use tauri::Manager;

mod screen_capture;
mod input_simulator;
mod card_recognition;
mod multi_table;
mod session_recorder;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! Welcome to PokerBot Desktop.")
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            // Screen capture
            screen_capture::capture_screen,
            screen_capture::detect_table_region,
            screen_capture::recognize_cards,
            // Card recognition
            card_recognition::recognize_card_template,
            card_recognition::detect_chip_count,
            // Input simulation
            input_simulator::move_mouse,
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
        .expect("error while running PokerBot");
}

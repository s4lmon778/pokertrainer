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

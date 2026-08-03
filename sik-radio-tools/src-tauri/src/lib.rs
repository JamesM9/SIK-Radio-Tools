mod serial;

use serial::SerialManager;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let serial_manager = Arc::new(SerialManager::default());

    tauri::Builder::default()
        .manage(serial_manager)
        .invoke_handler(tauri::generate_handler![
            serial::list_serial_ports,
            serial::select_serial_port,
            serial::get_selected_port,
            serial::open_serial_port,
            serial::close_serial_port,
            serial::write_serial,
            serial::is_serial_open,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SiK Radio Tools");
}

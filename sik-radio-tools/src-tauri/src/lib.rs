mod serial;
mod ble;

use ble::BleManager;
use serial::SerialManager;
use std::sync::Arc;

#[tauri::command]
fn get_app_platform() -> &'static str {
    #[cfg(target_os = "android")]
    {
        "android"
    }
    #[cfg(target_os = "ios")]
    {
        "ios"
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        "desktop"
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let serial_manager = Arc::new(SerialManager::default());
    let ble_manager = Arc::new(BleManager::default());

    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_serialplugin::init())
        .manage(serial_manager)
        .manage(ble_manager)
        .invoke_handler(tauri::generate_handler![
            get_app_platform,
            serial::list_serial_ports,
            serial::select_serial_port,
            serial::get_selected_port,
            serial::open_serial_port,
            serial::close_serial_port,
            serial::write_serial,
            serial::is_serial_open,
            ble::ble_list_devices,
            ble::ble_connect,
            ble::ble_disconnect,
            ble::ble_write,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SiK Radio Tools");
}

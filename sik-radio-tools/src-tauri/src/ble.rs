//! BLE UART bridge commands for Apple devices (and optional Android BLE).
//!
//! On iOS, generic FTDI USB-serial is not available to third-party apps.
//! A Nordic UART Service (NUS) BLE bridge wired to the radio is the supported path.
//!
//! Native CoreBluetooth / Android BLE implementations live under `mobile/`;
//! these commands provide the invoke surface and a clear error when BLE is
//! not available in the current build.

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use std::sync::{Arc, Mutex};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BleDeviceInfo {
    pub id: String,
    pub name: String,
}

#[derive(Default)]
pub struct BleManager {
    selected: Mutex<Option<BleDeviceInfo>>,
    connected: Mutex<bool>,
}

#[tauri::command]
pub fn ble_list_devices(state: State<'_, Arc<BleManager>>) -> Result<Vec<BleDeviceInfo>, String> {
    // Placeholder enumeration until the platform BLE plugin is linked.
    // Returning an empty list still lets the UI show Refresh + setup guidance.
    let _ = state;
    #[cfg(target_os = "ios")]
    {
        return Err(
            "BLE scanning requires the iOS CoreBluetooth plugin. Rebuild the iOS app on macOS after `tauri ios init`."
                .into(),
        );
    }
    #[cfg(not(target_os = "ios"))]
    {
        Ok(vec![])
    }
}

#[tauri::command]
pub fn ble_connect(
    app: AppHandle,
    state: State<'_, Arc<BleManager>>,
    device_id: String,
    baud_rate: u32,
) -> Result<(), String> {
    let _ = (app, baud_rate);
    *state.selected.lock().map_err(|e| e.to_string())? = Some(BleDeviceInfo {
        id: device_id.clone(),
        name: device_id,
    });
    *state.connected.lock().map_err(|e| e.to_string())? = false;
    Err(
        "BLE UART connect is not available in this build. On iPhone/iPad use a BLE-UART bridge and an iOS build with CoreBluetooth enabled.".into(),
    )
}

#[tauri::command]
pub fn ble_disconnect(state: State<'_, Arc<BleManager>>) -> Result<(), String> {
    *state.connected.lock().map_err(|e| e.to_string())? = false;
    Ok(())
}

#[tauri::command]
pub fn ble_write(state: State<'_, Arc<BleManager>>, data: Vec<u8>) -> Result<(), String> {
    let connected = *state.connected.lock().map_err(|e| e.to_string())?;
    if !connected {
        return Err("BLE device is not connected".into());
    }
    let _ = data;
    Err("BLE write is not available in this build".into())
}

/// Helper used by platform BLE plugins to push RX bytes into the WebView.
#[allow(dead_code)]
pub fn emit_ble_data(app: &AppHandle, data: Vec<u8>) {
    let _ = app.emit("ble-serial-data", data);
}

#[allow(dead_code)]
pub fn emit_ble_closed(app: &AppHandle) {
    let _ = app.emit("ble-serial-closed", ());
}

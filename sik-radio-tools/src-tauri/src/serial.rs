use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, State};

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use std::time::Duration;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use tauri::Emitter;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortInfo {
    pub path: String,
    pub name: String,
    pub vendor_id: Option<u16>,
    pub product_id: Option<u16>,
}

pub struct SerialManager {
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    port: Mutex<Option<Box<dyn serialport::SerialPort>>>,
    reader_stop: AtomicBool,
    selected_path: Mutex<Option<String>>,
    selected_meta: Mutex<Option<PortInfo>>,
}

impl Default for SerialManager {
    fn default() -> Self {
        Self {
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            port: Mutex::new(None),
            reader_stop: AtomicBool::new(false),
            selected_path: Mutex::new(None),
            selected_meta: Mutex::new(None),
        }
    }
}

impl SerialManager {
    fn close_internal(&self) -> Result<(), String> {
        self.reader_stop.store(true, Ordering::SeqCst);
        #[cfg(not(any(target_os = "android", target_os = "ios")))]
        {
            std::thread::sleep(Duration::from_millis(60));
            let mut guard = self.port.lock().map_err(|e| e.to_string())?;
            if let Some(mut port) = guard.take() {
                use std::io::Write;
                let _ = port.flush();
            }
        }
        Ok(())
    }
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn describe_port(port_name: &str, port_type: &serialport::SerialPortType) -> PortInfo {
    match port_type {
        serialport::SerialPortType::UsbPort(info) => PortInfo {
            path: port_name.to_string(),
            name: info
                .product
                .clone()
                .or_else(|| info.manufacturer.clone())
                .unwrap_or_else(|| port_name.to_string()),
            vendor_id: Some(info.vid),
            product_id: Some(info.pid),
        },
        _ => PortInfo {
            path: port_name.to_string(),
            name: port_name.to_string(),
            vendor_id: None,
            product_id: None,
        },
    }
}

#[tauri::command]
pub fn list_serial_ports() -> Result<Vec<PortInfo>, String> {
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        return Err(
            "Native OS serial listing is desktop-only. On Android use USB Host (serialplugin); on iOS use BLE UART."
                .into(),
        );
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let ports = serialport::available_ports().map_err(|e| e.to_string())?;
        let mut out: Vec<PortInfo> = ports
            .into_iter()
            .map(|p| describe_port(&p.port_name, &p.port_type))
            .collect();

        out.sort_by(|a, b| {
            let a_sik = matches!((a.vendor_id, a.product_id), (Some(0x0403), Some(0x6015)));
            let b_sik = matches!((b.vendor_id, b.product_id), (Some(0x0403), Some(0x6015)));
            b_sik.cmp(&a_sik).then_with(|| a.path.cmp(&b.path))
        });

        Ok(out)
    }
}

#[tauri::command]
pub fn select_serial_port(
    state: State<'_, Arc<SerialManager>>,
    path: String,
) -> Result<PortInfo, String> {
    let ports = list_serial_ports().unwrap_or_default();
    let info = ports
        .into_iter()
        .find(|p| p.path == path)
        .unwrap_or(PortInfo {
            path: path.clone(),
            name: path.clone(),
            vendor_id: None,
            product_id: None,
        });

    *state.selected_path.lock().map_err(|e| e.to_string())? = Some(path);
    *state.selected_meta.lock().map_err(|e| e.to_string())? = Some(info.clone());
    Ok(info)
}

#[tauri::command]
pub fn get_selected_port(state: State<'_, Arc<SerialManager>>) -> Result<Option<PortInfo>, String> {
    Ok(state.selected_meta.lock().map_err(|e| e.to_string())?.clone())
}

#[tauri::command]
pub fn open_serial_port(
    app: AppHandle,
    state: State<'_, Arc<SerialManager>>,
    baud_rate: u32,
) -> Result<PortInfo, String> {
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = (app, state, baud_rate);
        return Err(
            "open_serial_port is desktop-only. Android uses USB Host via serialplugin.".into(),
        );
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        use std::io::{Read, Write};
        use std::thread;

        let path = state
            .selected_path
            .lock()
            .map_err(|e| e.to_string())?
            .clone()
            .ok_or_else(|| "No serial port selected".to_string())?;

        state.close_internal()?;

        let port = serialport::new(&path, baud_rate)
            .data_bits(serialport::DataBits::Eight)
            .stop_bits(serialport::StopBits::One)
            .parity(serialport::Parity::None)
            .timeout(Duration::from_millis(50))
            .open()
            .map_err(|e| format!("Failed to open {path}: {e}"))?;

        let mut reader = port
            .try_clone()
            .map_err(|e| format!("Failed to clone serial port for reading: {e}"))?;

        {
            let mut guard = state.port.lock().map_err(|e| e.to_string())?;
            *guard = Some(port);
        }

        state.reader_stop.store(false, Ordering::SeqCst);
        let manager = Arc::clone(state.inner());
        let app_handle = app.clone();

        thread::spawn(move || {
            let mut buf = [0u8; 4096];
            while !manager.reader_stop.load(Ordering::SeqCst) {
                match reader.read(&mut buf) {
                    Ok(n) if n > 0 => {
                        let chunk = buf[..n].to_vec();
                        let _ = app_handle.emit("serial-data", chunk);
                    }
                    Ok(_) => {}
                    Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => continue,
                    Err(ref e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
                    Err(_) => {
                        let _ = app_handle.emit("serial-closed", ());
                        break;
                    }
                }
            }
        });

        state
            .selected_meta
            .lock()
            .map_err(|e| e.to_string())?
            .clone()
            .ok_or_else(|| "Selected port metadata missing".to_string())
    }
}

#[tauri::command]
pub fn close_serial_port(state: State<'_, Arc<SerialManager>>) -> Result<(), String> {
    state.close_internal()
}

#[tauri::command]
pub fn write_serial(state: State<'_, Arc<SerialManager>>, data: Vec<u8>) -> Result<(), String> {
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = (state, data);
        Err("write_serial is desktop-only".into())
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        use std::io::Write;
        let mut guard = state.port.lock().map_err(|e| e.to_string())?;
        let port = guard
            .as_mut()
            .ok_or_else(|| "Serial port is not open".to_string())?;
        port.write_all(&data)
            .map_err(|e| format!("Serial write failed: {e}"))?;
        port.flush()
            .map_err(|e| format!("Serial flush failed: {e}"))?;
        Ok(())
    }
}

#[tauri::command]
pub fn is_serial_open(state: State<'_, Arc<SerialManager>>) -> Result<bool, String> {
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = state;
        Ok(false)
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        Ok(state.port.lock().map_err(|e| e.to_string())?.is_some())
    }
}

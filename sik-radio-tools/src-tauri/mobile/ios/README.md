# iOS BLE UART notes for SiK Radio Tools

Apple devices (**iPhone / iPad**) do **not** expose generic FTDI USB-serial
adapters to third-party apps. There is no public equivalent of Android USB Host
for common SiK/Holybro FTDI chips (`0x0403:0x6015`).

## Supported Apple paths

| Path | Status |
|---|---|
| **macOS desktop app** | Full USB serial (already in this repo) |
| **iOS + BLE UART bridge** | Intended mobile path (Nordic UART Service) |
| **iOS + generic USB FTDI** | Not available without MFi accessory |

## Hardware for iOS

1. Wire a BLE-UART module (e.g. BLE Mini / ESP32 / Nordic NUS) to the radio TX/RX/GND.
2. Power both modules.
3. Pair/connect from the iOS app; select the BLE device in the picker.

## Building the iOS app

iOS project generation requires **macOS + Xcode**:

```bash
cd sik-radio-tools
npm install
npm run build:desktop   # stages UI assets used by Tauri
npx tauri ios init --ci
# Then open the Xcode project under src-tauri/gen/apple and enable Bluetooth:
#   NSBluetoothAlwaysUsageDescription in Info.plist
npm run mobile:ios:dev
```

Frontend already routes iOS to `BleSerialTransport`, which invokes:

- `ble_list_devices`
- `ble_connect`
- `ble_disconnect`
- `ble_write`

Events: `ble-serial-data`, `ble-serial-closed`.

Implement CoreBluetooth behind those commands (Swift package under this folder
or a Tauri iOS plugin) before App Store / TestFlight distribution.

export { SerialTransport } from './serial.js';
export { MockTransport } from './mock.js';
export { TauriSerialTransport } from './tauri-serial.js';
export { PluginSerialTransport } from './plugin-serial.js';
export { BleSerialTransport } from './ble-serial.js';
export {
  isDesktopApp,
  isTauriApp,
  isAndroidApp,
  isIosApp,
  isMobileApp,
  getAppPlatform,
  resolveAppPlatform,
} from './platform.js';
export type { Transport, TransportCallbacks, SerialPortFilter } from './types.js';
export type { AppPlatform } from './platform.js';

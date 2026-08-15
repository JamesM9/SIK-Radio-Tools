/**
 * BLE UART transport for Apple devices (and optional Android BLE bridges).
 *
 * iOS does not expose generic FTDI USB-serial to third-party apps. The practical
 * path for SiK radios is a BLE-UART bridge (e.g. Nordic UART Service) wired to
 * the radio TX/RX pins. This transport talks to native Tauri BLE commands.
 */

import type { Transport, TransportCallbacks, SerialPortFilter } from './types.js';
import { LineBuffer } from '../protocol/line-buffer.js';
import { getTauri, isIosApp } from './platform.js';
import { pickSerialPort, type PickerPort } from '../ui/port-picker.js';

interface BleDeviceInfo {
  id: string;
  name: string;
}

export class BleSerialTransport implements Transport {
  private callbacks: TransportCallbacks = {};
  private lineListeners: Set<(line: string) => void> = new Set();
  private dataListeners: Set<(data: Uint8Array) => void> = new Set();
  private lineBuffer: LineBuffer;
  private _isConnected = false;
  private _portInfo?: { name?: string; vendorId?: number; productId?: number };
  private selectedId?: string;
  private unlistenData?: () => void;
  private unlistenClosed?: () => void;

  constructor() {
    this.lineBuffer = new LineBuffer({
      onLine: (line) => {
        this.callbacks.onLine?.(line);
        this.lineListeners.forEach((cb) => cb(line));
      },
    });
  }

  addLineListener(cb: (line: string) => void): () => void {
    this.lineListeners.add(cb);
    return () => this.lineListeners.delete(cb);
  }

  addDataListener(cb: (data: Uint8Array) => void): () => void {
    this.dataListeners.add(cb);
    return () => this.dataListeners.delete(cb);
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  get portInfo(): { name?: string; vendorId?: number; productId?: number } | undefined {
    return this._portInfo;
  }

  setCallbacks(cb: TransportCallbacks): void {
    this.callbacks = cb;
  }

  async requestPort(_options?: { filters?: SerialPortFilter[] }): Promise<void> {
    const tauri = getTauri();
    for (;;) {
      const devices = await tauri.core.invoke<BleDeviceInfo[]>('ble_list_devices');
      const ports: PickerPort[] = (devices || []).map((d) => ({
        path: d.id,
        name: d.name || d.id,
      }));
      try {
        const titleHint = isIosApp()
          ? 'Select a BLE UART bridge paired with your SiK radio (iOS cannot use generic USB-serial).'
          : 'Select a BLE UART bridge for your SiK radio.';
        const id = await pickSerialPort(ports, {
          title: 'Select BLE device',
          hint: titleHint,
        });
        this.selectedId = id;
        const selected = ports.find((p) => p.path === id);
        this._portInfo = { name: selected?.name || id };
        return;
      } catch (err) {
        if (err instanceof Error && err.message === '__refresh__') {
          continue;
        }
        throw err;
      }
    }
  }

  async reconnectKnownPort(): Promise<boolean> {
    return Boolean(this.selectedId);
  }

  async open(options: { baudRate: number }): Promise<void> {
    if (!this.selectedId) {
      throw new Error('No BLE device selected');
    }
    const tauri = getTauri();
    await tauri.core.invoke('ble_connect', {
      deviceId: this.selectedId,
      baudRate: options.baudRate,
    });

    this.unlistenData = await tauri.event.listen<number[]>('ble-serial-data', (event) => {
      const bytes = Uint8Array.from(event.payload ?? []);
      if (bytes.length === 0) return;
      this.dataListeners.forEach((cb) => cb(bytes));
      const text = new TextDecoder().decode(bytes);
      this.callbacks.onData?.(text);
      this.lineBuffer.push(text);
    });

    this.unlistenClosed = await tauri.event.listen('ble-serial-closed', () => {
      if (!this._isConnected) return;
      this._isConnected = false;
      this.teardownListeners();
      this.callbacks.onClose?.();
    });

    this._isConnected = true;
  }

  async close(): Promise<void> {
    this._isConnected = false;
    this.teardownListeners();
    try {
      await getTauri().core.invoke('ble_disconnect');
    } catch {
      /* ignore */
    }
    this.callbacks.onClose?.();
  }

  async write(data: string | Uint8Array): Promise<void> {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    await getTauri().core.invoke('ble_write', { data: Array.from(bytes) });
  }

  private teardownListeners(): void {
    this.unlistenData?.();
    this.unlistenClosed?.();
    this.unlistenData = undefined;
    this.unlistenClosed = undefined;
  }
}

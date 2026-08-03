/**
 * Native serial transport for the Tauri desktop app.
 */

import type { Transport, TransportCallbacks, SerialPortFilter } from './types.js';
import { LineBuffer } from '../protocol/line-buffer.js';
import { getTauri } from './platform.js';
import { pickSerialPort, type PickerPort } from '../ui/port-picker.js';

interface NativePortInfo {
  path: string;
  name: string;
  vendorId?: number | null;
  productId?: number | null;
}

export class TauriSerialTransport implements Transport {
  private callbacks: TransportCallbacks = {};
  private lineListeners: Set<(line: string) => void> = new Set();
  private dataListeners: Set<(data: Uint8Array) => void> = new Set();
  private lineBuffer: LineBuffer;
  private _isConnected = false;
  private _portInfo?: { name?: string; vendorId?: number; productId?: number };
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
    // Allow refresh loop from the picker
    for (;;) {
      const ports = await tauri.core.invoke<NativePortInfo[]>('list_serial_ports');
      const pickerPorts: PickerPort[] = ports.map((p) => ({
        path: p.path,
        name: p.name,
        vendorId: p.vendorId,
        productId: p.productId,
      }));
      try {
        const path = await pickSerialPort(pickerPorts);
        const info = await tauri.core.invoke<NativePortInfo>('select_serial_port', { path });
        this._portInfo = {
          name: info.name || info.path,
          vendorId: info.vendorId ?? undefined,
          productId: info.productId ?? undefined,
        };
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
    const tauri = getTauri();
    const selected = await tauri.core.invoke<NativePortInfo | null>('get_selected_port');
    if (!selected?.path) return false;
    this._portInfo = {
      name: selected.name || selected.path,
      vendorId: selected.vendorId ?? undefined,
      productId: selected.productId ?? undefined,
    };
    return true;
  }

  async open(options: { baudRate: number }): Promise<void> {
    const tauri = getTauri();
    const info = await tauri.core.invoke<NativePortInfo>('open_serial_port', {
      baudRate: options.baudRate,
    });
    this._portInfo = {
      name: info.name || info.path,
      vendorId: info.vendorId ?? undefined,
      productId: info.productId ?? undefined,
    };
    this._isConnected = true;

    this.unlistenData = await tauri.event.listen<number[]>('serial-data', (event) => {
      const bytes = Uint8Array.from(event.payload);
      if (bytes.length === 0) return;
      this.dataListeners.forEach((cb) => cb(bytes));
      const text = new TextDecoder().decode(bytes);
      this.callbacks.onData?.(text);
      this.lineBuffer.push(text);
    });

    this.unlistenClosed = await tauri.event.listen('serial-closed', () => {
      if (!this._isConnected) return;
      this._isConnected = false;
      this.teardownListeners();
      this.callbacks.onClose?.();
    });
  }

  async close(): Promise<void> {
    this._isConnected = false;
    this.teardownListeners();
    try {
      await getTauri().core.invoke('close_serial_port');
    } catch {
      /* ignore */
    }
    this.callbacks.onClose?.();
  }

  async write(data: string | Uint8Array): Promise<void> {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    await getTauri().core.invoke('write_serial', { data: Array.from(bytes) });
  }

  private teardownListeners(): void {
    this.unlistenData?.();
    this.unlistenClosed?.();
    this.unlistenData = undefined;
    this.unlistenClosed = undefined;
  }
}

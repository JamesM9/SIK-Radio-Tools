/**
 * USB serial transport via tauri-plugin-serialplugin.
 * Used on Android (USB OTG / Host) and available as an alternate desktop path.
 * Invokes plugin commands through window.__TAURI__ (no bundler required).
 */

import type { Transport, TransportCallbacks, SerialPortFilter } from './types.js';
import { LineBuffer } from '../protocol/line-buffer.js';
import { getTauri } from './platform.js';
import { pickSerialPort, type PickerPort } from '../ui/port-picker.js';

interface PluginPortInfo {
  path?: string;
  manufacturer?: string;
  product?: string;
  vid?: string;
  pid?: string;
  type?: string;
  serial_number?: string;
}

function parseHexId(value: string | undefined): number | undefined {
  if (!value || value === 'Unknown') return undefined;
  const cleaned = value.replace(/^0x/i, '');
  const n = Number.parseInt(cleaned, 16);
  return Number.isFinite(n) ? n : undefined;
}

function eventPathToken(path: string): string {
  return path.split('.').join('-').split('/').join('-');
}

export class PluginSerialTransport implements Transport {
  private callbacks: TransportCallbacks = {};
  private lineListeners: Set<(line: string) => void> = new Set();
  private dataListeners: Set<(data: Uint8Array) => void> = new Set();
  private lineBuffer: LineBuffer;
  private _isConnected = false;
  private _portInfo?: { name?: string; vendorId?: number; productId?: number };
  private selectedPath?: string;
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

  private async listPorts(): Promise<PickerPort[]> {
    const tauri = getTauri();
    const map = await tauri.core.invoke<Record<string, PluginPortInfo>>(
      'plugin:serialplugin|available_ports'
    );
    const ports: PickerPort[] = Object.entries(map || {}).map(([path, info]) => {
      const vendorId = parseHexId(info?.vid);
      const productId = parseHexId(info?.pid);
      const name =
        (info?.product && info.product !== 'Unknown' ? info.product : undefined) ||
        (info?.manufacturer && info.manufacturer !== 'Unknown' ? info.manufacturer : undefined) ||
        path;
      return { path: info?.path || path, name, vendorId, productId };
    });

    ports.sort((a, b) => {
      const aSik = a.vendorId === 0x0403 && a.productId === 0x6015;
      const bSik = b.vendorId === 0x0403 && b.productId === 0x6015;
      return Number(bSik) - Number(aSik) || a.path.localeCompare(b.path);
    });
    return ports;
  }

  async requestPort(_options?: { filters?: SerialPortFilter[] }): Promise<void> {
    for (;;) {
      const ports = await this.listPorts();
      try {
        const path = await pickSerialPort(ports);
        const selected = ports.find((p) => p.path === path);
        this.selectedPath = path;
        this._portInfo = {
          name: selected?.name || path,
          vendorId: selected?.vendorId ?? undefined,
          productId: selected?.productId ?? undefined,
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
    if (!this.selectedPath) return false;
    return true;
  }

  async open(options: { baudRate: number }): Promise<void> {
    if (!this.selectedPath) {
      throw new Error('No USB serial device selected');
    }
    const tauri = getTauri();
    const path = this.selectedPath;

    await tauri.core.invoke('plugin:serialplugin|open', {
      path,
      baudRate: options.baudRate,
      dataBits: 'Eight',
      flowControl: 'None',
      parity: 'None',
      stopBits: 'One',
      timeout: 1000,
    });

    await tauri.core.invoke('plugin:serialplugin|start_listening', {
      path,
      timeout: 1000,
      serialDataFlushIntervalMs: 50,
    });

    const token = eventPathToken(path);
    this.unlistenData = await tauri.event.listen<{ data: number[] }>(
      `plugin-serialplugin-read-${token}`,
      (event) => {
        const bytes = Uint8Array.from(event.payload?.data ?? []);
        if (bytes.length === 0) return;
        this.dataListeners.forEach((cb) => cb(bytes));
        const text = new TextDecoder().decode(bytes);
        this.callbacks.onData?.(text);
        this.lineBuffer.push(text);
      }
    );

    this.unlistenClosed = await tauri.event.listen(
      `plugin-serialplugin-disconnected-${token}`,
      () => {
        if (!this._isConnected) return;
        this._isConnected = false;
        this.teardownListeners();
        this.callbacks.onClose?.();
      }
    );

    this._isConnected = true;
  }

  async close(): Promise<void> {
    this._isConnected = false;
    this.teardownListeners();
    const path = this.selectedPath;
    if (path) {
      try {
        await getTauri().core.invoke('plugin:serialplugin|stop_listening', { path });
      } catch {
        /* ignore */
      }
      try {
        await getTauri().core.invoke('plugin:serialplugin|close', { path });
      } catch {
        /* ignore */
      }
    }
    this.callbacks.onClose?.();
  }

  async write(data: string | Uint8Array): Promise<void> {
    if (!this.selectedPath) {
      throw new Error('Serial port is not open');
    }
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    await getTauri().core.invoke('plugin:serialplugin|write_binary', {
      path: this.selectedPath,
      value: Array.from(bytes),
    });
  }

  private teardownListeners(): void {
    this.unlistenData?.();
    this.unlistenClosed?.();
    this.unlistenData = undefined;
    this.unlistenClosed = undefined;
  }
}

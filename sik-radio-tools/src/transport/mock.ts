/**
 * Mock transport for UI testing without hardware
 * Simulates SiK radio AT responses
 */

import type { Transport, TransportCallbacks } from './types.js';

const MOCK_ATI5 = `S0: FORMAT=22
S1: SERIAL_SPEED=57
S2: AIR_SPEED=64
S3: NETID=25
S4: TXPOWER=20
S5: ECC=0
S6: MAVLINK=1
S7: OPPRESEND=1
S8: MIN_FREQ=915000
S9: MAX_FREQ=928000
S10: NUM_CHANNELS=50
S11: DUTY_CYCLE=100
S12: LBT_RSSI=0
S13: MANCHESTER=0
S14: RTSCTS=0
S15: MAX_WINDOW=131
OK`;

export class MockTransport implements Transport {
  private callbacks: TransportCallbacks = {};
  private lineListeners: Set<(line: string) => void> = new Set();
  private dataListeners: Set<(data: Uint8Array) => void> = new Set();
  private _isConnected = false;
  private responseDelay = 50;

  get isConnected(): boolean {
    return this._isConnected;
  }

  get portInfo(): { name?: string } | undefined {
    return this._isConnected ? { name: 'Mock SiK Radio (Demo)' } : undefined;
  }

  setCallbacks(cb: TransportCallbacks): void {
    this.callbacks = cb;
  }

  addLineListener(cb: (line: string) => void): () => void {
    this.lineListeners.add(cb);
    return () => this.lineListeners.delete(cb);
  }

  addDataListener(cb: (data: Uint8Array) => void): () => void {
    this.dataListeners.add(cb);
    return () => this.dataListeners.delete(cb);
  }

  async requestPort(): Promise<void> {
    await this.simulateDelay();
    // Simulate success - no actual port
  }

  async reconnectKnownPort(): Promise<boolean> {
    await this.simulateDelay();
    return false;
  }

  async open(): Promise<void> {
    await this.simulateDelay();
    this._isConnected = true;
    this.callbacks.onClose = this.callbacks.onClose;
  }

  async close(): Promise<void> {
    await this.simulateDelay();
    this._isConnected = false;
    this.callbacks.onClose?.();
  }

  async write(data: string | Uint8Array): Promise<void> {
    const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
    await this.simulateDelay();

    // Echo back for terminal
    this.emitLines([str.trim()]);

    // Simulate AT responses
    const upper = str.trim().toUpperCase();
    if (upper === '+++') {
      this.emitLines(['OK']);
    } else if (upper === 'ATO') {
      this.emitLines(['OK']);
    } else if (upper === 'AT' || upper === 'ATI') {
      this.emitLines(['SiK radio v1.0 on 3DR Radio', 'OK']);
    } else if (upper === 'ATI5') {
      this.emitLines(MOCK_ATI5.split('\n'));
    } else if (/^ATS\d+\?$/.test(upper)) {
      this.emitLines(['57', 'OK']);
    } else if (/^ATS\d+=.+$/.test(upper)) {
      this.emitLines(['OK']);
    } else if (upper === 'AT&W') {
      this.emitLines(['OK']);
    } else if (upper === 'AT&F') {
      this.emitLines(['OK']);
    } else if (upper === 'ATZ') {
      this.emitLines(['OK']);
    } else if (upper.startsWith('AT')) {
      this.emitLines(['OK']);
    }
  }

  private emitLines(lines: string[]): void {
    for (const line of lines) {
      this.callbacks.onLine?.(line);
      this.lineListeners.forEach((cb) => cb(line));
      this.callbacks.onData?.(line + '\r\n');
      const bytes = new TextEncoder().encode(line + '\r\n');
      this.dataListeners.forEach((cb) => cb(bytes));
    }
  }

  private simulateDelay(): Promise<void> {
    return new Promise((r) => setTimeout(r, this.responseDelay));
  }
}

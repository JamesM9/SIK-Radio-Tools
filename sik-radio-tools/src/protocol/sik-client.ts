/**
 * SiK radio AT command client
 * Handles command mode, guard times, timeouts, and parameter read/write
 */

import type { Transport } from '../transport/types.js';
import { parseATResponse, parseATI5Response, type ATParseResult } from './at-parser.js';

const GUARD_MS = 1500;
const GUARD_MAX_WAIT_MS = 15000; // stop waiting after this; user may need to stop data flow
const CMD_TIMEOUT_MS = 5000;

export interface SiKClientCallbacks {
  onLog?: (msg: string) => void;
}

export class SiKRadioClient {
  private transport: Transport;
  private inCommandMode = false;
  private lastActivity = 0;
  private lastReceiveTime = 0;
  private responseQueue: Array<(result: ATParseResult) => void> = [];
  private pendingLines: string[] = [];
  private callbacks: SiKClientCallbacks = {};

  constructor(transport: Transport) {
    this.transport = transport;
    this.setupTransport();
  }

  setCallbacks(cb: SiKClientCallbacks): void {
    this.callbacks = cb;
  }

  private setupTransport(): void {
    this.transport.setCallbacks({
      onData: () => {
        this.lastReceiveTime = Date.now();
      },
      onLine: (line) => this.handleLine(line),
    });
  }

  private handleLine(line: string): void {
    const t = line.trim();
    if (t.length === 0) return;

    this.lastReceiveTime = Date.now();
    this.pendingLines.push(t);

    if (/^OK\s*$/i.test(t) || /^ERROR\s*$/i.test(t)) {
      const result = parseATResponse(this.pendingLines);
      this.pendingLines = [];
      const resolve = this.responseQueue.shift();
      if (resolve) resolve(result);
    }
  }

  private async waitForResponse(): Promise<ATParseResult> {
    return new Promise((resolve, reject) => {
      const resolver = (result: ATParseResult): void => {
        clearTimeout(timeout);
        resolve(result);
      };

      const timeout = setTimeout(() => {
        const idx = this.responseQueue.indexOf(resolver);
        if (idx !== -1) {
          this.responseQueue.splice(idx, 1);
          reject(new Error('AT command timeout — radio did not respond'));
        }
      }, CMD_TIMEOUT_MS);

      this.responseQueue.push(resolver);
    });
  }

  /** Wait until 1.5s of no incoming data and 1.5s since our last send so the radio will recognize +++. */
  private async ensureGuardTime(): Promise<void> {
    const deadline = Date.now() + GUARD_MAX_WAIT_MS;
    while (Date.now() < deadline) {
      const now = Date.now();
      const sinceReceive = now - this.lastReceiveTime;
      const sinceSend = now - this.lastActivity;
      if (sinceReceive >= GUARD_MS && sinceSend >= GUARD_MS) {
        this.lastActivity = Date.now();
        return;
      }
      const needReceive = Math.max(0, GUARD_MS - sinceReceive);
      const needSend = Math.max(0, GUARD_MS - sinceSend);
      const waitMs = Math.min(Math.max(needReceive, needSend), deadline - Date.now());
      if (waitMs > 0) {
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
    throw new Error(
      'No line silence — stop data flow (disconnect other radio or autopilot) and try again'
    );
  }

  /** If radio is in command mode, exit to passthrough (ATO). Then +++ will be recognized. */
  private async ensurePassthrough(): Promise<void> {
    this.pendingLines = [];
    let resolveExit!: (r: ATParseResult) => void;
    const exitPromise = new Promise<ATParseResult>((r) => { resolveExit = r; });
    const resolver = (result: ATParseResult): void => { resolveExit(result); };
    this.responseQueue.push(resolver);

    await this.transport.write('ATO\r\n');
    this.lastActivity = Date.now();

    const EXIT_TIMEOUT_MS = 1500;
    setTimeout(() => {
      const idx = this.responseQueue.indexOf(resolver);
      if (idx !== -1) {
        this.responseQueue.splice(idx, 1);
        resolveExit({ ok: false, lines: [] });
      }
    }, EXIT_TIMEOUT_MS);

    const exitResult = await exitPromise;
    if (exitResult.ok) {
      this.inCommandMode = false;
    }
    this.pendingLines = [];
  }

  async enterCommandMode(): Promise<boolean> {
    await this.ensurePassthrough();
    await this.ensureGuardTime();
    await this.transport.write('+++');
    this.lastActivity = Date.now();
    const result = await this.waitForResponse();
    this.inCommandMode = result.ok;
    return result.ok;
  }

  async exitCommandMode(): Promise<boolean> {
    const result = await this.sendAT('O');
    this.inCommandMode = !result.ok;
    return result.ok;
  }

  async sendAT(cmd: string): Promise<ATParseResult> {
    this.pendingLines = [];
    const fullCmd = cmd.startsWith('AT') ? cmd : `AT${cmd}`;
    this.callbacks.onLog?.(`TX: ${fullCmd}`);
    await this.transport.write(fullCmd + '\r\n');
    return this.waitForResponse();
  }

  async getVersion(): Promise<string> {
    const result = await this.sendAT('I');
    return result.lines[0] ?? 'Unknown';
  }

  async readAllParameters(): Promise<Record<string, string | number>> {
    const lines = await this.readATI5Lines();
    const params = parseATI5Response(lines);
    if (Object.keys(params).length === 0) {
      throw new Error('Failed to parse ATI5 response');
    }
    return params;
  }

  /**
   * ATI5 on some SiK firmwares does not end with OK/ERROR, so we cannot rely on waitForResponse().
   * Capture raw lines until a short quiet period after receiving S-register lines.
   */
  private async readATI5Lines(): Promise<string[]> {
    if (!this.transport.addLineListener) {
      // Fallback for transports without extra line listener support
      const result = await this.sendAT('I5');
      return result.lines;
    }

    const lines: string[] = [];
    let sawRegisterLine = false;
    let lastLineAt = 0;
    const QUIET_MS = 250;
    const MAX_MS = 5000;
    const start = Date.now();

    const unsubscribe = this.transport.addLineListener((line) => {
      const t = line.trim();
      if (!t) return;
      lines.push(t);
      lastLineAt = Date.now();
      if (/^S\d+[:=]/.test(t)) {
        sawRegisterLine = true;
      }
    });

    try {
      this.callbacks.onLog?.('TX: ATI5');
      await this.transport.write('ATI5\r\n');
      this.lastActivity = Date.now();

      while (Date.now() - start < MAX_MS) {
        if (sawRegisterLine && Date.now() - lastLineAt >= QUIET_MS) {
          break;
        }
        await new Promise((r) => setTimeout(r, 50));
      }
    } finally {
      unsubscribe();
    }

    return lines;
  }

  async readParameter(register: string): Promise<string | number | null> {
    const result = await this.sendAT(`${register}?`);
    if (!result.ok) return null;
    const line = result.lines.find((l) => !/^OK|^ERROR/i.test(l));
    if (!line) return null;
    const num = parseInt(line, 10);
    return isNaN(num) ? line : num;
  }

  async writeParameter(register: string, value: number | string): Promise<boolean> {
    const result = await this.sendAT(`${register}=${value}`);
    return result.ok;
  }

  async saveParameters(): Promise<boolean> {
    const result = await this.sendAT('&W');
    return result.ok;
  }

  async reboot(): Promise<boolean> {
    // ATZ performs an immediate software reset on many SiK firmwares and may not return OK.
    await this.transport.write('ATZ\r\n');
    this.lastActivity = Date.now();
    this.inCommandMode = false;
    return true;
  }

  async resetDefaults(): Promise<boolean> {
    const result = await this.sendAT('&F');
    return result.ok;
  }

  /** Send RT command to remote radio if link is active */
  async getRemoteParametersIfAvailable(): Promise<Record<string, string | number> | null> {
    const result = await this.sendAT('RTI5');
    if (!result.ok || !result.params) return null;
    return result.params;
  }

  get inCommandModeState(): boolean {
    return this.inCommandMode;
  }
}

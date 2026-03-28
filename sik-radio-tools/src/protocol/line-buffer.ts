/**
 * Line buffer - accumulates incoming bytes and emits complete lines
 */

export interface LineBufferCallbacks {
  onLine: (line: string) => void;
}

export class LineBuffer {
  private buffer = '';
  private callbacks: LineBufferCallbacks;
  private lineEndings: RegExp = /\r\n|\r|\n/;

  constructor(callbacks: LineBufferCallbacks) {
    this.callbacks = callbacks;
  }

  /** Push raw data; emits complete lines */
  push(data: string): void {
    this.buffer += data;
    this.flushLines();
  }

  /** Push raw bytes (UTF-8 decoded) */
  pushBytes(bytes: Uint8Array): void {
    this.push(new TextDecoder().decode(bytes));
  }

  private flushLines(): void {
    const parts = this.buffer.split(this.lineEndings);
    this.buffer = parts.pop() ?? '';
    for (const line of parts) {
      this.callbacks.onLine(line);
    }
  }

  /** Flush any remaining buffered content as a final line */
  flush(): void {
    if (this.buffer.trim().length > 0) {
      this.callbacks.onLine(this.buffer);
      this.buffer = '';
    }
  }

  /** Clear the buffer without emitting */
  clear(): void {
    this.buffer = '';
  }
}

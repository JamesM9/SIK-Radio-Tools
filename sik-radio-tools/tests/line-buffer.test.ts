/**
 * Unit tests for line buffer
 */

import { describe, it, expect } from 'vitest';
import { LineBuffer } from '../src/protocol/line-buffer.js';

describe('LineBuffer', () => {
  it('emits complete lines', () => {
    const lines: string[] = [];
    const buf = new LineBuffer({ onLine: (l) => lines.push(l) });

    buf.push('hello\r\n');
    expect(lines).toEqual(['hello']);

    buf.push('world\n');
    expect(lines).toEqual(['hello', 'world']);
  });

  it('buffers incomplete lines', () => {
    const lines: string[] = [];
    const buf = new LineBuffer({ onLine: (l) => lines.push(l) });

    buf.push('hello');
    expect(lines).toEqual([]);

    buf.push(' world\r\n');
    expect(lines).toEqual(['hello world']);
  });

  it('handles multiple line endings', () => {
    const lines: string[] = [];
    const buf = new LineBuffer({ onLine: (l) => lines.push(l) });

    buf.push('a\r\nb\nc\r\nd');
    expect(lines).toEqual(['a', 'b', 'c']);
    expect(lines.length).toBe(3);

    buf.flush();
    expect(lines).toEqual(['a', 'b', 'c', 'd']);
  });
});

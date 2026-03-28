/**
 * Unit tests for parameter mapping
 */

import { describe, it, expect } from 'vitest';
import {
  getDefaultParams,
  sanitizeParams,
  diffParams,
  ati5ToParams,
} from '../src/params/mapper.js';

describe('params', () => {
  describe('getDefaultParams', () => {
    it('returns defaults for all schema params', () => {
      const def = getDefaultParams();
      expect(def.SERIAL_SPEED).toBe(57);
      expect(def.AIR_SPEED).toBe(64);
      expect(def.NETID).toBe(25);
    });
  });

  describe('sanitizeParams', () => {
    it('filters to known keys only', () => {
      const input = { SERIAL_SPEED: 115, UNKNOWN: 99 };
      const out = sanitizeParams(input);
      expect(out.SERIAL_SPEED).toBe(115);
      expect(out.UNKNOWN).toBeUndefined();
    });

    it('validates and coerces', () => {
      const input = { SERIAL_SPEED: 57, NETID: 100 };
      const out = sanitizeParams(input);
      expect(out.NETID).toBe(100);
    });
  });

  describe('diffParams', () => {
    it('returns only changed params', () => {
      const current = { A: 1, B: 2 };
      const next = { A: 1, B: 3 };
      expect(diffParams(current, next)).toEqual({ B: 3 });
    });
  });

  describe('ati5ToParams', () => {
    it('converts ATI5 output to params', () => {
      const ati5 = { SERIAL_SPEED: 57, AIR_SPEED: 64 };
      const out = ati5ToParams(ati5);
      expect(out.SERIAL_SPEED).toBe(57);
      expect(out.AIR_SPEED).toBe(64);
    });
  });
});

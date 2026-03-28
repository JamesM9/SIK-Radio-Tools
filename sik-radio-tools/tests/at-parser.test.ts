/**
 * Unit tests for AT response parsing
 */

import { describe, it, expect } from 'vitest';
import {
  parseATI5Response,
  parseATResponse,
  parseATSResponse,
  isOK,
  isError,
} from '../src/protocol/at-parser.js';

describe('at-parser', () => {
  describe('parseATI5Response', () => {
    it('parses S-register format', () => {
      const lines = [
        'S0: FORMAT=22',
        'S1: SERIAL_SPEED=57',
        'S2: AIR_SPEED=64',
      ];
      const result = parseATI5Response(lines);
      expect(result.FORMAT).toBe(22);
      expect(result.SERIAL_SPEED).toBe(57);
      expect(result.AIR_SPEED).toBe(64);
    });

    it('handles string values', () => {
      const lines = ['S0: FORMAT=22', 'S1: BOARD=Radio'];
      const result = parseATI5Response(lines);
      expect(result.FORMAT).toBe(22);
      expect(result.BOARD).toBe('Radio');
    });
  });

  describe('parseATResponse', () => {
    it('returns ok for OK response', () => {
      const result = parseATResponse(['OK']);
      expect(result.ok).toBe(true);
      expect(result.lines).toEqual([]);
    });

    it('returns not ok for ERROR', () => {
      const result = parseATResponse(['ERROR']);
      expect(result.ok).toBe(false);
    });

    it('parses ATI5 style with params', () => {
      const lines = ['S1: SERIAL_SPEED=57', 'S2: AIR_SPEED=64', 'OK'];
      const result = parseATResponse(lines);
      expect(result.ok).toBe(true);
      expect(result.params?.SERIAL_SPEED).toBe(57);
      expect(result.params?.AIR_SPEED).toBe(64);
    });
  });

  describe('parseATSResponse', () => {
    it('returns numeric value', () => {
      const result = parseATSResponse(['57', 'OK']);
      expect(result).toBe(57);
    });

    it('returns string value', () => {
      const result = parseATSResponse(['Radio', 'OK']);
      expect(result).toBe('Radio');
    });
  });

  describe('isOK/isError', () => {
    it('isOK matches', () => {
      expect(isOK('OK')).toBe(true);
      expect(isOK('OK  ')).toBe(true);
      expect(isOK('ok')).toBe(true);
      expect(isOK('ERROR')).toBe(false);
    });

    it('isError matches', () => {
      expect(isError('ERROR')).toBe(true);
      expect(isError('error')).toBe(true);
      expect(isError('OK')).toBe(false);
    });
  });
});

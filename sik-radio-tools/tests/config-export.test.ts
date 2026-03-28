/**
 * Unit tests for config import/export
 */

import { describe, it, expect } from 'vitest';
import { getDefaultParams } from '../src/params/mapper.js';
import { sanitizeParams } from '../src/params/mapper.js';
import { exportProfileToJSON, importProfileFromJSON } from '../src/persistence/profiles.js';

describe('config export/import', () => {
  it('export produces valid JSON', () => {
    const profile = {
      id: 'test-id',
      name: 'Test',
      createdAt: Date.now(),
      params: getDefaultParams(),
    };
    const json = exportProfileToJSON(profile);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('Test');
    expect(parsed.params).toBeDefined();
    expect(parsed.params.SERIAL_SPEED).toBe(57);
  });

  it('import parses valid profile', () => {
    const json = JSON.stringify({
      name: 'Imported',
      params: { SERIAL_SPEED: 115, NETID: 42 },
    });
    const { name, params } = importProfileFromJSON(json);
    expect(name).toBe('Imported');
    expect(params.SERIAL_SPEED).toBe(115);
    expect(params.NETID).toBe(42);
  });

  it('import throws on invalid', () => {
    expect(() => importProfileFromJSON('{}')).toThrow();
    expect(() => importProfileFromJSON('{"params": null}')).toThrow();
  });
});

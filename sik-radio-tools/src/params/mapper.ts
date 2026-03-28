/**
 * Parameter mapping, validation, and config import/export
 */

import { SIK_PARAM_SCHEMA, type ParamDef } from './schema.js';

export type ParamValues = Record<string, number | string>;

function coerceEnumValue(def: ParamDef, value: number | string): number | string {
  const opts = def.options ?? [];
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const asNum = parseInt(value, 10);
    if (opts.some((o) => o.value === asNum)) {
      return asNum;
    }
  }
  return value;
}

/** Validate a value against param definition */
export function validateParam(def: ParamDef, value: number | string): boolean {
  if (def.type === 'enum') {
    const opts = def.options ?? [];
    const normalized = coerceEnumValue(def, value);
    return opts.some((o) => o.value === normalized);
  }
  if (def.type === 'number') {
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(n)) return false;
    if (def.min !== undefined && n < def.min) return false;
    if (def.max !== undefined && n > def.max) return false;
    return true;
  }
  return true;
}

/** Coerce value to correct type for param */
export function coerceParam(def: ParamDef, value: number | string): number | string {
  if (def.type === 'enum') {
    return coerceEnumValue(def, value);
  }
  if (def.type === 'number') {
    if (typeof value === 'number') return value;
    const n = parseFloat(String(value));
    return isNaN(n) ? def.default as number : n;
  }
  return String(value);
}

/** Get default values for all params */
export function getDefaultParams(): ParamValues {
  const out: ParamValues = {};
  for (const def of SIK_PARAM_SCHEMA) {
    out[def.key] = def.default;
  }
  return out;
}

/** Filter params to only known schema keys, with validation */
export function sanitizeParams(input: ParamValues): ParamValues {
  const out: ParamValues = {};
  for (const def of SIK_PARAM_SCHEMA) {
    const v = input[def.key];
    if (v === undefined) continue;
    if (validateParam(def, v)) {
      out[def.key] = coerceParam(def, v);
    }
  }
  return out;
}

/** Convert ATI5 params (from radio) to our schema keys */
export function ati5ToParams(ati5: Record<string, string | number>): ParamValues {
  const out: ParamValues = {};
  const ati5Upper: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(ati5)) {
    ati5Upper[k.toUpperCase()] = v;
  }
  for (const def of SIK_PARAM_SCHEMA) {
    const v =
      ati5[def.key] ??
      ati5Upper[def.key] ??
      (def.register ? ati5[def.register] : undefined);
    if (v !== undefined) {
      out[def.key] = coerceParam(def, v);
    }
  }
  return out;
}

/** Compute diff between current and new params */
export function diffParams(current: ParamValues, next: ParamValues): ParamValues {
  const out: ParamValues = {};
  for (const key of Object.keys(next)) {
    if (current[key] !== next[key]) {
      out[key] = next[key];
    }
  }
  return out;
}

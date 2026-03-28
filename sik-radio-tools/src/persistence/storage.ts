/**
 * Settings and profiles persisted in localStorage
 */

import type { AppSettings } from '../types.js';

const KEYS = {
  SETTINGS: 'app_settings',
  PROFILES: 'profiles',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  baudRate: 57600,
  darkMode: true,
};

function readLocalStorageJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalStorageJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function getSettings(): Promise<AppSettings> {
  const stored = readLocalStorageJson<Partial<AppSettings> | null>(KEYS.SETTINGS, null);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  writeLocalStorageJson(KEYS.SETTINGS, { ...current, ...settings });
}

export async function getProfiles(): Promise<RadioProfile[]> {
  const list = readLocalStorageJson<RadioProfile[] | null>(KEYS.PROFILES, null);
  return Array.isArray(list) ? list : [];
}

export async function saveProfiles(profiles: RadioProfile[]): Promise<void> {
  writeLocalStorageJson(KEYS.PROFILES, profiles);
}

export interface RadioProfile {
  id: string;
  name: string;
  createdAt: number;
  params: Record<string, number | string>;
}

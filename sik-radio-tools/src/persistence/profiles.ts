/**
 * Profile management - save, load, compare
 */

import { getProfiles, saveProfiles, type RadioProfile } from './storage.js';
import { sanitizeParams, diffParams, type ParamValues } from '../params/mapper.js';

export async function listProfiles(): Promise<RadioProfile[]> {
  return getProfiles();
}

export async function saveProfile(name: string, params: ParamValues): Promise<RadioProfile> {
  const profiles = await getProfiles();
  const profile: RadioProfile = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    params: sanitizeParams(params),
  };
  profiles.push(profile);
  await saveProfiles(profiles);
  return profile;
}

export async function deleteProfile(id: string): Promise<void> {
  const profiles = await getProfiles().then((p) => p.filter((x) => x.id !== id));
  await saveProfiles(profiles);
}

export async function loadProfile(id: string): Promise<ParamValues | null> {
  const profiles = await getProfiles();
  const p = profiles.find((x) => x.id === id);
  return p ? { ...p.params } : null;
}

export function compareProfile(profile: ParamValues, current: ParamValues): ParamValues {
  return diffParams(current, profile);
}

export function exportProfileToJSON(profile: RadioProfile): string {
  return JSON.stringify(
    {
      name: profile.name,
      createdAt: new Date(profile.createdAt).toISOString(),
      params: profile.params,
    },
    null,
    2
  );
}

export function importProfileFromJSON(json: string): { name: string; params: ParamValues } {
  const data = JSON.parse(json);
  if (!data.params || typeof data.params !== 'object') {
    throw new Error('Invalid profile JSON: missing params');
  }
  return {
    name: data.name ?? 'Imported',
    params: data.params,
  };
}

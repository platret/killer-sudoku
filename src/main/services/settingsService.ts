import { getSetting, setSetting } from '@main/db/queries';
import type { SettingGet, SettingSet } from '@shared/types';

export function get(key: string, userId?: number): SettingGet {
  const value = getSetting(key, userId);
  return { value };
}

export function set(key: string, value: string, userId?: number): SettingSet {
  setSetting(key, value, userId);
  return { success: true };
}

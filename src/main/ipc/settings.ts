import { ipcMain } from 'electron';
import * as settingsService from '../services/settingsService';
import type { ClearProgressResult, SettingGet, SettingSet } from '@shared/types';

export function registerSettingsIpc(): void {
  ipcMain.handle(
    'settings:get',
    async (_e, input: { key: string; userId?: number }): Promise<SettingGet> => {
      try {
        return settingsService.get(input.key, input.userId);
      } catch {
        return { value: null };
      }
    }
  );

  ipcMain.handle(
    'settings:set',
    async (_e, input: { key: string; value: string; userId?: number }): Promise<SettingSet> => {
      try {
        return settingsService.set(input.key, input.value, input.userId);
      } catch {
        return { success: false };
      }
    }
  );

  ipcMain.handle(
    'settings:clearProgress',
    async (_e, input: { userId: number }): Promise<ClearProgressResult> => {
      try {
        return settingsService.clearProgress(input.userId);
      } catch {
        return { success: false, cleared: 0 };
      }
    }
  );
}

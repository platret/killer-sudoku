import { ipcMain } from 'electron';
import * as authService from '../services/authService';
import type { AuthResult } from '@shared/types';

let currentUserId: number | null = null;

export function getCurrentUserId(): number | null {
  return currentUserId;
}

export function registerAuthIpc(): void {
  ipcMain.handle('auth:register', async (_e, input: { username: string; password: string }): Promise<AuthResult> => {
    try {
      const res = await authService.register(input.username, input.password);
      if (res.success && res.user) currentUserId = res.user.id;
      return res;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Register failed' };
    }
  });

  ipcMain.handle('auth:login', async (_e, input: { username: string; password: string }): Promise<AuthResult> => {
    try {
      const res = await authService.login(input.username, input.password);
      if (res.success && res.user) currentUserId = res.user.id;
      return res;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Login failed' };
    }
  });

  ipcMain.handle('auth:logout', async (): Promise<{ success: boolean }> => {
    currentUserId = null;
    return { success: true };
  });
}

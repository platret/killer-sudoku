import type { ElectronAPI } from '@shared/types';

export function hasApi(): boolean {
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';
}

export function safeApi(): ElectronAPI | null {
  if (!hasApi()) return null;
  return window.electronAPI;
}

export const api = (): ElectronAPI => {
  if (!hasApi()) {
    throw new Error('window.electronAPI is unavailable — preload bridge did not load');
  }
  return window.electronAPI;
};

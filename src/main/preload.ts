import { contextBridge, ipcRenderer } from 'electron';
import type { DbStatus, ElectronAPI } from '@shared/types';

const api: ElectronAPI = {
  auth: {
    register: (input) => ipcRenderer.invoke('auth:register', input),
    login: (input) => ipcRenderer.invoke('auth:login', input),
    logout: () => ipcRenderer.invoke('auth:logout')
  },
  puzzle: {
    validate: (input) => ipcRenderer.invoke('puzzle:validate', input),
    create: (input) => ipcRenderer.invoke('puzzle:create', input),
    list: (input) => ipcRenderer.invoke('puzzle:list', input ?? {}),
    get: (input) => ipcRenderer.invoke('puzzle:get', input),
    delete: (input) => ipcRenderer.invoke('puzzle:delete', input),
    generate: (input) => ipcRenderer.invoke('puzzle:generate', input)
  },
  solver: {
    solve: (input) => ipcRenderer.invoke('solver:solve', input),
    hint: (input) => ipcRenderer.invoke('solver:hint', input),
    check: (input) => ipcRenderer.invoke('solver:check', input)
  },
  result: {
    save: (input) => ipcRenderer.invoke('result:save', input),
    highscores: (input) => ipcRenderer.invoke('result:highscores', input ?? {}),
    stats: (input) => ipcRenderer.invoke('result:stats', input),
    export: (input) => ipcRenderer.invoke('result:export', input)
  },
  settings: {
    get: (input) => ipcRenderer.invoke('settings:get', input),
    set: (input) => ipcRenderer.invoke('settings:set', input)
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },
  file: {
    save: (input) => ipcRenderer.invoke('file:save', input)
  },
  db: {
    status: () => ipcRenderer.invoke('db:status'),
    onStatus: (cb) => {
      const listener = (_e: Electron.IpcRendererEvent, status: DbStatus): void => cb(status);
      ipcRenderer.on('db:status', listener);
      return () => ipcRenderer.removeListener('db:status', listener);
    }
  }
};

contextBridge.exposeInMainWorld('electronAPI', api);

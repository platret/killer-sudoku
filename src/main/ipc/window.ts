import { BrowserWindow, ipcMain } from 'electron';

export function registerWindowIpc(getWin: () => BrowserWindow | null): void {
  ipcMain.on('window:minimize', () => {
    getWin()?.minimize();
  });
  ipcMain.on('window:maximize', () => {
    const w = getWin();
    if (!w) return;
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
  });
  ipcMain.on('window:close', () => {
    getWin()?.close();
  });
}

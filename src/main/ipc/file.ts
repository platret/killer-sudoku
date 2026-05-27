import { BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'node:fs';
import type { ExportResult } from '@shared/types';

export function registerFileIpc(): void {
  ipcMain.handle(
    'file:save',
    async (
      _e,
      input: {
        dataBase64: string;
        defaultName: string;
        filters: Array<{ name: string; extensions: string[] }>;
      }
    ): Promise<ExportResult> => {
      try {
        const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
        if (!win) return { success: false, error: 'No window available' };
        const dlg = await dialog.showSaveDialog(win, {
          title: 'Save file',
          defaultPath: input.defaultName,
          filters: input.filters
        });
        if (dlg.canceled || !dlg.filePath) return { success: false, error: 'Cancelled' };
        const buf = Buffer.from(input.dataBase64, 'base64');
        fs.writeFileSync(dlg.filePath, buf);
        return { success: true, path: dlg.filePath };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Save failed' };
      }
    }
  );
}

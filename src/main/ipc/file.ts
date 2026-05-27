import { BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
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
      console.log(
        `[file:save] request defaultName=${input?.defaultName} bytes=${input?.dataBase64?.length ?? 0}`
      );
      try {
        if (!input || typeof input.dataBase64 !== 'string' || input.dataBase64.length === 0) {
          return { success: false, error: 'No data to save' };
        }
        const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
        if (!win) return { success: false, error: 'No window available' };
        const dlg = await dialog.showSaveDialog(win, {
          title: 'Save file',
          defaultPath: input.defaultName,
          filters: input.filters
        });
        if (dlg.canceled || !dlg.filePath) return { success: false, error: 'Cancelled' };
        const dir = path.dirname(dlg.filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const buf = Buffer.from(input.dataBase64, 'base64');
        fs.writeFileSync(dlg.filePath, buf);
        console.log(`[file:save] wrote ${buf.length} bytes to ${dlg.filePath}`);
        return { success: true, path: dlg.filePath };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Save failed';
        console.error('[file:save] failed:', err);
        return { success: false, error: message };
      }
    }
  );
}

import { BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'node:fs';
import * as resultService from '../services/resultService';
import * as statsService from '../services/statsService';
import { listHighscores } from '../db/queries';
import type {
  BestForPuzzle,
  ExportResult,
  HighscoreList,
  SaveResult,
  SolveHistory,
  StreakInfo,
  UserStats
} from '@shared/types';

function csvEscape(value: string | number | null): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function registerResultIpc(): void {
  ipcMain.handle(
    'result:save',
    async (
      _e,
      input: { userId: number; puzzleId: number; timeSeconds: number; hintsUsed: number }
    ): Promise<SaveResult> => {
      try {
        return resultService.save(input);
      } catch {
        return { success: false, score: 0 };
      }
    }
  );

  ipcMain.handle(
    'result:highscores',
    async (_e, input?: { puzzleId?: number }): Promise<HighscoreList> => {
      try {
        return resultService.highscores(input?.puzzleId);
      } catch {
        return { entries: [] };
      }
    }
  );

  ipcMain.handle(
    'result:stats',
    async (_e, input: { userId: number }): Promise<UserStats> => {
      try {
        return statsService.stats(input.userId);
      } catch {
        return {
          totalSolved: 0,
          bestTimeSeconds: null,
          avgTimeSeconds: null,
          bestScore: null,
          totalHints: 0,
          byDifficulty: [
            { difficulty: 1, solved: 0, bestTimeSeconds: null, avgTimeSeconds: null },
            { difficulty: 2, solved: 0, bestTimeSeconds: null, avgTimeSeconds: null },
            { difficulty: 3, solved: 0, bestTimeSeconds: null, avgTimeSeconds: null }
          ]
        };
      }
    }
  );

  ipcMain.handle(
    'result:bestForPuzzle',
    async (
      _e,
      input: { userId: number; puzzleId: number }
    ): Promise<{ best: BestForPuzzle | null }> => {
      try {
        return resultService.bestForPuzzle(input.userId, input.puzzleId);
      } catch {
        return { best: null };
      }
    }
  );

  ipcMain.handle(
    'result:streak',
    async (_e, input: { userId: number }): Promise<StreakInfo> => {
      try {
        return resultService.streak(input.userId);
      } catch {
        return { solvedToday: 0, currentStreak: 0, longestStreak: 0 };
      }
    }
  );

  ipcMain.handle(
    'result:history',
    async (
      _e,
      input: { userId: number; limit?: number }
    ): Promise<SolveHistory> => {
      try {
        return resultService.history(input.userId, input.limit);
      } catch {
        return { entries: [] };
      }
    }
  );

  ipcMain.handle(
    'result:export',
    async (
      _e,
      input: { format: 'csv' | 'json'; puzzleId?: number }
    ): Promise<ExportResult> => {
      try {
        const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
        if (!win) return { success: false, error: 'No window available' };
        const defaultName = `highscores-${Date.now()}.${input.format}`;
        const dlg = await dialog.showSaveDialog(win, {
          title: 'Export highscores',
          defaultPath: defaultName,
          filters:
            input.format === 'csv'
              ? [{ name: 'CSV', extensions: ['csv'] }]
              : [{ name: 'JSON', extensions: ['json'] }]
        });
        if (dlg.canceled || !dlg.filePath) return { success: false, error: 'Cancelled' };

        const entries = listHighscores(input.puzzleId);

        let body: string;
        if (input.format === 'csv') {
          const header = 'username,time_seconds,hints_used,score,completed_at';
          const rows = entries.map((e) =>
            [e.username, e.timeSeconds, e.hintsUsed, e.score, e.completedAt]
              .map(csvEscape)
              .join(',')
          );
          body = [header, ...rows].join('\n');
        } else {
          body = JSON.stringify(entries, null, 2);
        }

        fs.writeFileSync(dlg.filePath, body, 'utf-8');
        return { success: true, path: dlg.filePath };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Export failed' };
      }
    }
  );
}

import { insertResult, listHighscores } from '@main/db/queries';
import { scoreOf } from './solverService';
import type { HighscoreList, SaveResult } from '@shared/types';

export function save(input: {
  userId: number;
  puzzleId: number;
  timeSeconds: number;
  hintsUsed: number;
}): SaveResult {
  const t = Math.max(0, Math.floor(input.timeSeconds));
  const h = Math.max(0, Math.floor(input.hintsUsed));
  const score = scoreOf(t, h);
  insertResult(input.userId, input.puzzleId, t, h, score);
  return { success: true, score };
}

export function highscores(puzzleId?: number): HighscoreList {
  const entries = listHighscores(puzzleId);
  return { entries };
}

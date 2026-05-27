import { many, one } from '@main/db/index';
import {
  getBestForUserPuzzle,
  getCompletionDays,
  getResultHistory,
  insertResult,
  listHighscores,
  updateUserXp
} from '@main/db/queries';
import { scoreOf } from './solverService';
import type {
  BestForPuzzle,
  Difficulty,
  HighscoreList,
  SaveResult,
  SolveHistory,
  StreakInfo
} from '@shared/types';

export function save(input: {
  userId: number;
  puzzleId: number;
  timeSeconds: number;
  hintsUsed: number;
}): SaveResult {
  const t = Math.max(0, Math.floor(input.timeSeconds));
  const h = Math.max(0, Math.floor(input.hintsUsed));
  const row = one<{ difficulty: number }>(
    'SELECT difficulty FROM puzzles WHERE id = ?',
    [input.puzzleId]
  );
  const difficulty = (row?.difficulty === 1 || row?.difficulty === 3 ? row.difficulty : 2) as Difficulty;
  const baseScore = scoreOf(t, h, difficulty);

  // Calculate streak multiplier
  const s = streak(input.userId);
  let multiplier = 1.0;
  if (s.currentStreak >= 30) multiplier = 2.0;
  else if (s.currentStreak >= 7) multiplier = 1.5;
  else if (s.currentStreak >= 3) multiplier = 1.25;

  const finalScore = Math.floor(baseScore * multiplier);
  const xpGained = Math.floor(finalScore / 10);

  insertResult(input.userId, input.puzzleId, t, h, finalScore, multiplier, xpGained);

  // Update user XP and level
  const user = one<{ xp: number; level: number }>('SELECT xp, level FROM users WHERE id = ?', [input.userId]);
  if (user) {
    const totalXp = user.xp + xpGained;
    const newLevel = Math.floor(Math.sqrt(totalXp / 100)) + 1;
    updateUserXp(input.userId, xpGained, newLevel);
  }

  return { success: true, score: finalScore };
}

export function highscores(puzzleId?: number): HighscoreList {
  const entries = listHighscores(puzzleId);
  return { entries };
}

export function bestForPuzzle(
  userId: number,
  puzzleId: number
): { best: BestForPuzzle | null } {
  const row = getBestForUserPuzzle(userId, puzzleId);
  if (!row) return { best: null };
  return {
    best: {
      timeSeconds: row.time_seconds,
      hintsUsed: row.hints_used,
      score: row.score,
      completedAt: row.completed_at
    }
  };
}

function todayLocalString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function previousDay(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function streak(userId: number): StreakInfo {
  const days = getCompletionDays(userId);
  const today = todayLocalString();
  const set = new Set(days);

  let current = 0;
  let cursor = today;
  // Current streak starts at today (or yesterday if today not solved yet).
  if (!set.has(cursor)) cursor = previousDay(cursor);
  while (set.has(cursor)) {
    current += 1;
    cursor = previousDay(cursor);
  }

  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  // Days are already DESC. Walk and count contiguous chains.
  const sortedAsc = [...days].sort();
  for (const d of sortedAsc) {
    if (prev !== null && previousDay(d) === prev) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = d;
  }

  // Today-only count: hit the DB through queries? simpler: re-derive from days set membership of today
  // plus a count of solves today. Use a focused query:
  let solvedToday = 0;
  if (set.has(today)) {
    // We don't have raw rows; cheap approach is a tiny count query embedded here:
    // but to avoid an extra round-trip we use days.filter (which lists distinct days).
    // Actual solve count requires a count query — do that lazily:
    solvedToday = countResultsOnDay(userId, today);
  }

  return {
    solvedToday,
    currentStreak: current,
    longestStreak: longest
  };
}

export function history(userId: number, limit = 30): SolveHistory {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));
  const rows = getResultHistory(userId, safeLimit);
  return {
    entries: rows
      .map((r) => ({
        completedAt: r.completed_at,
        timeSeconds: r.time_seconds,
        hintsUsed: r.hints_used,
        score: r.score,
        difficulty: r.difficulty as Difficulty,
        puzzleName: r.puzzle_name
      }))
      .reverse()
  };
}

function countResultsOnDay(userId: number, ymd: string): number {
  const rows = many<{ n: number }>(
    `SELECT COUNT(*) AS n
     FROM results
     WHERE user_id = ? AND date(completed_at, 'localtime') = ?`,
    [userId, ymd]
  );
  return rows[0]?.n ?? 0;
}

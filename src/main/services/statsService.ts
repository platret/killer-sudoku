import { getUserStats } from '@main/db/queries';
import type { Difficulty, UserStats } from '@shared/types';

export function stats(userId: number): UserStats {
  const { totals, byDifficulty } = getUserStats(userId);
  const map = new Map<number, (typeof byDifficulty)[number]>();
  for (const row of byDifficulty) map.set(row.difficulty, row);
  return {
    totalSolved: Number(totals.total_solved ?? 0),
    bestTimeSeconds: totals.best_time === null ? null : Number(totals.best_time),
    avgTimeSeconds: totals.avg_time === null ? null : Math.round(Number(totals.avg_time)),
    bestScore: totals.best_score === null ? null : Number(totals.best_score),
    totalHints: Number(totals.total_hints ?? 0),
    byDifficulty: ([1, 2, 3] as Difficulty[]).map((d) => {
      const row = map.get(d);
      return {
        difficulty: d,
        solved: row ? Number(row.solved) : 0,
        bestTimeSeconds: row && row.best_time !== null ? Number(row.best_time) : null,
        avgTimeSeconds: row && row.avg_time !== null ? Math.round(Number(row.avg_time)) : null
      };
    })
  };
}

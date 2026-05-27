import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HighscoreEntry } from '@shared/types';

interface ResultRow {
  userId: number;
  puzzleId: number;
  timeSeconds: number;
  hintsUsed: number;
  score: number;
}

const mocks = vi.hoisted(() => {
  const state: { results: ResultRow[] } = { results: [] };

  const insertResult = vi.fn(
    (userId: number, puzzleId: number, t: number, h: number, score: number) => {
      state.results.push({ userId, puzzleId, timeSeconds: t, hintsUsed: h, score });
    }
  );

  const listHighscores = vi.fn((puzzleId?: number): HighscoreEntry[] => {
    const filtered = puzzleId ? state.results.filter((r) => r.puzzleId === puzzleId) : state.results;
    return filtered
      .slice()
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.timeSeconds - b.timeSeconds ||
          a.hintsUsed - b.hintsUsed
      )
      .map((r) => ({
        username: `user${r.userId}`,
        timeSeconds: r.timeSeconds,
        hintsUsed: r.hintsUsed,
        score: r.score,
        completedAt: '2026-01-01T00:00:00Z'
      }));
  });

  return { state, insertResult, listHighscores };
});

vi.mock('@main/db/queries', () => ({
  insertResult: mocks.insertResult,
  listHighscores: mocks.listHighscores
}));

import { highscores, save } from '../resultService';

beforeEach(() => {
  mocks.state.results = [];
  mocks.insertResult.mockClear();
  mocks.listHighscores.mockClear();
});

describe('resultService.save (covers TC-31, TC-33)', () => {
  it('TC-31 positive: stores time + hint count and returns computed score', () => {
    const res = save({ userId: 1, puzzleId: 10, timeSeconds: 200, hintsUsed: 3 });
    expect(res.success).toBe(true);
    expect(res.score).toBe(10000 - 200 * 5 - 3 * 500);
    expect(mocks.insertResult).toHaveBeenCalledTimes(1);
    expect(mocks.state.results[0]).toMatchObject({
      userId: 1,
      puzzleId: 10,
      timeSeconds: 200,
      hintsUsed: 3,
      score: 7500
    });
  });

  it('TC-33 boundary: zero hints stores hints_used = 0', () => {
    const res = save({ userId: 1, puzzleId: 10, timeSeconds: 120, hintsUsed: 0 });
    expect(res.score).toBe(10000 - 120 * 5);
    expect(mocks.state.results[0].hintsUsed).toBe(0);
  });

  it('clamps fractional / negative inputs', () => {
    const res = save({ userId: 1, puzzleId: 10, timeSeconds: -5, hintsUsed: 1.7 });
    expect(mocks.state.results[0].timeSeconds).toBe(0);
    expect(mocks.state.results[0].hintsUsed).toBe(1);
    expect(res.score).toBe(10000 - 0 * 5 - 1 * 500);
  });
});

describe('resultService.highscores (covers TC-25, TC-26, TC-27)', () => {
  it('TC-25 positive: results are sorted by score descending', () => {
    save({ userId: 1, puzzleId: 1, timeSeconds: 100, hintsUsed: 0 });
    save({ userId: 2, puzzleId: 1, timeSeconds: 50, hintsUsed: 0 });
    save({ userId: 3, puzzleId: 1, timeSeconds: 200, hintsUsed: 1 });
    const { entries } = highscores();
    expect(entries.map((e) => e.score)).toEqual([...entries.map((e) => e.score)].sort((a, b) => b - a));
    expect(entries[0].score).toBeGreaterThanOrEqual(entries[entries.length - 1].score);
  });

  it('TC-26 empty: no results returns an empty entries array', () => {
    const { entries } = highscores();
    expect(entries).toEqual([]);
  });

  it('TC-27 boundary: equal score tiebreaks on time ASC, then hints ASC', () => {
    save({ userId: 1, puzzleId: 1, timeSeconds: 100, hintsUsed: 0 });
    save({ userId: 2, puzzleId: 1, timeSeconds: 0, hintsUsed: 1 });
    save({ userId: 3, puzzleId: 1, timeSeconds: 200, hintsUsed: 0 });
    const { entries } = highscores();
    expect(entries[0].score).toBe(9500);
    expect(entries[1].score).toBe(9500);
    expect(entries[0].timeSeconds).toBe(0);
    expect(entries[1].timeSeconds).toBe(100);
    expect(entries[2].score).toBe(9000);
  });

  it('TC-27 schema check: queries.ts ORDER BY enforces the tiebreaker on the live DB', () => {
    const queriesPath = path.resolve(__dirname, '../../db/queries.ts');
    const src = fs.readFileSync(queriesPath, 'utf8');
    expect(src).toMatch(
      /ORDER BY\s+r\.score DESC,\s+r\.time_seconds ASC,\s+r\.hints_used ASC/i
    );
  });
});

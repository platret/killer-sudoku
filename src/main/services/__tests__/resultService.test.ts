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
  const state: { results: ResultRow[]; difficulty: number } = { results: [], difficulty: 2 };

  const insertResult = vi.fn(
    (userId: number, puzzleId: number, t: number, h: number, score: number) => {
      state.results.push({ userId, puzzleId, timeSeconds: t, hintsUsed: h, score });
    }
  );

  const one = vi.fn(() => ({ difficulty: state.difficulty }));
  const many = vi.fn(() => []);

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

  return { state, insertResult, listHighscores, one, many };
});

vi.mock('@main/db/queries', () => ({
  insertResult: mocks.insertResult,
  listHighscores: mocks.listHighscores,
  getBestForUserPuzzle: vi.fn(() => null),
  getCompletionDays: vi.fn(() => []),
  getResultHistory: vi.fn(() => [])
}));

vi.mock('@main/db/index', () => ({
  one: mocks.one,
  many: mocks.many
}));

import { highscores, save } from '../resultService';

beforeEach(() => {
  mocks.state.results = [];
  mocks.insertResult.mockClear();
  mocks.listHighscores.mockClear();
});

describe('resultService.save (covers TC-31, TC-33)', () => {
  it('TC-31 positive: stores time + hint count and returns computed score', () => {
    mocks.state.difficulty = 2;
    const res = save({ userId: 1, puzzleId: 10, timeSeconds: 200, hintsUsed: 3 });
    expect(res.success).toBe(true);
    // Medium base 8000, par 720s → timeMul=1-200/1440=0.8611, hintMul=0.85
    expect(res.score).toBe(Math.round(8000 * (1 - 200 / 1440) * 0.85));
    expect(mocks.insertResult).toHaveBeenCalledTimes(1);
    expect(mocks.state.results[0]).toMatchObject({
      userId: 1,
      puzzleId: 10,
      timeSeconds: 200,
      hintsUsed: 3
    });
  });

  it('TC-33 boundary: zero hints stores hints_used = 0', () => {
    mocks.state.difficulty = 2;
    const res = save({ userId: 1, puzzleId: 10, timeSeconds: 120, hintsUsed: 0 });
    expect(res.score).toBe(Math.round(8000 * (1 - 120 / 1440)));
    expect(mocks.state.results[0].hintsUsed).toBe(0);
  });

  it('clamps fractional / negative inputs', () => {
    mocks.state.difficulty = 2;
    const res = save({ userId: 1, puzzleId: 10, timeSeconds: -5, hintsUsed: 1.7 });
    expect(mocks.state.results[0].timeSeconds).toBe(0);
    expect(mocks.state.results[0].hintsUsed).toBe(1);
    expect(res.score).toBe(Math.round(8000 * 1 * 0.95));
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
    mocks.state.difficulty = 2;
    // 72s + 0 hints → timeMul = 1 - 72/1440 = 0.95, hintMul = 1 → 7600
    // 0s + 1 hint → timeMul = 1, hintMul = 0.95 → 7600 (tie)
    // 144s + 0 hints → timeMul = 0.9, hintMul = 1 → 7200
    save({ userId: 1, puzzleId: 1, timeSeconds: 72, hintsUsed: 0 });
    save({ userId: 2, puzzleId: 1, timeSeconds: 0, hintsUsed: 1 });
    save({ userId: 3, puzzleId: 1, timeSeconds: 144, hintsUsed: 0 });
    const { entries } = highscores();
    expect(entries[0].score).toBe(7600);
    expect(entries[1].score).toBe(7600);
    expect(entries[0].timeSeconds).toBe(0);
    expect(entries[1].timeSeconds).toBe(72);
    expect(entries[2].score).toBe(7200);
  });

  it('TC-27 schema check: queries.ts ORDER BY enforces the tiebreaker on the live DB', () => {
    const queriesPath = path.resolve(__dirname, '../../db/queries.ts');
    const src = fs.readFileSync(queriesPath, 'utf8');
    expect(src).toMatch(
      /ORDER BY\s+r\.score DESC,\s+r\.time_seconds ASC,\s+r\.hints_used ASC/i
    );
  });
});

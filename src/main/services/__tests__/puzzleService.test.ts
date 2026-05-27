import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CageInput, Difficulty, Puzzle, PuzzleSummary } from '@shared/types';

interface PuzzleRecord {
  id: number;
  name: string;
  difficulty: Difficulty;
  createdBy: number;
  cages: CageInput[];
}

const mocks = vi.hoisted(() => {
  const state: { puzzles: PuzzleRecord[]; nextId: number } = { puzzles: [], nextId: 1 };

  const insertPuzzle = vi.fn(
    (name: string, difficulty: Difficulty, cages: CageInput[], createdBy: number) => {
      const id = state.nextId++;
      state.puzzles.push({ id, name, difficulty, createdBy, cages });
      return id;
    }
  );

  const listPuzzles = vi.fn((difficulty?: Difficulty): PuzzleSummary[] => {
    const filtered = difficulty
      ? state.puzzles.filter((p) => p.difficulty === difficulty)
      : state.puzzles;
    return filtered.map((p) => ({
      id: p.id,
      name: p.name,
      difficulty: p.difficulty,
      createdBy: p.createdBy,
      createdByName: 'tester',
      isDaily: false,
      createdAt: '2026-01-01T00:00:00Z'
    }));
  });

  const getPuzzle = vi.fn((id: number): Omit<Puzzle, 'parTimes'> | null => {
    const p = state.puzzles.find((x) => x.id === id);
    if (!p) return null;
    return {
      id: p.id,
      name: p.name,
      difficulty: p.difficulty,
      createdBy: p.createdBy,
      createdByName: 'tester',
      isDaily: false,
      createdAt: '2026-01-01T00:00:00Z',
      cages: p.cages.map((c, i) => ({ id: i + 1, targetSum: c.targetSum, cells: c.cells })),
      givens: Array(81).fill(null)
    };
  });

  const deletePuzzleOwnedBy = vi.fn((puzzleId: number, userId: number): boolean => {
    const idx = state.puzzles.findIndex((p) => p.id === puzzleId);
    if (idx === -1) return false;
    if (state.puzzles[idx].createdBy !== userId) {
      throw new Error('Only the creator can delete this puzzle');
    }
    state.puzzles.splice(idx, 1);
    return true;
  });

  return { state, insertPuzzle, listPuzzles, getPuzzle, deletePuzzleOwnedBy };
});

vi.mock('@main/db/queries', () => ({
  insertPuzzle: mocks.insertPuzzle,
  listPuzzles: mocks.listPuzzles,
  getPuzzle: mocks.getPuzzle,
  deletePuzzleOwnedBy: mocks.deletePuzzleOwnedBy
}));

import { create, list, get, remove, validate } from '../puzzleService';

const SOLUTION: number[] = [
  5, 3, 4, 6, 7, 8, 9, 1, 2,
  6, 7, 2, 1, 9, 5, 3, 4, 8,
  1, 9, 8, 3, 4, 2, 5, 6, 7,
  8, 5, 9, 7, 6, 1, 4, 2, 3,
  4, 2, 6, 8, 5, 3, 7, 9, 1,
  7, 1, 3, 9, 2, 4, 8, 5, 6,
  9, 6, 1, 5, 3, 7, 2, 8, 4,
  2, 8, 7, 4, 1, 9, 6, 3, 5,
  3, 4, 5, 2, 8, 6, 1, 7, 9
];

function uniquePuzzleCages(): CageInput[] {
  return SOLUTION.map((v, i) => ({ targetSum: v, cells: [i] }));
}

function uniquePuzzleWithDoubleCage(): CageInput[] {
  const cages: CageInput[] = [];
  cages.push({ targetSum: SOLUTION[0] + SOLUTION[1], cells: [0, 1] });
  for (let i = 2; i < 81; i++) cages.push({ targetSum: SOLUTION[i], cells: [i] });
  return cages;
}

function rowCages(): CageInput[] {
  const out: CageInput[] = [];
  for (let r = 0; r < 9; r++) {
    out.push({
      targetSum: 45,
      cells: Array.from({ length: 9 }, (_, c) => r * 9 + c)
    });
  }
  return out;
}

beforeEach(() => {
  mocks.state.puzzles = [];
  mocks.state.nextId = 1;
  mocks.insertPuzzle.mockClear();
  mocks.listPuzzles.mockClear();
  mocks.getPuzzle.mockClear();
  mocks.deletePuzzleOwnedBy.mockClear();
});

describe('puzzleService.create / validate (covers TC-11 to TC-18)', () => {
  it('TC-11 positive: valid cages totaling 405 are accepted', () => {
    const res = create({
      name: 'Test Puzzle',
      difficulty: 2,
      cages: uniquePuzzleWithDoubleCage(),
      createdBy: 1
    });
    expect(res.success).toBe(true);
    expect(res.puzzleId).toBe(1);
    expect(mocks.insertPuzzle).toHaveBeenCalledTimes(1);
  });

  it('TC-12 negative: overlapping cells are rejected, no save', () => {
    const cages = uniquePuzzleCages();
    cages[1] = { targetSum: SOLUTION[0], cells: [0] };
    const res = create({ name: 'Overlap', difficulty: 1, cages, createdBy: 1 });
    expect(res.success).toBe(false);
    expect(mocks.insertPuzzle).not.toHaveBeenCalled();
  });

  it('TC-12 negative: missing cells are rejected, no save', () => {
    const cages = uniquePuzzleCages().slice(0, 80);
    const res = create({ name: 'Gap', difficulty: 1, cages, createdBy: 1 });
    expect(res.success).toBe(false);
    expect(mocks.insertPuzzle).not.toHaveBeenCalled();
  });

  it('TC-13 negative: cage-sum total ≠ 405 is rejected by the simple check', () => {
    const cages = uniquePuzzleCages();
    cages[0] = { ...cages[0], targetSum: cages[0].targetSum - 1 };
    const v = validate(cages);
    expect(v.sumValid).toBe(false);
    const res = create({ name: 'Bad sum', difficulty: 1, cages, createdBy: 1 });
    expect(res.success).toBe(false);
    expect(mocks.insertPuzzle).not.toHaveBeenCalled();
  });

  it('TC-14 boundary: difficulty 1 and 3 accepted; 0 and 4 rejected', () => {
    const cages = uniquePuzzleCages();
    expect(create({ name: 'D1', difficulty: 1, cages, createdBy: 1 }).success).toBe(true);
    expect(create({ name: 'D3', difficulty: 3, cages, createdBy: 1 }).success).toBe(true);
    expect(
      create({ name: 'D0', difficulty: 0 as unknown as Difficulty, cages, createdBy: 1 }).success
    ).toBe(false);
    expect(
      create({ name: 'D4', difficulty: 4 as unknown as Difficulty, cages, createdBy: 1 }).success
    ).toBe(false);
  });

  it('TC-15 positive: a unique puzzle is stored without its solution', () => {
    const res = create({
      name: 'Unique',
      difficulty: 2,
      cages: uniquePuzzleCages(),
      createdBy: 1
    });
    expect(res.success).toBe(true);
    const stored = mocks.state.puzzles[0];
    expect(stored.cages.length).toBe(81);
    expect(stored).not.toHaveProperty('solution');
  });

  it('TC-16 negative: an unsolvable cage set is rejected, no save', () => {
    const cages = uniquePuzzleCages();
    cages[0] = { targetSum: 6, cells: [0] };
    const res = create({ name: 'Unsolvable', difficulty: 1, cages, createdBy: 1 });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/sums must total|no solution/i);
    expect(mocks.insertPuzzle).not.toHaveBeenCalled();
  });

  it('TC-17 negative: a non-unique cage set is rejected, no save', () => {
    const res = create({ name: 'Ambiguous', difficulty: 3, cages: rowCages(), createdBy: 1 });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/uniquely/i);
    expect(mocks.insertPuzzle).not.toHaveBeenCalled();
  });

  it('TC-18 boundary: well-formed example puzzles validate as unique and save', () => {
    const a = create({
      name: 'Example A',
      difficulty: 1,
      cages: uniquePuzzleCages(),
      createdBy: 1
    });
    const b = create({
      name: 'Example B',
      difficulty: 2,
      cages: uniquePuzzleWithDoubleCage(),
      createdBy: 1
    });
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    expect(mocks.state.puzzles.length).toBe(2);
  });
});

describe('puzzleService.list / get (homescreen reads)', () => {
  it('lists only the requested difficulty', () => {
    create({ name: 'Easy one', difficulty: 1, cages: uniquePuzzleCages(), createdBy: 1 });
    create({ name: 'Hard one', difficulty: 3, cages: uniquePuzzleCages(), createdBy: 1 });
    const all = list();
    expect(all.puzzles.length).toBe(2);
    const easy = list(1);
    expect(easy.puzzles.length).toBe(1);
    expect(easy.puzzles[0].difficulty).toBe(1);
  });

  it('returns null for missing puzzle', () => {
    expect(get(999).puzzle).toBeNull();
  });
});

describe('puzzleService.remove (covers TC-43, TC-44)', () => {
  it('TC-43 positive: creator can delete own puzzle', () => {
    create({ name: 'My puzzle', difficulty: 1, cages: uniquePuzzleCages(), createdBy: 7 });
    const res = remove(1, 7);
    expect(res.success).toBe(true);
    expect(mocks.state.puzzles.length).toBe(0);
  });

  it('TC-44 negative: non-creator cannot delete', () => {
    create({ name: 'My puzzle', difficulty: 1, cages: uniquePuzzleCages(), createdBy: 7 });
    const res = remove(1, 99);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/creator/i);
    expect(mocks.state.puzzles.length).toBe(1);
  });

  it('returns error when puzzle does not exist', () => {
    expect(remove(404, 1).success).toBe(false);
  });
});

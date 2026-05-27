import {
  deletePuzzleOwnedBy,
  getPuzzle,
  insertPuzzle,
  listPuzzles
} from '@main/db/queries';
import { cagesCoverGridOnce, solve, validatePuzzle } from './solverService';
import type {
  CageInput,
  CreateResult,
  DeleteResult,
  Difficulty,
  GetResult,
  ListResult,
  Puzzle,
  ValidateResult
} from '@shared/types';

const GIVENS_PER_DIFFICULTY: Record<Difficulty, number> = {
  1: 36,
  2: 20,
  3: 0
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickGivens(
  solution: number[],
  count: number,
  seed: number
): (number | null)[] {
  const cells = Array.from({ length: 81 }, (_, i) => i);
  const rand = mulberry32(seed);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = cells[i];
    cells[i] = cells[j];
    cells[j] = tmp;
  }
  const chosen = new Set(cells.slice(0, count));
  return Array.from({ length: 81 }, (_, i) => (chosen.has(i) ? solution[i] : null));
}

function attachGivens(puzzle: Puzzle): Puzzle {
  const count = GIVENS_PER_DIFFICULTY[puzzle.difficulty] ?? 0;
  if (count === 0) {
    return { ...puzzle, givens: Array(81).fill(null) };
  }
  const sol = solve(puzzle.cages, undefined);
  if (!sol) {
    return { ...puzzle, givens: Array(81).fill(null) };
  }
  return { ...puzzle, givens: pickGivens(sol, count, puzzle.id) };
}

function validateCageStructure(cages: CageInput[]): string | null {
  if (!Array.isArray(cages) || cages.length === 0) return 'Provide at least one cage';
  for (const cage of cages) {
    if (!Array.isArray(cage.cells) || cage.cells.length === 0) {
      return 'Every cage needs at least one cell';
    }
    if (typeof cage.targetSum !== 'number' || cage.targetSum < 1 || cage.targetSum > 45) {
      return 'Cage sum must be between 1 and 45';
    }
    if (cage.cells.length > 9) return 'A cage cannot contain more than 9 cells';
    const seen = new Set<number>();
    for (const idx of cage.cells) {
      if (!Number.isInteger(idx) || idx < 0 || idx > 80) return 'Invalid cell index';
      if (seen.has(idx)) return 'A cage contains a duplicated cell';
      seen.add(idx);
    }
  }
  if (!cagesCoverGridOnce(cages)) return 'Cages must cover every cell exactly once';
  return null;
}

export function validate(cages: CageInput[]): ValidateResult {
  const err = validateCageStructure(cages);
  if (err) return { sumValid: false, solvable: false, unique: false, error: err };
  return validatePuzzle(cages);
}

export function create(input: {
  name: string;
  difficulty: Difficulty;
  cages: CageInput[];
  createdBy: number;
}): CreateResult {
  const name = (input.name ?? '').trim();
  if (name.length < 2 || name.length > 100) {
    return { success: false, error: 'Name must be 2-100 characters' };
  }
  if (![1, 2, 3].includes(input.difficulty)) {
    return { success: false, error: 'Invalid difficulty' };
  }
  const err = validateCageStructure(input.cages);
  if (err) return { success: false, error: err };
  const v = validatePuzzle(input.cages);
  if (!v.sumValid) return { success: false, error: 'Cage sums must total 405' };
  if (!v.solvable) return { success: false, error: 'Puzzle has no solution' };
  if (!v.unique) return { success: false, error: 'Puzzle is not uniquely solvable' };
  const puzzleId = insertPuzzle(name, input.difficulty, input.cages, input.createdBy);
  return { success: true, puzzleId };
}

export function list(difficulty?: Difficulty): ListResult {
  const puzzles = listPuzzles(difficulty);
  return { puzzles };
}

export function get(id: number): GetResult {
  if (!Number.isInteger(id) || id <= 0) return { puzzle: null };
  const base = getPuzzle(id);
  if (!base) return { puzzle: null };
  return { puzzle: attachGivens(base as Puzzle) };
}

export function remove(puzzleId: number, userId: number): DeleteResult {
  if (!Number.isInteger(puzzleId) || puzzleId <= 0) return { success: false, error: 'Invalid puzzle id' };
  if (!Number.isInteger(userId) || userId <= 0) return { success: false, error: 'Invalid user id' };
  try {
    const ok = deletePuzzleOwnedBy(puzzleId, userId);
    return ok ? { success: true } : { success: false, error: 'Puzzle not found' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

import {
  deletePuzzleOwnedBy,
  getPuzzle,
  insertPuzzle,
  listPuzzles
} from '@main/db/queries';
import { cagesCoverGridOnce, validatePuzzle } from './solverService';
import type {
  CageInput,
  CreateResult,
  DeleteResult,
  Difficulty,
  GetResult,
  ListResult,
  ValidateResult
} from '@shared/types';

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
  return { puzzle: getPuzzle(id) };
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

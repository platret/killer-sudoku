import { describe, expect, it } from 'vitest';
import {
  cagesCoverGridOnce,
  checkGrid,
  countSolutions,
  hint,
  scoreOf,
  solve,
  sumValid,
  validatePuzzle
} from '../solverService';
import type { CageInput, Grid } from '@shared/types';

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

function singleCellCages(): CageInput[] {
  return SOLUTION.map((v, i) => ({ targetSum: v, cells: [i] }));
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

describe('solverService', () => {
  it('TC-13 sum-405 check passes for valid totals', () => {
    expect(sumValid(singleCellCages())).toBe(true);
    expect(sumValid(rowCages())).toBe(true);
  });

  it('TC-13 sum-405 check fails when totals differ', () => {
    const cages = singleCellCages();
    cages[0] = { ...cages[0], targetSum: cages[0].targetSum + 1 };
    expect(sumValid(cages)).toBe(false);
  });

  it('cagesCoverGridOnce returns true for full coverage', () => {
    expect(cagesCoverGridOnce(singleCellCages())).toBe(true);
  });

  it('cagesCoverGridOnce returns false when cells are missing', () => {
    const missing = singleCellCages().slice(0, 80);
    expect(cagesCoverGridOnce(missing)).toBe(false);
  });

  it('cagesCoverGridOnce returns false on overlapping cells', () => {
    const cages = singleCellCages();
    cages[1] = { targetSum: cages[1].targetSum, cells: [0] };
    expect(cagesCoverGridOnce(cages)).toBe(false);
  });

  it('TC-34 solver solves a valid puzzle to the unique solution', () => {
    const solution = solve(singleCellCages());
    expect(solution).not.toBeNull();
    expect(solution).toEqual(SOLUTION);
  });

  it('TC-36 solver respects givens (partial fill)', () => {
    const givens: Grid = SOLUTION.map((v, i) => (i < 6 ? v : null));
    const solution = solve(rowCages(), givens);
    expect(solution).not.toBeNull();
    for (let i = 0; i < 6; i++) expect(solution![i]).toBe(SOLUTION[i]);
  });

  it('TC-16 / TC-35 solver detects unsolvable puzzle (0 solutions / null)', () => {
    const cages = singleCellCages();
    cages[0] = { targetSum: 6, cells: [0] };
    expect(countSolutions(cages, undefined, 2)).toBe(0);
    expect(solve(cages)).toBeNull();
  });

  it('TC-17 solver detects non-unique puzzle (>=2 solutions)', () => {
    const n = countSolutions(rowCages(), undefined, 2);
    expect(n).toBe(2);
    const v = validatePuzzle(rowCages());
    expect(v.unique).toBe(false);
    expect(v.solvable).toBe(true);
  });

  it('TC-15 validatePuzzle accepts a uniquely-solvable encoding', () => {
    const v = validatePuzzle(singleCellCages());
    expect(v.sumValid).toBe(true);
    expect(v.solvable).toBe(true);
    expect(v.unique).toBe(true);
  });

  it('TC-22 hint reveals the correct value for the selected empty cell', () => {
    const cages = singleCellCages();
    const grid: Grid = SOLUTION.map((v, i) => (i === 40 ? null : v));
    const result = hint(cages, grid, 40);
    expect('cellIndex' in result).toBe(true);
    if ('cellIndex' in result) {
      expect(result.cellIndex).toBe(40);
      expect(result.value).toBe(SOLUTION[40]);
    }
  });

  it('TC-24 hint picks the last empty cell when no selection is provided', () => {
    const cages = singleCellCages();
    const grid: Grid = SOLUTION.map((v, i) => (i === 17 ? null : v));
    const result = hint(cages, grid);
    expect('cellIndex' in result).toBe(true);
    if ('cellIndex' in result) {
      expect(result.cellIndex).toBe(17);
      expect(result.value).toBe(SOLUTION[17]);
    }
  });

  it('TC-23 hint errors when no empty cell exists', () => {
    const grid: Grid = SOLUTION.slice();
    const result = hint(singleCellCages(), grid);
    expect('error' in result).toBe(true);
  });

  it('TC-28 checkGrid reports correct on the full solution', () => {
    const r = checkGrid(singleCellCages(), SOLUTION as Grid);
    expect(r.complete).toBe(true);
    expect(r.correct).toBe(true);
    expect(r.errorCells.length).toBe(0);
  });

  it('TC-29 checkGrid flags row duplicates and marks affected cells', () => {
    const grid: Grid = SOLUTION.slice();
    grid[0] = 3;
    const r = checkGrid(singleCellCages(), grid);
    expect(r.correct).toBe(false);
    expect(r.errorCells).toContain(0);
    expect(r.errorCells).toContain(1);
  });

  it('TC-30 checkGrid reports incomplete on empty cells (UI must block submit)', () => {
    const grid: Grid = SOLUTION.map((v, i) => (i === 12 ? null : v));
    const r = checkGrid(singleCellCages(), grid);
    expect(r.complete).toBe(false);
  });

  it('TC-27 score formula is multiplicative and difficulty-aware', () => {
    // Default difficulty = medium (base 8000, par 720s)
    expect(scoreOf(0, 0)).toBe(8000);
    expect(scoreOf(720, 0)).toBe(4000); // half time-mul at par
    expect(scoreOf(0, 5)).toBe(6000); // five hints → 75% hint-mul
    // Easy base 4000, hard base 14000 at clean clear
    expect(scoreOf(0, 0, 1)).toBe(4000);
    expect(scoreOf(0, 0, 3)).toBe(14000);
    // Floors: extreme hints still yield 5% of base, never 0
    expect(scoreOf(0, 200, 2)).toBe(400);
    // Extreme time floors at 20% of base
    expect(scoreOf(99999, 0, 2)).toBe(1600);
  });

  it('TC-27 equal-input scores are equal (tiebreaker delegated to listHighscores)', () => {
    expect(scoreOf(120, 1)).toBe(scoreOf(120, 1));
  });
});

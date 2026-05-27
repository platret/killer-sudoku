import type { CageInput, CheckResult, Difficulty, Grid, ParTimeBadges } from '@shared/types';

export const GRID_SIZE = 81;
export const ROW = (i: number): number => Math.floor(i / 9);
export const COL = (i: number): number => i % 9;
export const BOX = (i: number): number => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);

export function sumValid(cages: CageInput[]): boolean {
  const total = cages.reduce((acc, c) => acc + c.targetSum, 0);
  return total === 405;
}

export function cagesCoverGridOnce(cages: CageInput[]): boolean {
  const seen = new Set<number>();
  for (const cage of cages) {
    for (const idx of cage.cells) {
      if (idx < 0 || idx > 80) return false;
      if (seen.has(idx)) return false;
      seen.add(idx);
    }
  }
  return seen.size === 81;
}

interface SolverState {
  grid: number[];
  rowMask: number[];
  colMask: number[];
  boxMask: number[];
  cageOfCell: number[];
  cageMask: number[];
  cageRemaining: number[];
  cageCellsLeft: number[];
  cages: CageInput[];
}

function buildState(cages: CageInput[], givens: Grid | undefined): SolverState | null {
  const grid = new Array<number>(81).fill(0);
  const rowMask = new Array<number>(9).fill(0);
  const colMask = new Array<number>(9).fill(0);
  const boxMask = new Array<number>(9).fill(0);
  const cageOfCell = new Array<number>(81).fill(-1);
  const cageMask = new Array<number>(cages.length).fill(0);
  const cageRemaining = cages.map((c) => c.targetSum);
  const cageCellsLeft = cages.map((c) => c.cells.length);

  for (let i = 0; i < cages.length; i++) {
    for (const idx of cages[i].cells) {
      if (cageOfCell[idx] !== -1) return null;
      cageOfCell[idx] = i;
    }
  }
  for (let i = 0; i < 81; i++) if (cageOfCell[i] === -1) return null;

  if (givens) {
    for (let i = 0; i < 81; i++) {
      const v = givens[i];
      if (v === null || v === undefined) continue;
      if (v < 1 || v > 9) return null;
      const bit = 1 << v;
      const r = ROW(i), c = COL(i), b = BOX(i), cg = cageOfCell[i];
      if (rowMask[r] & bit) return null;
      if (colMask[c] & bit) return null;
      if (boxMask[b] & bit) return null;
      if (cageMask[cg] & bit) return null;
      if (cageRemaining[cg] - v < 0) return null;
      grid[i] = v;
      rowMask[r] |= bit;
      colMask[c] |= bit;
      boxMask[b] |= bit;
      cageMask[cg] |= bit;
      cageRemaining[cg] -= v;
      cageCellsLeft[cg] -= 1;
    }
  }

  return { grid, rowMask, colMask, boxMask, cageOfCell, cageMask, cageRemaining, cageCellsLeft, cages };
}

function candidatesFor(state: SolverState, idx: number): number[] {
  const r = ROW(idx), c = COL(idx), b = BOX(idx), cg = state.cageOfCell[idx];
  const used = state.rowMask[r] | state.colMask[c] | state.boxMask[b] | state.cageMask[cg];
  const remaining = state.cageRemaining[cg];
  const cellsLeft = state.cageCellsLeft[cg];
  const out: number[] = [];
  for (let v = 1; v <= 9; v++) {
    const bit = 1 << v;
    if (used & bit) continue;
    if (v > remaining) continue;
    if (cellsLeft === 1) {
      if (v !== remaining) continue;
    } else {
      const after = remaining - v;
      const k = cellsLeft - 1;
      const minK = (k * (k + 1)) / 2;
      const maxK = (k * (19 - k)) / 2;
      if (after < minK || after > maxK) continue;
    }
    out.push(v);
  }
  return out;
}

function pickCell(state: SolverState): { idx: number; cands: number[] } | null {
  let bestIdx = -1;
  let bestCands: number[] = [];
  let bestLen = 10;
  for (let i = 0; i < 81; i++) {
    if (state.grid[i] !== 0) continue;
    const cs = candidatesFor(state, i);
    if (cs.length === 0) return { idx: i, cands: [] };
    if (cs.length < bestLen) {
      bestLen = cs.length;
      bestIdx = i;
      bestCands = cs;
      if (bestLen === 1) break;
    }
  }
  if (bestIdx === -1) return null;
  return { idx: bestIdx, cands: bestCands };
}

function place(state: SolverState, idx: number, v: number): void {
  const bit = 1 << v;
  state.grid[idx] = v;
  state.rowMask[ROW(idx)] |= bit;
  state.colMask[COL(idx)] |= bit;
  state.boxMask[BOX(idx)] |= bit;
  state.cageMask[state.cageOfCell[idx]] |= bit;
  state.cageRemaining[state.cageOfCell[idx]] -= v;
  state.cageCellsLeft[state.cageOfCell[idx]] -= 1;
}

function unplace(state: SolverState, idx: number, v: number): void {
  const bit = 1 << v;
  state.grid[idx] = 0;
  state.rowMask[ROW(idx)] &= ~bit;
  state.colMask[COL(idx)] &= ~bit;
  state.boxMask[BOX(idx)] &= ~bit;
  state.cageMask[state.cageOfCell[idx]] &= ~bit;
  state.cageRemaining[state.cageOfCell[idx]] += v;
  state.cageCellsLeft[state.cageOfCell[idx]] += 1;
}

function search(state: SolverState, foundOut: { solution: number[] | null }, limit: number, count: { n: number }): void {
  if (count.n >= limit) return;
  const pick = pickCell(state);
  if (pick === null) {
    count.n += 1;
    if (foundOut.solution === null) foundOut.solution = state.grid.slice();
    return;
  }
  if (pick.cands.length === 0) return;
  for (const v of pick.cands) {
    place(state, pick.idx, v);
    search(state, foundOut, limit, count);
    unplace(state, pick.idx, v);
    if (count.n >= limit) return;
  }
}

export function solve(cages: CageInput[], givens?: Grid): number[] | null {
  const state = buildState(cages, givens);
  if (!state) return null;
  const out: { solution: number[] | null } = { solution: null };
  const count = { n: 0 };
  search(state, out, 1, count);
  return out.solution;
}

export function countSolutions(cages: CageInput[], givens?: Grid, limit = 2): number {
  const state = buildState(cages, givens);
  if (!state) return 0;
  const out: { solution: number[] | null } = { solution: null };
  const count = { n: 0 };
  search(state, out, limit, count);
  return count.n;
}

export interface ValidationOutput {
  sumValid: boolean;
  solvable: boolean;
  unique: boolean;
}

export function validatePuzzle(cages: CageInput[]): ValidationOutput {
  const sumOk = sumValid(cages);
  const cover = cagesCoverGridOnce(cages);
  if (!sumOk || !cover) {
    return { sumValid: sumOk, solvable: false, unique: false };
  }
  const n = countSolutions(cages, undefined, 2);
  return { sumValid: true, solvable: n >= 1, unique: n === 1 };
}

export function checkGrid(cages: CageInput[], grid: Grid): CheckResult {
  const errorSet = new Set<number>();
  let complete = true;
  for (let i = 0; i < 81; i++) {
    if (grid[i] === null || grid[i] === undefined) { complete = false; }
  }

  for (let r = 0; r < 9; r++) {
    const seen = new Map<number, number[]>();
    for (let c = 0; c < 9; c++) {
      const i = r * 9 + c;
      const v = grid[i];
      if (v === null || v === undefined) continue;
      const arr = seen.get(v) ?? [];
      arr.push(i);
      seen.set(v, arr);
    }
    for (const [, idxs] of seen) if (idxs.length > 1) idxs.forEach((x) => errorSet.add(x));
  }

  for (let c = 0; c < 9; c++) {
    const seen = new Map<number, number[]>();
    for (let r = 0; r < 9; r++) {
      const i = r * 9 + c;
      const v = grid[i];
      if (v === null || v === undefined) continue;
      const arr = seen.get(v) ?? [];
      arr.push(i);
      seen.set(v, arr);
    }
    for (const [, idxs] of seen) if (idxs.length > 1) idxs.forEach((x) => errorSet.add(x));
  }

  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const seen = new Map<number, number[]>();
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          const r = br * 3 + dr;
          const c = bc * 3 + dc;
          const i = r * 9 + c;
          const v = grid[i];
          if (v === null || v === undefined) continue;
          const arr = seen.get(v) ?? [];
          arr.push(i);
          seen.set(v, arr);
        }
      }
      for (const [, idxs] of seen) if (idxs.length > 1) idxs.forEach((x) => errorSet.add(x));
    }
  }

  let sumValidFlag = true;
  for (const cage of cages) {
    const seen = new Map<number, number[]>();
    let runningSum = 0;
    let allFilled = true;
    for (const idx of cage.cells) {
      const v = grid[idx];
      if (v === null || v === undefined) { allFilled = false; continue; }
      runningSum += v;
      const arr = seen.get(v) ?? [];
      arr.push(idx);
      seen.set(v, arr);
    }
    for (const [, idxs] of seen) if (idxs.length > 1) idxs.forEach((x) => errorSet.add(x));
    if (allFilled) {
      if (runningSum !== cage.targetSum) {
        cage.cells.forEach((x) => errorSet.add(x));
        sumValidFlag = false;
      }
    } else {
      if (runningSum > cage.targetSum) {
        cage.cells.forEach((x) => { if (grid[x] !== null && grid[x] !== undefined) errorSet.add(x); });
        sumValidFlag = false;
      }
    }
  }

  const correct = complete && errorSet.size === 0 && sumValidFlag;
  return {
    complete,
    sumValid: sumValidFlag,
    correct,
    errorCells: Array.from(errorSet).sort((a, b) => a - b)
  };
}

export function hint(
  cages: CageInput[],
  grid: Grid,
  selectedIndex?: number
): { cellIndex: number; value: number } | { error: string } {
  let target = -1;
  if (
    selectedIndex !== undefined &&
    selectedIndex >= 0 &&
    selectedIndex < 81 &&
    (grid[selectedIndex] === null || grid[selectedIndex] === undefined)
  ) {
    target = selectedIndex;
  } else {
    for (let i = 0; i < 81; i++) {
      if (grid[i] === null || grid[i] === undefined) {
        target = i;
        break;
      }
    }
  }
  if (target === -1) return { error: 'No empty cells' };

  const givens: Grid = grid.map((v) => (v === null || v === undefined ? null : v));
  const solution = solve(cages, givens);
  if (!solution) return { error: 'Current state is unsolvable' };
  return { cellIndex: target, value: solution[target] };
}

export function autoFillNotes(cages: CageInput[], grid: Grid): number[][] {
  const sol = solve(cages, grid);
  if (!sol) return Array(81).fill([]);

  const out = Array(81)
    .fill(null)
    .map(() => [] as number[]);
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== null && grid[i] !== undefined) continue;
    const state = buildState(cages, grid);
    if (state) {
      out[i] = candidatesFor(state, i);
    }
  }
  return out;
}

/**
 * Par times in seconds for each difficulty.
 */
export const PAR_TIMES: Record<Difficulty, number> = {
  1: 360, // 6 minutes
  2: 720, // 12 minutes
  3: 1500 // 25 minutes
};

export function getParTimeBadges(difficulty: Difficulty): ParTimeBadges {
  const par = PAR_TIMES[difficulty];
  return {
    gold: Math.floor(par * 0.75),
    silver: par,
    bronze: Math.floor(par * 1.5)
  };
}

/**
 * Multiplicative score so heavy hint use can't crater you to 0.
 *   score = base * timeMul * hintMul
 * Base scales with difficulty (harder = more points possible).
 * timeMul decays linearly toward a 0.20 floor over twice the par time.
 * hintMul drops 5% per hint, floored at 0.05 (so even an all-hint solve
 * still rewards you for finishing the grid).
 */
export function scoreOf(
  timeSeconds: number,
  hintsUsed: number,
  difficulty: Difficulty = 2
): number {
  const BASE: Record<Difficulty, number> = { 1: 4000, 2: 8000, 3: 14000 };
  const t = Math.max(0, timeSeconds);
  const h = Math.max(0, hintsUsed);
  const par = PAR_TIMES[difficulty] || 720;
  const timeMul = Math.max(0.2, 1 - t / (par * 2));
  const hintMul = Math.max(0.05, 1 - h * 0.05);
  return Math.round(BASE[difficulty] * timeMul * hintMul);
}

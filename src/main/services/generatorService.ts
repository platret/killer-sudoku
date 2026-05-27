import { countSolutions } from './solverService';
import type { CageInput, Difficulty } from '@shared/types';

interface DifficultyProfile {
  target: number;
  min: number;
  max: number;
  attempts: number;
}

const PROFILES: Record<Difficulty, DifficultyProfile> = {
  1: { target: 2, min: 1, max: 3, attempts: 80 },
  2: { target: 3, min: 2, max: 4, attempts: 80 },
  3: { target: 4, min: 2, max: 5, attempts: 200 }
};

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export function generateSolution(): number[] | null {
  const grid = new Array<number>(81).fill(0);
  const rowMask = new Array<number>(9).fill(0);
  const colMask = new Array<number>(9).fill(0);
  const boxMask = new Array<number>(9).fill(0);

  function fill(i: number): boolean {
    if (i === 81) return true;
    const r = Math.floor(i / 9);
    const c = i % 9;
    const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    const used = rowMask[r] | colMask[c] | boxMask[b];
    const candidates = shuffle(
      [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => !(used & (1 << v)))
    );
    for (const v of candidates) {
      const bit = 1 << v;
      grid[i] = v;
      rowMask[r] |= bit;
      colMask[c] |= bit;
      boxMask[b] |= bit;
      if (fill(i + 1)) return true;
      grid[i] = 0;
      rowMask[r] &= ~bit;
      colMask[c] &= ~bit;
      boxMask[b] &= ~bit;
    }
    return false;
  }

  return fill(0) ? grid : null;
}

function neighbors(i: number): number[] {
  const r = Math.floor(i / 9);
  const c = i % 9;
  const out: number[] = [];
  if (r > 0) out.push(i - 9);
  if (r < 8) out.push(i + 9);
  if (c > 0) out.push(i - 1);
  if (c < 8) out.push(i + 1);
  return out;
}

export function partitionCages(
  solution: number[],
  target: number,
  minSize: number,
  maxSize: number
): CageInput[] {
  const cageOf = new Array<number>(81).fill(-1);
  const cages: CageInput[] = [];
  const order = shuffle(Array.from({ length: 81 }, (_, i) => i));
  for (const start of order) {
    if (cageOf[start] !== -1) continue;
    const idx = cages.length;
    const cells = [start];
    const digits = new Set<number>([solution[start]]);
    cageOf[start] = idx;
    const size = Math.min(
      maxSize,
      Math.max(minSize, target + Math.floor(Math.random() * 3) - 1)
    );
    while (cells.length < size) {
      const frontier = new Set<number>();
      for (const c of cells) {
        for (const n of neighbors(c)) {
          if (cageOf[n] === -1 && !digits.has(solution[n])) frontier.add(n);
        }
      }
      if (frontier.size === 0) break;
      const pick = shuffle(Array.from(frontier))[0];
      cells.push(pick);
      digits.add(solution[pick]);
      cageOf[pick] = idx;
    }
    const sum = cells.reduce((s, c) => s + solution[c], 0);
    cages.push({ targetSum: sum, cells: cells.slice().sort((a, b) => a - b) });
  }
  return cages;
}

export function generateUniquePuzzle(difficulty: Difficulty): CageInput[] | null {
  const profile = PROFILES[difficulty];
  for (let i = 0; i < profile.attempts; i++) {
    const sol = generateSolution();
    if (!sol) continue;
    const cages = partitionCages(sol, profile.target, profile.min, profile.max);
    if (countSolutions(cages, undefined, 2) === 1) return cages;
  }
  return null;
}

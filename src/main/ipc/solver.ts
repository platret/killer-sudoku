import { ipcMain } from 'electron';
import { checkGrid, hint, solve } from '../services/solverService';
import type { CageInput, CheckResult, Grid, HintResult, SolveSolverResult } from '@shared/types';

export function registerSolverIpc(): void {
  ipcMain.handle(
    'solver:solve',
    async (_e, input: { cages: CageInput[]; givens?: Grid }): Promise<SolveSolverResult> => {
      try {
        return { solution: solve(input.cages, input.givens) };
      } catch {
        return { solution: null };
      }
    }
  );

  ipcMain.handle(
    'solver:hint',
    async (
      _e,
      input: { cages: CageInput[]; grid: Grid; selectedIndex?: number }
    ): Promise<HintResult> => {
      try {
        return hint(input.cages, input.grid, input.selectedIndex);
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Hint failed' };
      }
    }
  );

  ipcMain.handle(
    'solver:check',
    async (_e, input: { cages: CageInput[]; grid: Grid }): Promise<CheckResult> => {
      try {
        return checkGrid(input.cages, input.grid);
      } catch {
        return { complete: false, sumValid: false, correct: false, errorCells: [] };
      }
    }
  );
}

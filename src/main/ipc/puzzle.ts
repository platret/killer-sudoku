import { ipcMain } from 'electron';
import * as puzzleService from '../services/puzzleService';
import { generateUniquePuzzle } from '../services/generatorService';
import type {
  CageInput,
  CreateResult,
  DeleteResult,
  Difficulty,
  GenerateResult,
  GetResult,
  ListResult,
  ValidateResult
} from '@shared/types';

export function registerPuzzleIpc(): void {
  ipcMain.handle(
    'puzzle:validate',
    async (_e, input: { cages: CageInput[] }): Promise<ValidateResult> => {
      try {
        return puzzleService.validate(input.cages);
      } catch (err) {
        return {
          sumValid: false,
          solvable: false,
          unique: false,
          error: err instanceof Error ? err.message : 'Validation failed'
        };
      }
    }
  );

  ipcMain.handle(
    'puzzle:create',
    async (
      _e,
      input: { name: string; difficulty: Difficulty; cages: CageInput[]; createdBy: number }
    ): Promise<CreateResult> => {
      try {
        return puzzleService.create(input);
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Create failed' };
      }
    }
  );

  ipcMain.handle(
    'puzzle:list',
    async (_e, input?: { difficulty?: Difficulty; isDaily?: boolean }): Promise<ListResult> => {
      try {
        return puzzleService.list(input?.difficulty, input?.isDaily);
      } catch {
        return { puzzles: [] };
      }
    }
  );

  ipcMain.handle('puzzle:get', async (_e, input: { id: number }): Promise<GetResult> => {
    try {
      return puzzleService.get(input.id);
    } catch {
      return { puzzle: null };
    }
  });

  ipcMain.handle(
    'puzzle:delete',
    async (_e, input: { puzzleId: number; userId: number }): Promise<DeleteResult> => {
      try {
        return puzzleService.remove(input.puzzleId, input.userId);
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Delete failed' };
      }
    }
  );

  ipcMain.handle('puzzle:import', async (_e, input: { json: string; userId: number }): Promise<CreateResult> => {
    try {
      const data = JSON.parse(input.json);
      return puzzleService.create({
        name: data.name || 'Imported Puzzle',
        difficulty: data.difficulty || 2,
        cages: data.cages,
        createdBy: input.userId
      });
    } catch (err) {
      return { success: false, error: 'Invalid JSON format' };
    }
  });

  ipcMain.handle('puzzle:export', async (_e, input: { id: number }): Promise<{ json: string | null }> => {
    try {
      const p = puzzleService.get(input.id);
      if (!p.puzzle) return { json: null };
      return {
        json: JSON.stringify({
          name: p.puzzle.name,
          difficulty: p.puzzle.difficulty,
          cages: p.puzzle.cages.map(c => ({ targetSum: c.targetSum, cells: c.cells }))
        }, null, 2)
      };
    } catch {
      return { json: null };
    }
  });

  ipcMain.handle(
    'puzzle:generate',
    async (_e, input: { difficulty: Difficulty }): Promise<GenerateResult> => {
      try {
        if (![1, 2, 3].includes(input.difficulty)) {
          return { success: false, error: 'Invalid difficulty' };
        }
        const cages = generateUniquePuzzle(input.difficulty);
        if (!cages) {
          return { success: false, error: 'Could not find a unique puzzle. Try again.' };
        }
        return { success: true, cages };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Generate failed' };
      }
    }
  );
}

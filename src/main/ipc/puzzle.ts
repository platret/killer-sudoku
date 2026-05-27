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
    async (_e, input?: { difficulty?: Difficulty }): Promise<ListResult> => {
      try {
        return puzzleService.list(input?.difficulty);
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

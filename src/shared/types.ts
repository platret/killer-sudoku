export type Difficulty = 1 | 2 | 3;
export type Cell = number | null;
export type Grid = Cell[];

export interface User {
  id: number;
  username: string;
  xp: number;
  level: number;
  createdAt: string;
}

export interface CageInput {
  targetSum: number;
  cells: number[];
}

export interface Cage extends CageInput {
  id: number;
}

export interface PuzzleSummary {
  id: number;
  name: string;
  difficulty: Difficulty;
  createdBy: number;
  createdByName: string;
  isDaily: boolean;
  dailyDate?: string;
  createdAt: string;
}

export interface Puzzle extends PuzzleSummary {
  cages: Cage[];
  givens: (number | null)[];
  parTimes: ParTimeBadges;
}

export interface CheckResult {
  complete: boolean;
  sumValid: boolean;
  correct: boolean;
  errorCells: number[];
}

export interface SolveResult {
  id: number;
  userId: number;
  puzzleId: number;
  timeSeconds: number;
  hintsUsed: number;
  score: number;
  streakMultiplier: number;
  xpGained: number;
  completedAt: string;
}

export interface ParTimeBadges {
  gold: number;
  silver: number;
  bronze: number;
}

export interface HighscoreEntry {
  username: string;
  timeSeconds: number;
  hintsUsed: number;
  score: number;
  completedAt: string;
}

export interface ApiOk<T> {
  success: true;
  data?: T;
}

export interface ApiErr {
  success: false;
  error: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface ValidateResult {
  sumValid: boolean;
  solvable: boolean;
  unique: boolean;
  error?: string;
}

export interface CreateResult {
  success: boolean;
  puzzleId?: number;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export interface ListResult {
  puzzles: PuzzleSummary[];
}

export interface GetResult {
  puzzle: Puzzle | null;
}

export interface SolveSolverResult {
  solution: number[] | null;
}

export type HintResult =
  | { cellIndex: number; value: number }
  | { error: string };

export interface SaveResult {
  success: boolean;
  score: number;
}

export interface HighscoreList {
  entries: HighscoreEntry[];
}

export interface SettingGet {
  value: string | null;
}

export interface SettingSet {
  success: boolean;
}

export interface DbStatus {
  ok: boolean;
  error?: string;
}

export interface GenerateResult {
  success: boolean;
  cages?: CageInput[];
  error?: string;
}

export interface DifficultyStats {
  difficulty: Difficulty;
  solved: number;
  bestTimeSeconds: number | null;
  avgTimeSeconds: number | null;
}

export interface UserStats {
  totalSolved: number;
  bestTimeSeconds: number | null;
  avgTimeSeconds: number | null;
  bestScore: number | null;
  totalHints: number;
  byDifficulty: DifficultyStats[];
}

export interface BestForPuzzle {
  timeSeconds: number;
  hintsUsed: number;
  score: number;
  completedAt: string;
}

export interface StreakInfo {
  solvedToday: number;
  currentStreak: number;
  longestStreak: number;
}

export interface ClearProgressResult {
  success: boolean;
  cleared: number;
}

export interface SolveHistoryEntry {
  completedAt: string;
  timeSeconds: number;
  hintsUsed: number;
  score: number;
  difficulty: Difficulty;
  puzzleName: string;
}

export interface SolveHistory {
  entries: SolveHistoryEntry[];
}

export interface ExportResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface ElectronAPI {
  auth: {
    register: (input: { username: string; password: string }) => Promise<AuthResult>;
    login: (input: { username: string; password: string }) => Promise<AuthResult>;
    refresh: (input: { userId: number }) => Promise<AuthResult>;
    logout: () => Promise<{ success: boolean }>;
  };
  puzzle: {
    validate: (input: { cages: CageInput[] }) => Promise<ValidateResult>;
    create: (input: {
      name: string;
      difficulty: Difficulty;
      cages: CageInput[];
      createdBy: number;
    }) => Promise<CreateResult>;
    list: (input?: { difficulty?: Difficulty; isDaily?: boolean }) => Promise<ListResult>;
    get: (input: { id: number }) => Promise<GetResult>;
    delete: (input: { puzzleId: number; userId: number }) => Promise<DeleteResult>;
    generate: (input: { difficulty: Difficulty }) => Promise<GenerateResult>;
    import: (input: { json: string; userId: number }) => Promise<CreateResult>;
    export: (input: { id: number }) => Promise<{ json: string | null }>;
  };
  solver: {
    solve: (input: { cages: CageInput[]; givens?: Grid }) => Promise<SolveSolverResult>;
    hint: (input: {
      cages: CageInput[];
      grid: Grid;
      selectedIndex?: number;
    }) => Promise<HintResult>;
    check: (input: { cages: CageInput[]; grid: Grid }) => Promise<CheckResult>;
    autoFillNotes: (input: { cages: CageInput[]; grid: Grid }) => Promise<number[][]>;
  };
  result: {
    save: (input: {
      userId: number;
      puzzleId: number;
      timeSeconds: number;
      hintsUsed: number;
    }) => Promise<SaveResult>;
    highscores: (input?: { puzzleId?: number }) => Promise<HighscoreList>;
    stats: (input: { userId: number }) => Promise<UserStats>;
    export: (input: { format: 'csv' | 'json'; puzzleId?: number }) => Promise<ExportResult>;
    bestForPuzzle: (input: {
      userId: number;
      puzzleId: number;
    }) => Promise<{ best: BestForPuzzle | null }>;
    streak: (input: { userId: number }) => Promise<StreakInfo>;
    history: (input: { userId: number; limit?: number }) => Promise<SolveHistory>;
  };
  settings: {
    get: (input: { key: string; userId?: number }) => Promise<SettingGet>;
    set: (input: { key: string; value: string; userId?: number }) => Promise<SettingSet>;
    clearProgress: (input: { userId: number }) => Promise<ClearProgressResult>;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  file: {
    save: (input: {
      dataBase64: string;
      defaultName: string;
      filters: Array<{ name: string; extensions: string[] }>;
    }) => Promise<ExportResult>;
  };
  db: {
    status: () => Promise<DbStatus>;
    onStatus: (cb: (status: DbStatus) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

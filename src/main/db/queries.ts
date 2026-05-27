import { many, one, run, tx } from './index';
import type {
  CageInput,
  Difficulty,
  HighscoreEntry,
  Puzzle,
  PuzzleSummary,
  User
} from '@shared/types';

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

interface PuzzleRow {
  id: number;
  name: string;
  difficulty: number;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

interface CageRow {
  id: number;
  target_sum: number;
}

interface CageCellRow {
  cage_id: number;
  cell_index: number;
}

interface HighscoreRow {
  username: string;
  time_seconds: number;
  hints_used: number;
  score: number;
  completed_at: string;
}

interface SettingRow {
  setting_value: string | null;
}

interface OwnerRow {
  created_by: number;
}

function toUser(row: UserRow): User {
  return { id: row.id, username: row.username, createdAt: row.created_at };
}

export function findUserByUsername(username: string): { user: User; hash: string } | null {
  const row = one<UserRow>(
    'SELECT id, username, password_hash, created_at FROM users WHERE LOWER(username) = LOWER(?)',
    [username]
  );
  if (!row) return null;
  return { user: toUser(row), hash: row.password_hash };
}

export function insertUser(username: string, passwordHash: string): User {
  const res = run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [
    username,
    passwordHash
  ]);
  const row = one<UserRow>(
    'SELECT id, username, password_hash, created_at FROM users WHERE id = ?',
    [Number(res.lastInsertRowid)]
  );
  if (!row) throw new Error('Inserted user not found');
  return toUser(row);
}

export function insertPuzzle(
  name: string,
  difficulty: Difficulty,
  cages: CageInput[],
  createdBy: number
): number {
  return tx(() => {
    const puzId = Number(
      run('INSERT INTO puzzles (name, difficulty, created_by) VALUES (?, ?, ?)', [
        name,
        difficulty,
        createdBy
      ]).lastInsertRowid
    );
    for (const cage of cages) {
      const cageId = Number(
        run('INSERT INTO cages (puzzle_id, target_sum) VALUES (?, ?)', [
          puzId,
          cage.targetSum
        ]).lastInsertRowid
      );
      for (const cell of cage.cells) {
        run('INSERT INTO cage_cells (cage_id, cell_index) VALUES (?, ?)', [cageId, cell]);
      }
    }
    return puzId;
  });
}

export function listPuzzles(difficulty?: Difficulty): PuzzleSummary[] {
  const sql = `SELECT p.id, p.name, p.difficulty, p.created_by, u.username AS created_by_name, p.created_at
    FROM puzzles p
    JOIN users u ON u.id = p.created_by
    ${difficulty ? 'WHERE p.difficulty = ?' : ''}
    ORDER BY datetime(p.created_at) DESC, p.id DESC`;
  const params = difficulty ? [difficulty] : [];
  const rows = many<PuzzleRow>(sql, params);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    difficulty: r.difficulty as Difficulty,
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    createdAt: r.created_at
  }));
}

export function getPuzzle(id: number): Puzzle | null {
  const head = one<PuzzleRow>(
    `SELECT p.id, p.name, p.difficulty, p.created_by, u.username AS created_by_name, p.created_at
     FROM puzzles p
     JOIN users u ON u.id = p.created_by
     WHERE p.id = ?`,
    [id]
  );
  if (!head) return null;

  const cageRows = many<CageRow>(
    'SELECT id, target_sum FROM cages WHERE puzzle_id = ? ORDER BY id ASC',
    [id]
  );
  const cellRows = many<CageCellRow>(
    `SELECT cc.cage_id, cc.cell_index
     FROM cage_cells cc
     JOIN cages c ON c.id = cc.cage_id
     WHERE c.puzzle_id = ?
     ORDER BY cc.cage_id ASC, cc.cell_index ASC`,
    [id]
  );

  const cellsByCage = new Map<number, number[]>();
  for (const cr of cellRows) {
    const arr = cellsByCage.get(cr.cage_id) ?? [];
    arr.push(cr.cell_index);
    cellsByCage.set(cr.cage_id, arr);
  }

  return {
    id: head.id,
    name: head.name,
    difficulty: head.difficulty as Difficulty,
    createdBy: head.created_by,
    createdByName: head.created_by_name,
    createdAt: head.created_at,
    cages: cageRows.map((c) => ({
      id: c.id,
      targetSum: c.target_sum,
      cells: cellsByCage.get(c.id) ?? []
    })),
    givens: Array(81).fill(null)
  };
}

export function deletePuzzleOwnedBy(puzzleId: number, userId: number): boolean {
  const row = one<OwnerRow>('SELECT created_by FROM puzzles WHERE id = ?', [puzzleId]);
  if (!row) return false;
  if (row.created_by !== userId) throw new Error('Only the creator can delete this puzzle');
  const res = run('DELETE FROM puzzles WHERE id = ?', [puzzleId]);
  return res.changes > 0;
}

export function insertResult(
  userId: number,
  puzzleId: number,
  timeSeconds: number,
  hintsUsed: number,
  score: number
): void {
  run(
    'INSERT INTO results (user_id, puzzle_id, time_seconds, hints_used, score) VALUES (?, ?, ?, ?, ?)',
    [userId, puzzleId, timeSeconds, hintsUsed, score]
  );
}

interface AggregateRow {
  total_solved: number;
  best_time: number | null;
  avg_time: number | null;
  best_score: number | null;
  total_hints: number | null;
}

interface DifficultyAggregateRow {
  difficulty: number;
  solved: number;
  best_time: number | null;
  avg_time: number | null;
}

export function getUserStats(userId: number): {
  totals: AggregateRow;
  byDifficulty: DifficultyAggregateRow[];
} {
  const totals = one<AggregateRow>(
    `SELECT
       COUNT(*) AS total_solved,
       MIN(time_seconds) AS best_time,
       AVG(time_seconds) AS avg_time,
       MAX(score) AS best_score,
       SUM(hints_used) AS total_hints
     FROM results
     WHERE user_id = ?`,
    [userId]
  ) ?? { total_solved: 0, best_time: null, avg_time: null, best_score: null, total_hints: 0 };

  const byDifficulty = many<DifficultyAggregateRow>(
    `SELECT p.difficulty AS difficulty,
            COUNT(*) AS solved,
            MIN(r.time_seconds) AS best_time,
            AVG(r.time_seconds) AS avg_time
     FROM results r
     JOIN puzzles p ON p.id = r.puzzle_id
     WHERE r.user_id = ?
     GROUP BY p.difficulty
     ORDER BY p.difficulty ASC`,
    [userId]
  );

  return { totals, byDifficulty };
}

interface BestRow {
  time_seconds: number;
  hints_used: number;
  score: number;
  completed_at: string;
}

export function getBestForUserPuzzle(
  userId: number,
  puzzleId: number
): BestRow | null {
  const row = one<BestRow>(
    `SELECT time_seconds, hints_used, score, completed_at
     FROM results
     WHERE user_id = ? AND puzzle_id = ?
     ORDER BY score DESC, time_seconds ASC, hints_used ASC
     LIMIT 1`,
    [userId, puzzleId]
  );
  return row ?? null;
}

interface CompletionDateRow {
  day: string;
}

export function getCompletionDays(userId: number): string[] {
  // Local-date strings (YYYY-MM-DD) for every solve. SQLite stores UTC datetime,
  // so we convert to localtime before truncating.
  const rows = many<CompletionDateRow>(
    `SELECT DISTINCT date(completed_at, 'localtime') AS day
     FROM results
     WHERE user_id = ?
     ORDER BY day DESC`,
    [userId]
  );
  return rows.map((r) => r.day);
}

interface ResultHistoryRow {
  completed_at: string;
  time_seconds: number;
  hints_used: number;
  score: number;
  difficulty: number;
  puzzle_name: string;
}

export function getResultHistory(
  userId: number,
  limit: number
): ResultHistoryRow[] {
  return many<ResultHistoryRow>(
    `SELECT r.completed_at, r.time_seconds, r.hints_used, r.score,
            p.difficulty, p.name AS puzzle_name
       FROM results r
       JOIN puzzles p ON p.id = r.puzzle_id
      WHERE r.user_id = ?
      ORDER BY datetime(r.completed_at) DESC, r.id DESC
      LIMIT ?`,
    [userId, limit]
  );
}

export function deleteProgressSettingsFor(userId: number): number {
  const res = run(
    `DELETE FROM app_settings
     WHERE user_id = ? AND setting_key LIKE 'progress:%'`,
    [userId]
  );
  return res.changes;
}

export function listHighscores(puzzleId?: number): HighscoreEntry[] {
  const sql = `SELECT u.username, r.time_seconds, r.hints_used, r.score, r.completed_at
    FROM results r
    JOIN users u ON u.id = r.user_id
    ${puzzleId ? 'WHERE r.puzzle_id = ?' : ''}
    ORDER BY r.score DESC, r.time_seconds ASC, r.hints_used ASC
    LIMIT 50`;
  const params = puzzleId ? [puzzleId] : [];
  const rows = many<HighscoreRow>(sql, params);
  return rows.map((r) => ({
    username: r.username,
    timeSeconds: r.time_seconds,
    hintsUsed: r.hints_used,
    score: r.score,
    completedAt: r.completed_at
  }));
}

export function getSetting(key: string, userId?: number): string | null {
  const sql = userId
    ? 'SELECT setting_value FROM app_settings WHERE setting_key = ? AND user_id = ? LIMIT 1'
    : 'SELECT setting_value FROM app_settings WHERE setting_key = ? AND user_id IS NULL LIMIT 1';
  const params = userId ? [key, userId] : [key];
  const row = one<SettingRow>(sql, params);
  return row?.setting_value ?? null;
}

export function setSetting(key: string, value: string, userId?: number): void {
  const existing = getSetting(key, userId);
  if (existing === null) {
    run(
      'INSERT INTO app_settings (setting_key, setting_value, user_id) VALUES (?, ?, ?)',
      [key, value, userId ?? null]
    );
  } else {
    const sql = userId
      ? 'UPDATE app_settings SET setting_value = ? WHERE setting_key = ? AND user_id = ?'
      : 'UPDATE app_settings SET setting_value = ? WHERE setting_key = ? AND user_id IS NULL';
    const params = userId ? [value, key, userId] : [value, key];
    run(sql, params);
  }
}

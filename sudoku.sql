-- KillerSudoku schema (SQLite). The app runs this on every launch (idempotent).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS puzzles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
  created_by INTEGER NOT NULL,
  is_daily BOOLEAN NOT NULL DEFAULT 0,
  daily_date TEXT, -- YYYY-MM-DD
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  puzzle_id INTEGER NOT NULL,
  target_sum INTEGER NOT NULL,
  FOREIGN KEY (puzzle_id) REFERENCES puzzles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cage_cells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cage_id INTEGER NOT NULL,
  cell_index INTEGER NOT NULL CHECK (cell_index BETWEEN 0 AND 80),
  FOREIGN KEY (cage_id) REFERENCES cages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  puzzle_id INTEGER NOT NULL,
  time_seconds INTEGER NOT NULL,
  hints_used INTEGER NOT NULL,
  score INTEGER NOT NULL,
  streak_multiplier REAL NOT NULL DEFAULT 1.0,
  xp_gained INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (puzzle_id) REFERENCES puzzles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cosmetics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'cell_theme', 'animation'
  key TEXT NOT NULL UNIQUE,
  unlock_level INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_cosmetics (
  user_id INTEGER NOT NULL,
  cosmetic_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, cosmetic_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (cosmetic_id) REFERENCES cosmetics(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  user_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

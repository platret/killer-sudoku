import Database, { type RunResult } from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import schema from '../../../sudoku.sql?raw';

let db: Database.Database | null = null;
let lastError: string | null = null;
let dbPath: string | null = null;

export interface DbInitResult {
  ok: boolean;
  error?: string;
  path?: string;
}

export function initDb(): DbInitResult {
  try {
    const userData = app.getPath('userData');
    if (!fs.existsSync(userData)) {
      fs.mkdirSync(userData, { recursive: true });
    }
    const target = path.join(userData, 'killersudoku.db');
    
    // Check if we can write to the directory
    try {
      const testFile = path.join(userData, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (e) {
      console.error(`[db] userData directory is not writable: ${userData}`, e);
    }

    const handle = new Database(target, { 
      timeout: 10000 // Increased timeout for slow disks/locks
    });
    handle.pragma('journal_mode = WAL');
    handle.pragma('foreign_keys = ON');
    
    if (schema) {
      handle.exec(schema);
    }

    // Apply migrations for existing installations (idempotent)
    const migrations = [
      "ALTER TABLE users ADD COLUMN xp INTEGER NOT NULL DEFAULT 0;",
      "ALTER TABLE users ADD COLUMN level INTEGER NOT NULL DEFAULT 1;",
      "ALTER TABLE puzzles ADD COLUMN is_daily BOOLEAN NOT NULL DEFAULT 0;",
      "ALTER TABLE puzzles ADD COLUMN daily_date TEXT;",
      "ALTER TABLE results ADD COLUMN streak_multiplier REAL NOT NULL DEFAULT 1.0;",
      "ALTER TABLE results ADD COLUMN xp_gained INTEGER NOT NULL DEFAULT 0;"
    ];

    for (const m of migrations) {
      try {
        handle.exec(m);
      } catch (e) {
        // Ignore "duplicate column name" or similar errors
      }
    }

    db = handle;
    dbPath = target;
    lastError = null;
    return { ok: true, path: target };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[db] init error:', msg);
    lastError = msg;
    db = null;
    return { ok: false, error: msg };
  }
}

export function getDb(): Database.Database {
  if (!db) throw new Error(lastError ?? 'Database not initialized');
  return db;
}

export function getDbPath(): string | null {
  return dbPath;
}

export function getLastError(): string | null {
  return lastError;
}

export type Param = string | number | bigint | Buffer | null;

export function one<T>(sql: string, params: Param[] = []): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

export function many<T>(sql: string, params: Param[] = []): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

export function run(sql: string, params: Param[] = []): RunResult {
  return getDb().prepare(sql).run(...params);
}

export function exec(sql: string): void {
  getDb().exec(sql);
}

export function tx<T>(fn: () => T): T {
  return getDb().transaction(fn)();
}

export function closeDb(): void {
  if (db) {
    try { db.close(); } catch { /* ignore */ }
    db = null;
  }
}

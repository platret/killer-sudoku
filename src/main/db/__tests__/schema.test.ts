import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const schemaSql = fs.readFileSync(
  path.resolve(__dirname, '../../../../sudoku.sql'),
  'utf8'
);

describe('sudoku.sql schema (covers TC-45)', () => {
  it('enables foreign keys via PRAGMA', () => {
    expect(schemaSql).toMatch(/PRAGMA\s+foreign_keys\s*=\s*ON/i);
  });

  it('declares all 6 required tables', () => {
    for (const table of ['users', 'puzzles', 'cages', 'cage_cells', 'results', 'app_settings']) {
      expect(schemaSql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, 'i'));
    }
  });

  it('TC-45 cages cascade on puzzle delete', () => {
    expect(schemaSql).toMatch(
      /FOREIGN KEY \(puzzle_id\) REFERENCES puzzles\(id\) ON DELETE CASCADE/i
    );
  });

  it('TC-45 cage_cells cascade on cage delete', () => {
    expect(schemaSql).toMatch(
      /FOREIGN KEY \(cage_id\) REFERENCES cages\(id\) ON DELETE CASCADE/i
    );
  });

  it('TC-45 results cascade on puzzle delete and on user delete', () => {
    expect(schemaSql).toMatch(
      /FOREIGN KEY \(user_id\) REFERENCES users\(id\) ON DELETE CASCADE/i
    );
    expect(schemaSql).toMatch(
      /FOREIGN KEY \(puzzle_id\) REFERENCES puzzles\(id\) ON DELETE CASCADE/i
    );
  });

  it('puzzles cascade on owning user delete', () => {
    expect(schemaSql).toMatch(
      /FOREIGN KEY \(created_by\) REFERENCES users\(id\) ON DELETE CASCADE/i
    );
  });

  it('app_settings cascade on user delete (per-user settings vanish with the account)', () => {
    expect(schemaSql).toMatch(
      /CREATE TABLE IF NOT EXISTS app_settings[\s\S]*?FOREIGN KEY \(user_id\) REFERENCES users\(id\) ON DELETE CASCADE/i
    );
  });
});

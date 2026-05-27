import bcrypt from 'bcryptjs';
import { many, one, run } from './index';
import { generateUniquePuzzle } from '../services/generatorService';
import type { CageInput, Difficulty } from '@shared/types';
import { insertPuzzle } from './queries';

interface IdRow { id: number }
interface CountRow { n: number }
interface SummaryRow { id: number; name: string; difficulty: number; cage_count: number; cell_count: number }

const SEED_NAMES: Array<{ name: string; difficulty: Difficulty }> = [
  { name: 'Seed: Easy Drift', difficulty: 1 },
  { name: 'Seed: Medium Cascade', difficulty: 2 },
  { name: 'Seed: Hard Lattice', difficulty: 3 }
];

function ensureDemoUser(): number {
  const row = one<IdRow>('SELECT id FROM users WHERE username = ?', ['demo']);
  if (row) return row.id;
  const hash = bcrypt.hashSync('demo1234', 10);
  const res = run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [
    'demo',
    hash
  ]);
  return Number(res.lastInsertRowid);
}

export async function runSeed(): Promise<void> {
  const userId = ensureDemoUser();
  console.log(`[seed] demo user id=${userId}`);

  for (const spec of SEED_NAMES) {
    const existing = one<CountRow>(
      'SELECT COUNT(*) AS n FROM puzzles WHERE name = ?',
      [spec.name]
    );
    if ((existing?.n ?? 0) > 0) {
      console.log(`[seed] skip ${spec.name} (already exists)`);
      continue;
    }
    process.stdout.write(`[seed] generating ${spec.name} (difficulty ${spec.difficulty})… `);
    const t0 = Date.now();
    const cages = generateUniquePuzzle(spec.difficulty);
    if (!cages) {
      console.log('FAILED');
      continue;
    }
    const id = insertPuzzle(spec.name, spec.difficulty, cages, userId);
    console.log(`ok #${id} cages=${cages.length} (${Date.now() - t0}ms)`);
  }

  // Ensure Daily Puzzles
  const today = new Date().toISOString().split('T')[0];
  const dailyExists = one<CountRow>(
    'SELECT COUNT(*) AS n FROM puzzles WHERE is_daily = 1 AND daily_date = ?',
    [today]
  );

  if ((dailyExists?.n ?? 0) === 0) {
    process.stdout.write(`[seed] generating daily puzzle for ${today}… `);
    const t0 = Date.now();
    // Daily puzzles are always difficulty 2 (Medium) for balance
    const cages = generateUniquePuzzle(2);
    if (cages) {
      const id = insertPuzzle(`Daily Puzzle ${today}`, 2, cages, userId, true, today);
      console.log(`ok #${id} (${Date.now() - t0}ms)`);
    } else {
      console.log('FAILED');
    }
  }

  const summary = many<SummaryRow>(
    `SELECT p.id, p.name, p.difficulty,
            (SELECT COUNT(*) FROM cages WHERE puzzle_id = p.id) AS cage_count,
            (SELECT COUNT(*) FROM cage_cells cc JOIN cages c ON c.id = cc.cage_id WHERE c.puzzle_id = p.id) AS cell_count
     FROM puzzles p
     WHERE p.name LIKE 'Seed:%' OR p.is_daily = 1
     ORDER BY p.is_daily DESC, p.difficulty ASC, p.id ASC`
  );
  console.log('[seed] summary:');
  for (const row of summary) {
    console.log(
      `  #${row.id} ${row.name} difficulty=${row.difficulty} cages=${row.cage_count} cells=${row.cell_count}`
    );
  }
}

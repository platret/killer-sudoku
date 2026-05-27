import bcrypt from 'bcryptjs';
import { many, one, run } from './index';
import { generateUniquePuzzle } from '../services/generatorService';
import type { CageInput, Difficulty } from '@shared/types';

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

function insertSeedPuzzle(
  userId: number,
  name: string,
  difficulty: Difficulty,
  cages: CageInput[]
): number {
  const puzId = Number(
    run('INSERT INTO puzzles (name, difficulty, created_by) VALUES (?, ?, ?)', [
      name,
      difficulty,
      userId
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
    const id = insertSeedPuzzle(userId, spec.name, spec.difficulty, cages);
    console.log(`ok #${id} cages=${cages.length} (${Date.now() - t0}ms)`);
  }

  const summary = many<SummaryRow>(
    `SELECT p.id, p.name, p.difficulty,
            (SELECT COUNT(*) FROM cages WHERE puzzle_id = p.id) AS cage_count,
            (SELECT COUNT(*) FROM cage_cells cc JOIN cages c ON c.id = cc.cage_id WHERE c.puzzle_id = p.id) AS cell_count
     FROM puzzles p
     WHERE p.name LIKE 'Seed:%'
     ORDER BY p.difficulty ASC, p.id ASC`
  );
  console.log('[seed] summary:');
  for (const row of summary) {
    console.log(
      `  #${row.id} ${row.name} difficulty=${row.difficulty} cages=${row.cage_count} cells=${row.cell_count}`
    );
  }
}

<div align="center">

# KillerSudoku

#### A bold, dark, keyboard-first Killer Sudoku for desktop. Built with Electron, React, SQLite and paper-shaders.

<br />

[![Electron](https://img.shields.io/badge/Electron-33.x-9feaf9?logo=electron&logoColor=white&labelColor=0a0612)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.3-c084fc?logo=react&logoColor=white&labelColor=0a0612)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-67e8f9?logo=typescript&logoColor=white&labelColor=0a0612)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-fbbf24?logo=sqlite&logoColor=white&labelColor=0a0612)](https://github.com/WiseLibs/better-sqlite3)
[![Tests](https://img.shields.io/badge/tests-54%2F54%20passing-34d399?labelColor=0a0612)](#testing)
[![License](https://img.shields.io/badge/license-MIT-a855f7?labelColor=0a0612)](LICENSE)

<br />

</div>

---

## What it is

A complete desktop **Killer Sudoku** game — the cage / sum variant where every cell belongs to a dashed region with a target sum.
Built from scratch as a single-player, local-first Electron app: no server, no telemetry, no account on someone else's machine.

Every published puzzle is **provably unique**. A backtracking solver with MRV heuristics verifies one and only one solution exists before anything is saved. Generate random puzzles on demand, design your own, or solve the curated seeds.

<br />

## ✨ Highlights

| | |
|---|---|
| 🧩 **Solver-verified puzzles** | Every save runs the puzzle through a uniqueness-checking backtracker. Non-unique or unsolvable encodings are rejected before they hit the disk. |
| 🎨 **Animated paper-shaders + 3D hero** | Mesh-gradient + grain-gradient WebGL backdrops on the start and home screens. A `@react-three/fiber` cube hero on the landing page. Pauses on blur, respects reduced-motion. |
| ⌨️ **Keyboard-first** | Full arrow / digit / `N` / `H` / `Ctrl+Z` / `Ctrl+Y` shortcuts. ⌘K command palette with cmdk. `?` overlay lists every binding. |
| 🎯 **Killer-specific UX** | Live "needs N more" cage helper, dashed cage outlines, matching-number highlight in cyan, conflict shake animation. |
| 🎲 **Random generator** | "Surprise me" button generates a uniquely-solvable puzzle in seconds (reuses the solver — same code path as the seed). |
| 📊 **Stats / profile** | Aggregated per-user — total solved, best time, average, hints used, per-difficulty breakdown. Live proof the relational schema does real work. |
| 🏁 **Forfeit + win celebration** | Confetti burst on completion via Motion. Forfeit reveals the solution but skips the highscore. |
| 🖼️ **PNG + WebM export** | Export the solved board as a 1080×1080 PNG card (player · time · score · hints) or a 4-second WebM celebration video. |
| 💾 **Resume in-progress** | Closes mid-solve? Reopen and the grid, notes, timer, and hint count come back. |
| 🏆 **Highscores + CSV/JSON export** | Per-puzzle and global leaderboards with score-desc, time-asc, hints-asc tiebreaks. One-click report download. |
| 🔒 **bcryptjs auth** | Local accounts hashed with bcrypt. Case-insensitive lookup. No plaintext anywhere. |
| 🧪 **54 unit tests** | Solver, validation, score, hint, auth, puzzle, result services + schema cascade audit. All passing. |

<br />

## 🛠 Tech stack

| Layer | Choice |
|---|---|
| Shell | **Electron 33** with `electron-vite` |
| UI | **React 18** · TypeScript strict · **Tailwind CSS 3.4** |
| Animation | **`motion/react` v12** + custom **Canvas confetti** |
| Shaders | **`@paper-design/shaders-react`** (`MeshGradient`, `GrainGradient`) |
| 3D | **`three`** + **`@react-three/fiber`** |
| Storage | **`better-sqlite3`** — synchronous, WAL mode, foreign keys ON |
| Auth | **`bcryptjs`** (pure JS, no native binding) |
| Tests | **Vitest** |
| Packaging | **`electron-builder`** → Windows portable `.exe` |

<br />

## 📁 Project structure

```
src/
  shared/types.ts             # IPC contract — single source of truth
  main/                       # Electron main process = backend
    index.ts                  # Lifecycle, CSP, windows, --seed mode
    preload.ts                # contextBridge exposing electronAPI
    ipc/                      # One file per domain: auth, puzzle, solver,
                              # result, settings, window, file
    services/                 # Pure business logic
      solverService.ts        # Backtracking + MRV + uniqueness count
      generatorService.ts     # Random puzzle generation (shared with seed)
      authService.ts          # bcrypt register/login, case-insensitive
      puzzleService.ts        # Create / validate / list / delete
      resultService.ts        # Score + persistence
      statsService.ts         # Aggregated per-user stats
    db/
      index.ts                # better-sqlite3 pool, WAL, PRAGMA fk=ON
      queries.ts              # All prepared statements
      seed.ts                 # Demo user + 3 verified-unique puzzles
  renderer/                   # React UI
    App.tsx                   # View routing + ErrorBoundary
    pages/                    # StartPage, AuthPage, PuzzleListPage,
                              # SolvePage, CreatePage, HighscorePage, StatsPage
    components/
      animations/             # ShaderBackground, HomeBackdrop, HeroCubes,
                              # ConfettiBurst, AnimatedNumber, EmptyState
      sudoku/                 # Grid, Cell, CageLayer, NumberPad, Timer
      palette/                # ⌘K command palette (cmdk)
      shortcuts/              # ? help overlay
    lib/
      exportCard.ts           # PNG / WebM card rendering on offscreen canvas
sudoku.sql                    # SQLite schema (PRAGMA fk=ON, PKs, CASCADE FKs)
docs/
  plan.md                     # Architecture decisions
  review.md                   # Acceptance criteria audit
  test-protocol.md            # 45-TC verification matrix
```

<br />

## 🚀 Quick start

```bash
git clone https://github.com/platret/killer-sudoku.git
cd killer-sudoku
npm install
npm run rebuild              # rebuilds better-sqlite3 against Electron's Node ABI
npm run db:seed              # creates demo user + 3 verified-unique seed puzzles
npm run dev                  # opens the Electron window
```

Sign in as **`demo` / `demo1234`** (case-insensitive), or hit **Create an account**.

> **Note:** `npm run rebuild` is required after a fresh `npm install` because `better-sqlite3` is a native module compiled against Electron's Node ABI rather than the host Node ABI.

<br />

## 🏗 Build for Windows

```bash
npx vitest run                                        # 54/54 must pass
npm run build:win                                     # outputs executable/KillerSudoku.exe
```

The Windows portable `.exe` is produced by `electron-builder` with `asarUnpack` on `better-sqlite3` and `npmRebuild: true` so the native binary is rebuilt on the target.

<br />

## ⌨️ Controls

| Key | Action |
|---|---|
| `←` `↑` `→` `↓` | Move selection |
| `1` – `9` | Enter digit (or note if N is active) |
| `Backspace` · `0` · `Delete` | Clear cell |
| `N` | Toggle notes mode |
| `H` | Reveal a hint |
| `Ctrl+Z` · `Ctrl+Y` | Undo / redo |
| `Ctrl+K` · `⌘K` | Command palette |
| `?` | Keyboard shortcuts overlay |

<br />

## 🗄 Database schema

Six tables, all foreign keys with `ON DELETE CASCADE`. One SQLite file at `userData/killersudoku.db` opened in WAL mode.

```
users (id, username UNIQUE, password_hash, created_at)
  └── puzzles (id, name, difficulty, created_by → users.id, created_at)
       ├── cages (id, puzzle_id → puzzles.id, target_sum)
       │    └── cage_cells (id, cage_id → cages.id, cell_index)
       └── results (id, user_id, puzzle_id, time_seconds, hints_used, score, completed_at)
  └── app_settings (id, setting_key, setting_value, user_id?)
```

Schema is the single source of truth in [`sudoku.sql`](sudoku.sql), loaded into SQLite via Vite's `?raw` import on every launch (idempotent via `CREATE TABLE IF NOT EXISTS`).

<br />

## 🎯 Scoring

```
score = max(0, 10000 − time_seconds × 5 − hints_used × 500)
```

Higher is better. Highscores are ordered `score DESC, time_seconds ASC, hints_used ASC`. Forfeits skip the leaderboard entirely.

The "every completed grid must sum to 405" check (`9 × 45`) gates uniqueness verification before the more expensive backtracking solver runs.

<br />

## 🧪 Testing

```bash
npm test
```

| Suite | Cases | Coverage |
|---|---:|---|
| `solverService.test.ts` | 18 | TC-13, 15-18, 22-24, 27-30, 34-36 |
| `authService.test.ts` | 8 | TC-03 → TC-10 |
| `puzzleService.test.ts` | 14 | TC-11 → TC-18, TC-43, TC-44 |
| `resultService.test.ts` | 7 | TC-25, TC-27, TC-31, TC-33 |
| `schema.test.ts` | 7 | TC-45 (cascade audit on `sudoku.sql`) |
| **Total** | **54** | **all 45 protocol TCs** mapped in [`docs/test-protocol.md`](docs/test-protocol.md) |

Service tests don't need a live DB — `better-sqlite3` is mocked via `vi.mock('@main/db/queries', …)` with in-memory state, so the real service code runs against an in-process fake.

<br />

## 🤝 IPC contract

The renderer talks to the main process only through `window.electronAPI`. Channels are typed end-to-end in [`src/shared/types.ts`](src/shared/types.ts).

```
auth.register / login / logout
puzzle.validate / create / list / get / delete / generate
solver.solve / hint / check
result.save / highscores / stats / export
settings.get / set
window.minimize / maximize / close
file.save                    # generic base64 → disk via native save dialog
db.status / db.onStatus
```

<br />

## 📜 License

[MIT](LICENSE) © 2026 Alex Platret

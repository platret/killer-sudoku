# KillerSudoku — Architecture Plan

Windows-only Electron desktop app. Local-first Killer-Sudoku with MySQL persistence.
The Electron **main process is the backend**. No separate server.

---

## Stack

| Layer        | Choice |
|--------------|--------|
| Shell        | Electron + `electron-vite` |
| UI           | React 18 + TypeScript strict + Tailwind + shadcn/ui + Magic UI |
| Animation    | `motion/react` v12 (never `framer-motion`) |
| Shader       | `@paper-design/shaders-react` `MeshGradient` (Start + Auth only) |
| Backend      | Electron main process |
| DB driver    | `mysql2/promise` (pure JS, pooled) |
| Hashing      | `bcryptjs` (pure JS) |
| Tests        | Vitest |
| Packaging    | `electron-builder` → Windows portable `.exe` |

No native modules. `mysql2` + `bcryptjs` externalized in main build → zero ABI rebuild risk.

---

## File Tree

```
src/
  shared/types.ts
  main/
    index.ts
    preload.ts
    ipc/{auth,puzzle,solver,result,settings,window}.ts
    services/{authService,puzzleService,solverService,resultService,settingsService}.ts
    services/__tests__/solverService.test.ts
    db/{config,index,queries}.ts
  renderer/
    main.tsx
    App.tsx
    index.css
    index.html
    assets/icon.png
    lib/{utils,ipc,store,shortcuts}.ts
    components/
      ui/*                     (shadcn primitives)
      layout/{TitleBar,Shell,DbErrorScreen}.tsx
      animations/{ShaderBackground,AnimatedNumber,PageTransition,EmptyState}.tsx
      sudoku/{Grid,Cell,CageLayer,NumberPad,Timer}.tsx
      palette/CommandPalette.tsx
      shortcuts/ShortcutsOverlay.tsx
    pages/{StartPage,AuthPage,PuzzleListPage,SolvePage,CreatePage,HighscorePage}.tsx
sudoku.sql
electron-builder.yml
electron.vite.config.ts
vitest.config.ts
tsconfig.json
tailwind.config.ts
postcss.config.js
package.json
docs/{plan.md,review.md}
```

---

## IPC Contract (renderer → main, via `window.electronAPI`)

| Channel               | Input                                                            | Returns |
|-----------------------|------------------------------------------------------------------|---------|
| `auth:register`       | `{username, password}`                                           | `{success, user?, error?}` |
| `auth:login`          | `{username, password}`                                           | `{success, user?, error?}` |
| `auth:logout`         | —                                                                | `{success}` |
| `puzzle:validate`     | `{cages}`                                                        | `{sumValid, solvable, unique, error?}` |
| `puzzle:create`       | `{name, difficulty, cages, createdBy}`                           | `{success, puzzleId?, error?}` |
| `puzzle:list`         | `{difficulty?}`                                                  | `{puzzles}` |
| `puzzle:get`          | `{id}`                                                           | `{puzzle}` |
| `puzzle:delete`       | `{puzzleId, userId}`                                             | `{success, error?}` |
| `solver:solve`        | `{cages, givens?}`                                               | `{solution}` |
| `solver:hint`         | `{cages, grid, selectedIndex?}`                                  | `{cellIndex, value} \| {error}` |
| `solver:check`        | `{cages, grid}`                                                  | `CheckResult` |
| `result:save`         | `{userId, puzzleId, timeSeconds, hintsUsed}`                     | `{success, score}` |
| `result:highscores`   | `{puzzleId?}`                                                    | `{entries}` |
| `settings:get`        | `{key, userId?}`                                                 | `{value}` |
| `settings:set`        | `{key, value, userId?}`                                          | `{success}` |
| `window:minimize`     | —                                                                | void |
| `window:maximize`     | —                                                                | void |
| `window:close`        | —                                                                | void |
| `db:status`           | —                                                                | `{ok, error?}` |

All handlers wrap in try/catch and return a structured error object on failure.

---

## MySQL Schema (database `sudoku`)

| Table         | Columns                                                                                    | Keys |
|---------------|--------------------------------------------------------------------------------------------|------|
| `users`       | id PK AI, username VARCHAR(20) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP | — |
| `puzzles`     | id PK AI, name VARCHAR(100) NOT NULL, difficulty TINYINT NOT NULL, created_by INT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP | FK created_by→users(id) |
| `cages`       | id PK AI, puzzle_id INT NOT NULL, target_sum INT NOT NULL                                  | FK puzzle_id→puzzles(id) ON DELETE CASCADE |
| `cage_cells`  | id PK AI, cage_id INT NOT NULL, cell_index TINYINT NOT NULL                                | FK cage_id→cages(id) ON DELETE CASCADE |
| `results`     | id PK AI, user_id INT NOT NULL, puzzle_id INT NOT NULL, time_seconds INT NOT NULL, hints_used INT NOT NULL, score INT NOT NULL, completed_at DATETIME DEFAULT CURRENT_TIMESTAMP | FK user_id→users(id) ON DELETE CASCADE, FK puzzle_id→puzzles(id) ON DELETE CASCADE |
| `app_settings`| id PK AI, setting_key VARCHAR(50) NOT NULL, setting_value VARCHAR(255), user_id INT NULL   | FK user_id→users(id) ON DELETE CASCADE |

Startup migration runs `CREATE TABLE IF NOT EXISTS` for each (idempotent).

---

## Domain Rules

- Index ↔ row/col/box: `row = ⌊i/9⌋`, `col = i mod 9`, `box = ⌊row/3⌋·3 + ⌊col/3⌋`.
- **Sum-405 check**: a completed 9×9 grid totals `9·(1+…+9) = 9·45 = 405`. Every cell belongs to exactly one cage, so `Σ cage.targetSum == 405` is a necessary condition. Cheap O(1) gate before solver.
- **Solver**: backtracking + constraint propagation. Pick cell by MRV (fewest candidates first). Candidates for cell = `{1..9}` ∩ row-free ∩ col-free ∩ box-free ∩ cage-free (no repeat in cage) ∩ cage-can-still-reach-target.
- **Uniqueness**: count solutions, abort at 2. `unique = count === 1`. `solvable = count >= 1`.
- **Hint**: solve uniquely, reveal value at `selectedIndex` if empty else first empty index; bumps `hintsUsed`.
- **Score**: `Math.max(0, 10000 − timeSeconds·5 − hintsUsed·500)`. Higher is better.
- **Highscore sort**: score DESC, timeSeconds ASC, hintsUsed ASC.

---

## Chosen Additional Use Cases (3)

1. **Pencil-mark notes** — small candidate digits 1–9 on empty cells. Toggle with `N`. Filled cell ignores notes.  *Why: standard sudoku UX, low effort, big perceived polish.*
2. **Undo / redo** — full move history. `Ctrl+Z` / `Ctrl+Y`. Empty stack = no-op.  *Why: required for any serious solving experience.*
3. **Delete own puzzle** — creator-only, behind confirm modal, cascades to cages + results.  *Why: covers an authorization rule + a destructive-action UX path.*

---

## Optional High-Impact Features (4)

1. **Command palette** (`Ctrl+K`) via shadcn `Command` (cmdk). Verbs: navigate views, new puzzle, auto solve, hint, logout.
2. **Keyboard shortcuts + `?` overlay** — arrows move, `1-9` digit, `Backspace`/`0` clear, `N` notes, `H` hint, `Ctrl+Z`/`Y` undo/redo.
3. **Animated number counters** (Motion `useMotionValue` + `useTransform`) for the live timer and final score.
4. **Window state persistence** — width/height/x/y saved in `app_settings` on resize/move/close, restored on launch.

---

## Shader Decision

- **Where**: Start + Auth screens only. One instance app-wide.
- **What**: `@paper-design/shaders-react` `MeshGradient`. Palette `#0a0a0a` base, `#1e3a5f` / `#3b82f6` accents. Low speed.
- **Isolation**: `src/renderer/components/animations/ShaderBackground.tsx`. `position: absolute`, `inset: 0`, `pointer-events: none`, behind content.
- **Fallback**: try/catch around shader mount; on failure render a static CSS radial gradient with the same colors.
- **Performance**: pause via `document.visibilitychange` + window `blur`/`focus`.
- **A11y**: gated by `reducedMotion` setting (read from `app_settings`); when true → render static gradient.
- **Removal**: deleting the component import keeps the app fully functional.

---

## Acceptance Criteria Checklist

- [ ] All IPC channels respond with typed returns, wrapped in try/catch.
- [ ] TypeScript strict, zero `any`, zero errors.
- [ ] `contextIsolation: true`, `nodeIntegration: false`, CSP via `onHeadersReceived`.
- [ ] All views render; every view change via Motion + `AnimatePresence`.
- [ ] Lists use staggered Motion children; buttons use `whileTap`/`whileHover`.
- [ ] Custom title bar draggable; minimize/maximize/close work.
- [ ] MySQL pool from `db/config.ts`; idempotent startup migrations; DB-failure screen.
- [ ] `sudoku.sql` runs cleanly on a fresh server with full PK + FK.
- [ ] Solver: solves valid, detects unsolvable, detects non-unique, respects givens.
- [ ] Sum-405 gate runs before the algorithmic check.
- [ ] Notes, undo/redo, delete-own-puzzle wired end-to-end.
- [ ] Ctrl+K palette, shortcuts + `?` overlay, animated counters, window-state persistence all wired.
- [ ] Shader isolated, CSS fallback works, pauses on blur, app works without it.
- [ ] Vitest tests pass (`npx vitest run`).
- [ ] `npx electron-builder --win portable` produces `executable/KillerSudoku.exe`.
- [ ] `docs/plan.md` + `docs/review.md` exist.
- [ ] Logo prompt + `icon.png` instruction printed to console at build start.

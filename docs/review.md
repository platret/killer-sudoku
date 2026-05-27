# KillerSudoku — Checker Report

Automated audit of acceptance criteria from `docs/plan.md`.
Verified: 2026-05-27 on darwin via `tsc --noEmit`, `vitest run`, `electron-vite build`.

---

## Acceptance Criteria

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | All IPC channels respond with typed returns wrapped in try/catch | ✅ | `src/main/ipc/{auth,puzzle,solver,result,settings,window}.ts` — every handler returns structured `{success, error?}` on failure |
| 2 | TypeScript strict, zero `any`, zero errors | ✅ | `npx tsc --noEmit` exits 0 |
| 3 | `contextIsolation:true`, `nodeIntegration:false`, CSP via `onHeadersReceived` | ✅ | `src/main/index.ts:74-79`, `applyCsp()` |
| 4 | Custom title bar (`frame:false`, drag region, controls) | ✅ | `src/main/index.ts:69` `frame:false`; `src/renderer/components/layout/TitleBar.tsx` |
| 5 | Title bar controls call `window.electronAPI.window.*` | ✅ | `TitleBar.tsx` → `api().window.minimize / maximize / close` |
| 6 | Every view change via Motion + `AnimatePresence` | ✅ | `src/renderer/App.tsx` wraps `<ViewSwitch />` in `<AnimatePresence mode="wait">` with a derived `viewKey` |
| 7 | Lists use staggered Motion children | ✅ | `PuzzleListPage`, `HighscorePage`, `StartPage`, `CreatePage` use `variants` + `staggerChildren` |
| 8 | Buttons use `whileTap` (and `whileHover`) | ✅ | `components/ui/Button.tsx` uses `motion.button` with both |
| 9 | MySQL pool from `db/config.ts` | ✅ | `src/main/db/index.ts:initDb()` calls `mysql.createPool(dbConfig)` |
| 10 | Startup migrations idempotent | ✅ | `runMigrations()` uses `CREATE TABLE IF NOT EXISTS` for every table |
| 11 | DB-failure screen, no crash | ✅ | `initDb()` swallows error → `dbStatus` propagates → `App.tsx` renders `<DbErrorScreen />` |
| 12 | `sudoku.sql` complete with PK + FK + dependency order | ✅ | `sudoku.sql` declares 6 tables, 6 FKs with ON DELETE CASCADE where applicable |
| 13 | Solver solves valid puzzles | ✅ | Test `solves a valid puzzle to the unique solution` |
| 14 | Solver detects unsolvable | ✅ | Test `detects unsolvable puzzle (returns 0 solutions)` |
| 15 | Solver detects non-unique | ✅ | Test `detects non-unique puzzle (>=2 solutions)` |
| 16 | Solver respects givens | ✅ | Test `respects givens when solving` |
| 17 | Sum-405 gate before algorithmic check | ✅ | `solverService.validatePuzzle()` short-circuits on `sumValid===false` or coverage fail before invoking `countSolutions` |
| 18 | Pencil-mark notes wired end-to-end | ✅ | `SolvePage.tsx` `toggleNote()` + `Cell.tsx` notes grid; `N` shortcut + NumberPad toggle |
| 19 | Undo / redo wired end-to-end | ✅ | `SolvePage.tsx` `undoStack` + `redoStack`; `Ctrl+Z` / `Ctrl+Y` + buttons |
| 20 | Delete own puzzle behind confirm modal | ✅ | `PuzzleListPage.tsx` `pendingDelete` state + `<Modal />`; backend enforces `created_by === userId` in `deletePuzzleOwnedBy()` |
| 21 | Command palette (`Ctrl+K`) | ✅ | `components/palette/CommandPalette.tsx`, global keydown handler |
| 22 | Shortcuts + `?` overlay | ✅ | `components/shortcuts/ShortcutsOverlay.tsx`; `?` opens it |
| 23 | Animated number counters | ✅ | `AnimatedNumber.tsx` used in `Timer` (seconds) and completion modal (final score) |
| 24 | Window state persistence | ✅ | `src/main/index.ts` `loadBounds()` / `saveBounds()` write JSON to `app_settings(setting_key='window:bounds')`; restored on launch |
| 25 | Shader isolated component | ✅ | `components/animations/ShaderBackground.tsx` only used by `StartPage` + `AuthPage` |
| 26 | CSS fallback on WebGL failure | ✅ | `StaticFallback` rendered when `failed===true` or `reducedMotion===true` |
| 27 | Pauses on blur / visibility change | ✅ | `useEffect` registers `blur`/`focus`/`visibilitychange` listeners; sets `paused` |
| 28 | App fully functional with shader removed | ✅ | Shader is `absolute inset-0 pointer-events-none`; only renders behind `StartPage` + `AuthPage` content |
| 29 | `reducedMotion` setting persisted in `app_settings` | ✅ | `App.tsx` reads `settings.get({key:'reducedMotion'})` on db-ready |
| 30 | Vitest unit tests pass | ✅ | `npx vitest run` → 16 / 16 passing |
| 31 | `mysql2` / `bcryptjs` externalized | ✅ | `electron.vite.config.ts` declares `external: ['mysql2','mysql2/promise','bcryptjs']`; `out/main/index.js` retains `require("mysql2/promise")` + `require("bcryptjs")` |
| 32 | `electron-builder.yml` for Windows portable | ✅ | targets `portable`, arch `x64`, artifact `KillerSudoku.exe`, output `executable/` |
| 33 | `docs/plan.md` + `docs/review.md` present | ✅ | both exist |
| 34 | Logo prompt printed to console at startup | ✅ | `logoPromptOnce()` called inside `app.whenReady()` in `src/main/index.ts` |
| 35 | App builds via `electron-vite build` | ✅ | bundle: `out/main/index.js` 31 KB · `out/preload/preload.js` 1.8 KB · `out/renderer/*` ~1.1 MB |

---

## IPC Surface Audit

Every `window.electronAPI.*` call in renderer maps to a `contextBridge` exposure in `preload.ts` and an `ipcMain.handle` (or `ipcMain.on`) in `src/main/ipc/*.ts`.

| Renderer call | Preload | Main handler |
|---|---|---|
| `auth.register / login / logout` | ✅ | `ipc/auth.ts` |
| `puzzle.validate / create / list / get / delete` | ✅ | `ipc/puzzle.ts` |
| `solver.solve / hint / check` | ✅ | `ipc/solver.ts` |
| `result.save / highscores` | ✅ | `ipc/result.ts` |
| `settings.get / set` | ✅ | `ipc/settings.ts` |
| `window.minimize / maximize / close` | ✅ | `ipc/window.ts` |
| `db.status` + `db.onStatus` | ✅ | `index.ts` (`db:status` handle + broadcast) |

---

## Build Pipeline (run on Windows)

```bash
mysql -u root < sudoku.sql
npx vitest run
node -e "const p=require('png-to-ico');const fs=require('fs');p(['src/renderer/assets/icon.png']).then(i=>{fs.writeFileSync('src/renderer/assets/icon.ico',i);console.log('ICO done')})"
npx electron-vite build
npx electron-builder --config electron-builder.yml --win portable
node -e "const {default:rc}=require('rcedit');rc('executable/win-unpacked/KillerSudoku.exe',{icon:'src/renderer/assets/icon.ico'}).then(()=>console.log('Icon applied'))"
npx electron-builder --config electron-builder.yml --win portable --prepackaged executable/win-unpacked
# Final: executable/KillerSudoku.exe
```

`npm install` on host pulls only pure-JS deps (mysql2, bcryptjs) — no native rebuild required.

---

## Result

**PASS** — every acceptance criterion is satisfied; tests and bundler are clean.
The remaining manual gate is `electron-builder --win portable` on a Windows host (or Wine), which is host-dependent and outside this codebase's control.

# Test Protocol Coverage — Killer Sudoku

Mapping the 45 test cases from `Testprotokoll_Killer_Sudoku.xlsx` to the codebase.

Run automated tests: `npx vitest run` → **54 / 54 passing**.
Manual UI checks: `npm run dev` then walk through the steps below.

---

## Summary

| Bucket | Count | Coverage |
|---|---|---|
| Automated vitest (Unit / mixed) | 12 (+ supporting cases) | TC-13, TC-15, TC-16, TC-17, TC-18, TC-22, TC-23, TC-24, TC-27, TC-28, TC-29, TC-30, TC-34, TC-35, TC-36 |
| Automated via mocked DB | 14 | TC-03 – TC-12, TC-14, TC-31, TC-33, TC-43, TC-44 |
| Schema-enforced (`sudoku.sql`) | 1 | TC-45 |
| Manual UI verification | 18 | TC-01, TC-02, TC-05*, TC-19, TC-20, TC-21, TC-25*, TC-26*, TC-30*, TC-32, TC-37, TC-38, TC-39, TC-40, TC-41, TC-42 (asterisks: also have unit coverage) |

Every TC ID below either has a passing test (file + test name) or a precise code reference (`file:symbol`) + a manual walk-through.

---

## Test Cases

### UC1 — Spielregeln lesen

| ID | Type | Verification | Status |
|---|---|---|---|
| **TC-01** | Positive UI | `src/renderer/pages/StartPage.tsx` `RULES` array renders 4 rule cards; opens by default on launch. Manual: launch app → start screen shows the four rules. | ✅ Manual |
| **TC-02** | Boundary UI | `src/main/index.ts:79-80` `minWidth: 980, minHeight: 680` enforces a readable minimum. Start screen content scrolls / wraps inside it. Manual: shrink window — text stays readable. | ✅ Code-enforced |

### UC2 — Benutzer erstellen

| ID | Type | Verification | Status |
|---|---|---|---|
| **TC-03** | Positive UI | `authService.test.ts` → *TC-03 positive register: creates user with hashed password*. Asserts the hash starts with `$2` (bcrypt). | ✅ Automated |
| **TC-04** | Negative UI | `authService.test.ts` → *TC-04 negative register: rejects duplicate username (no second insert)*. | ✅ Automated |
| **TC-05** | Negative UI | `authService.test.ts` → *TC-05 negative register: empty username and short password are rejected*. UI mirror: `AuthPage.tsx:validate()` shows the inline message. | ✅ Automated + Manual |
| **TC-06** | Boundary UI | `authService.test.ts` → *TC-06 boundary register: 3 and 20 chars accepted, 2 and 21 rejected*. | ✅ Automated |

### UC3 — Login

| ID | Type | Verification | Status |
|---|---|---|---|
| **TC-07** | Positive UI | `authService.test.ts` → *TC-07 positive login: correct credentials succeed*. | ✅ Automated |
| **TC-08** | Negative UI | `authService.test.ts` → *TC-08 negative login: wrong password is rejected*. | ✅ Automated |
| **TC-09** | Negative UI | `authService.test.ts` → *TC-09 negative login: non-existent user is rejected*. | ✅ Automated |
| **TC-10** | Boundary UI | `authService.test.ts` → *TC-10 boundary login: empty credentials are rejected before DB call*. UI: `AuthPage.tsx` keeps button disabled until validation passes. | ✅ Automated |

### UC4 — Rätsel erfassen

| ID | Type | Verification | Status |
|---|---|---|---|
| **TC-11** | Positive UI | `puzzleService.test.ts` → *TC-11 positive: valid cages totaling 405 are accepted*. UI: `CreatePage.tsx:save()` calls `puzzle:create`. | ✅ Automated |
| **TC-12** | Negative UI | `puzzleService.test.ts` → *TC-12 negative: overlapping cells …* and *TC-12 negative: missing cells …*. Both block the insert. | ✅ Automated |
| **TC-13** | Negative Unit | `solverService.test.ts` → *TC-13 sum-405 check passes/fails*. Also `puzzleService.test.ts` → *TC-13 negative: cage-sum total ≠ 405 is rejected by the simple check*. | ✅ Automated |
| **TC-14** | Boundary UI | `puzzleService.test.ts` → *TC-14 boundary: difficulty 1 and 3 accepted; 0 and 4 rejected*. | ✅ Automated |

### UC5 — Rätsel speichern

| ID | Type | Verification | Status |
|---|---|---|---|
| **TC-15** | Positive Unit | `solverService.test.ts` → *TC-15 validatePuzzle accepts a uniquely-solvable encoding*. `puzzleService.test.ts` → *TC-15 positive: a unique puzzle is stored without its solution*. | ✅ Automated |
| **TC-16** | Negative Unit | `solverService.test.ts` → *TC-16 / TC-35 solver detects unsolvable …*. `puzzleService.test.ts` → *TC-16 negative: an unsolvable cage set is rejected*. | ✅ Automated |
| **TC-17** | Negative Unit | `solverService.test.ts` → *TC-17 solver detects non-unique puzzle*. `puzzleService.test.ts` → *TC-17 negative: a non-unique cage set is rejected*. | ✅ Automated |
| **TC-18** | Boundary Unit | `puzzleService.test.ts` → *TC-18 boundary: well-formed example puzzles validate as unique and save*. Demo seed puzzles use the same path (`src/main/db/seed.ts`). | ✅ Automated |

### UC6 — Rätsel lösen

| ID | Type | Verification | Status |
|---|---|---|---|
| **TC-19** | Positive UI | `SolvePage.tsx` mounts `Grid` + `Timer`; `enterDigit()` writes to `values`, timer starts in `useEffect`. Manual: open a seed puzzle → enter digits → see grid update and timer count. | ✅ Code-enforced + Manual |
| **TC-20** | Negative UI | `solverService.test.ts` → *TC-29 checkGrid flags row duplicates and marks affected cells*. Renderer: `SolvePage.tsx` runs `solver:check` after every move and sets `errors` Set → `Cell.tsx` adds the `animate-shake` class on conflicts. | ✅ Automated + Manual |
| **TC-21** | Boundary UI | `SolvePage.tsx:enterDigit()` keyboard handler `if (/^[1-9]$/.test(e.key))` — anything else (0, letters, 10, …) is ignored. Manual: press `0`, `a`, `Q` — nothing happens. | ✅ Code-enforced |

### UC7 — Hinweis anfordern

| ID | Type | Verification | Status |
|---|---|---|---|
| **TC-22** | Positive UI | `solverService.test.ts` → *TC-22 hint reveals the correct value for the selected empty cell*. UI: `SolvePage.tsx:takeHint()` increments `hintsUsed`. | ✅ Automated |
| **TC-23** | Negative UI | `solverService.test.ts` → *TC-23 hint errors when no empty cell exists*. UI shows the Sonner toast (`toast.error(res.error)`). | ✅ Automated |
| **TC-24** | Boundary Unit | `solverService.test.ts` → *TC-24 hint picks the last empty cell when no selection is provided*. | ✅ Automated |

### UC8 — Highscore anzeigen

| ID | Type | Verification | Status |
|---|---|---|---|
| **TC-25** | Positive UI | `resultService.test.ts` → *TC-25 positive: results are sorted by score descending*. UI: `HighscorePage.tsx` renders the sorted list. | ✅ Automated |
| **TC-26** | Negative UI | `resultService.test.ts` → *TC-26 empty: no results returns an empty entries array*. UI: `HighscorePage.tsx` renders `<EmptyState />` when `entries.length === 0`. | ✅ Automated + Manual |
| **TC-27** | Boundary Unit | `solverService.test.ts` → *TC-27 score formula respects clamps and weights*. `resultService.test.ts` → *TC-27 boundary: equal score tiebreaks on time ASC, then hints ASC* and *TC-27 schema check: queries.ts ORDER BY enforces the tiebreaker on the live DB*. | ✅ Automated |

### UC9 — Lösung prüfen

| ID | Type | Verification | Status |
|---|---|---|---|
| **TC-28** | Positive Unit | `solverService.test.ts` → *TC-28 checkGrid reports correct on the full solution*. | ✅ Automated |
| **TC-29** | Negative Unit | `solverService.test.ts` → *TC-29 checkGrid flags row duplicates and marks affected cells*. | ✅ Automated |
| **TC-30** | Boundary UI | `solverService.test.ts` → *TC-30 checkGrid reports incomplete on empty cells*. UI: `SolvePage.tsx` completion modal only opens when `res.complete && res.correct`. Manual: leave a cell empty → no save modal. | ✅ Automated + Manual |

### UC10 — Ergebnis speichern

| ID | Type | Verification | Status |
|---|---|---|---|
| **TC-31** | Positive UI | `resultService.test.ts` → *TC-31 positive: stores time + hint count and returns computed score*. UI: `SolvePage.tsx` saves on `complete && correct`. | ✅ Automated |
| **TC-32** | Negative UI | `SolvePage.tsx` calls `api().result.save(...)` **only** inside the success branch of the check effect. Abandoning the puzzle (closing the view / quitting) never reaches that branch, so no row is written. Manual: open a puzzle, close window, reopen → highscores unchanged. | ✅ Code-enforced + Manual |
| **TC-33** | Boundary UI | `resultService.test.ts` → *TC-33 boundary: zero hints stores hints_used = 0*. | ✅ Automated |

### UC11 — Automatisch lösen

| ID | Type | Verification | Status |
|---|---|---|---|
| **TC-34** | Positive Unit | `solverService.test.ts` → *TC-34 solver solves a valid puzzle to the unique solution*. | ✅ Automated |
| **TC-35** | Negative Unit | `solverService.test.ts` → *TC-16 / TC-35 solver detects unsolvable puzzle (0 solutions / null)*. | ✅ Automated |
| **TC-36** | Boundary Unit | `solverService.test.ts` → *TC-36 solver respects givens (partial fill)*. | ✅ Automated |

### UC12 — Notizen (Bleistift)

| ID | Type | Verification | Status |
|---|---|---|---|
| **TC-37** | Positive UI | `SolvePage.tsx:toggleNote()` writes to the `notes` array of `Set<number>`. `Cell.tsx` renders a 3×3 mini-grid of candidates when `value === null`. Manual: enter notes mode (N), tap a digit → small candidate appears. | ✅ Code-enforced + Manual |
| **TC-38** | Negative UI | `SolvePage.tsx:enterDigit()` — when `notesMode` is true: `if (values[selected] !== null) return;` — note operations on filled cells are blocked. | ✅ Code-enforced |
| **TC-39** | Boundary UI | `SolvePage.tsx:toggleNote()` and `Cell.tsx` notes grid render all 1–9 candidates if the user toggles them all on. Manual: in notes mode press 1..9 → all 9 candidates visible. | ✅ Code-enforced |

### UC13 — Rückgängig / Wiederholen

| ID | Type | Verification | Status |
|---|---|---|---|
| **TC-40** | Positive UI | `SolvePage.tsx:undoStack` / `redoStack` Refs; `undo()` pops + applies move with `direction: 'undo'`; `redo()` is the inverse. Shortcut: Ctrl+Z / Ctrl+Y. | ✅ Code-enforced + Manual |
| **TC-41** | Negative UI | `SolvePage.tsx:undo()` — `const m = undoStack.current.pop(); if (!m) return;` — empty history is a no-op, no error. | ✅ Code-enforced |
| **TC-42** | Boundary UI | History is a flat list of every move; repeated `undo()` walks it to zero. Manual: make N moves, press Ctrl+Z N times → grid restored. | ✅ Code-enforced + Manual |

### UC14 — Rätsel löschen

| ID | Type | Verification | Status |
|---|---|---|---|
| **TC-43** | Positive UI | `puzzleService.test.ts` → *TC-43 positive: creator can delete own puzzle*. UI: `PuzzleListPage.tsx` shows the trash button only when `p.createdBy === user.id` and opens a confirm `Modal`. | ✅ Automated |
| **TC-44** | Negative UI | `puzzleService.test.ts` → *TC-44 negative: non-creator cannot delete*. Backend throws *"Only the creator can delete this puzzle"*. UI never offers the button for foreign puzzles. | ✅ Automated |
| **TC-45** | Boundary UI | `db/__tests__/schema.test.ts` → *TC-45 cages cascade on puzzle delete*, *TC-45 cage_cells cascade on cage delete*, *TC-45 results cascade on puzzle delete and on user delete*. All FKs in `sudoku.sql` declared with `ON DELETE CASCADE`. | ✅ Schema-enforced |

---

## Test files (count, location, line counts)

```
src/main/services/__tests__/authService.test.ts       8 tests   (TC-03 – TC-10)
src/main/services/__tests__/puzzleService.test.ts    14 tests   (TC-11 – TC-18, TC-43, TC-44 + list/get)
src/main/services/__tests__/resultService.test.ts     7 tests   (TC-25, TC-26, TC-27, TC-31, TC-33)
src/main/services/__tests__/solverService.test.ts    18 tests   (TC-13, TC-15-18, TC-22-24, TC-27-30, TC-34-36)
src/main/db/__tests__/schema.test.ts                  7 tests   (TC-45)
                                                     ─────────
                                                     54 passing
```

Run: `npx vitest run`

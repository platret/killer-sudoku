import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Download,
  Eye,
  Flag,
  Lightbulb,
  Redo2,
  Sparkles,
  Undo2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Grid } from '@/components/sudoku/Grid';
import { NumberPad } from '@/components/sudoku/NumberPad';
import { Timer } from '@/components/sudoku/Timer';
import { AnimatedNumber } from '@/components/animations/AnimatedNumber';
import { HomeBackdrop } from '@/components/animations/HomeBackdrop';
import { ConfettiBurst } from '@/components/animations/ConfettiBurst';
import { toast } from '@/components/ui/Toaster';
import { useApp } from '@/lib/store';
import { api, safeApi } from '@/lib/ipc';
import { difficultyLabel, formatTime } from '@/lib/utils';
import { exportPngBase64, type CardData } from '@/lib/exportCard';
import { playSound } from '@/lib/sounds';
import type { Cell as CellValue, Grid as GridValues, Puzzle } from '@shared/types';

type Move =
  | { kind: 'value'; idx: number; prev: CellValue; next: CellValue; prevNotes: number[] }
  | { kind: 'notes'; idx: number; prev: number[]; next: number[] };

function emptyNotes(): Set<number>[] {
  return Array.from({ length: 81 }, () => new Set<number>());
}

function progressKey(userId: number, puzzleId: number): string {
  return `progress:${userId}:${puzzleId}`;
}

interface PersistedProgress {
  values: (number | null)[];
  notes: number[][];
  hintsUsed: number;
  elapsedSeconds: number;
}

export function SolvePage(): JSX.Element {
  const view = useApp((s) => s.view);
  const user = useApp((s) => s.user);
  const setView = useApp((s) => s.setView);
  const puzzleId = view.kind === 'solve' ? view.puzzleId : 0;

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);

  const [values, setValues] = useState<GridValues>(() => Array(81).fill(null));
  const [notes, setNotes] = useState<Set<number>[]>(emptyNotes);
  const [selected, setSelected] = useState<number | null>(40);
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [hinted, setHinted] = useState<Set<number>>(new Set());
  const [notesMode, setNotesMode] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finalSeconds, setFinalSeconds] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [forfeited, setForfeited] = useState(false);
  const [forfeitConfirm, setForfeitConfirm] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);

  const undoStack = useRef<Move[]>([]);
  const redoStack = useRef<Move[]>([]);
  const initialized = useRef(false);
  const completed = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    initialized.current = false;
    completed.current = false;
    undoStack.current = [];
    redoStack.current = [];
    setValues(Array(81).fill(null));
    setNotes(emptyNotes());
    setHintsUsed(0);
    setHinted(new Set());
    setErrors(new Set());
    setFinalSeconds(null);
    setScore(null);
    setCompleteOpen(false);
    setForfeited(false);
    setForfeitConfirm(false);

    void api().puzzle.get({ id: puzzleId }).then(async (res) => {
      if (cancelled || !res.puzzle) {
        if (!cancelled) {
          setPuzzle(null);
          setLoading(false);
        }
        return;
      }
      setPuzzle(res.puzzle);

      let restored = false;
      if (user) {
        try {
          const prog = await api().settings.get({ key: progressKey(user.id, res.puzzle.id) });
          if (prog.value) {
            const data = JSON.parse(prog.value) as PersistedProgress;
            if (
              Array.isArray(data.values) &&
              data.values.length === 81 &&
              data.values.some((v) => v !== null)
            ) {
              setValues(data.values);
              setNotes(data.notes.map((arr) => new Set(arr)));
              setHintsUsed(data.hintsUsed ?? 0);
              setStartedAt(Date.now() - (data.elapsedSeconds ?? 0) * 1000);
              restored = true;
              toast.message('Resumed in-progress puzzle');
            }
          }
        } catch {
          /* corrupt progress — start fresh */
        }
      }

      if (!restored) setStartedAt(Date.now());
      setLoading(false);
      initialized.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [puzzleId, user]);

  const setValueAt = useCallback(
    (idx: number, next: CellValue, record: boolean) => {
      setValues((prev) => {
        const arr = prev.slice();
        arr[idx] = next;
        return arr;
      });
      if (record) {
        const prevNotes = Array.from(notes[idx] ?? new Set<number>());
        undoStack.current.push({ kind: 'value', idx, prev: values[idx] ?? null, next, prevNotes });
        redoStack.current = [];
      }
      setNotes((prev) => {
        const arr = prev.slice();
        arr[idx] = new Set();
        return arr;
      });
    },
    [notes, values]
  );

  const toggleNote = useCallback(
    (idx: number, n: number) => {
      const prev = Array.from(notes[idx] ?? new Set<number>());
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      const nextArr = Array.from(next);
      setNotes((all) => {
        const arr = all.slice();
        arr[idx] = next;
        return arr;
      });
      undoStack.current.push({ kind: 'notes', idx, prev, next: nextArr });
      redoStack.current = [];
    },
    [notes]
  );

  const applyMove = useCallback((m: Move, direction: 'undo' | 'redo') => {
    const goingBackwards = direction === 'undo';
    if (m.kind === 'value') {
      const v = goingBackwards ? m.prev : m.next;
      setValues((prev) => {
        const arr = prev.slice();
        arr[m.idx] = v;
        return arr;
      });
      setNotes((prev) => {
        const arr = prev.slice();
        arr[m.idx] = goingBackwards ? new Set(m.prevNotes) : new Set();
        return arr;
      });
    } else {
      const v = goingBackwards ? m.prev : m.next;
      setNotes((prev) => {
        const arr = prev.slice();
        arr[m.idx] = new Set(v);
        return arr;
      });
    }
  }, []);

  const undo = useCallback(() => {
    const m = undoStack.current.pop();
    if (!m) return;
    applyMove(m, 'undo');
    redoStack.current.push(m);
  }, [applyMove]);

  const redo = useCallback(() => {
    const m = redoStack.current.pop();
    if (!m) return;
    applyMove(m, 'redo');
    undoStack.current.push(m);
  }, [applyMove]);

  const enterDigit = useCallback(
    (n: number) => {
      if (selected === null || finalSeconds !== null) return;
      if (notesMode) {
        if (values[selected] !== null) return;
        playSound.toggle();
        toggleNote(selected, n);
        return;
      }
      playSound.place();
      setValueAt(selected, n, true);
    },
    [selected, notesMode, finalSeconds, values, toggleNote, setValueAt]
  );

  const clearCell = useCallback(() => {
    if (selected === null || finalSeconds !== null) return;
    playSound.clear();
    setValueAt(selected, null, true);
  }, [selected, setValueAt, finalSeconds]);

  const moveSelection = useCallback((dr: number, dc: number) => {
    setSelected((curr) => {
      if (curr === null) return 40;
      const r = Math.floor(curr / 9);
      const c = curr % 9;
      const nr = Math.max(0, Math.min(8, r + dr));
      const nc = Math.max(0, Math.min(8, c + dc));
      return nr * 9 + nc;
    });
  }, []);

  const takeHint = useCallback(async () => {
    if (!puzzle || finalSeconds !== null) return;
    const res = await api().solver.hint({
      cages: puzzle.cages,
      grid: values,
      selectedIndex: selected ?? undefined
    });
    if ('error' in res) {
      playSound.error();
      toast.error(res.error);
      return;
    }
    playSound.hint();
    setValueAt(res.cellIndex, res.value, true);
    setHintsUsed((n) => n + 1);
    setHinted((prev) => {
      const next = new Set(prev);
      next.add(res.cellIndex);
      return next;
    });
    setSelected(res.cellIndex);
  }, [puzzle, values, selected, finalSeconds, setValueAt]);

  const performForfeit = useCallback(async () => {
    if (!puzzle || finalSeconds !== null || completed.current) return;
    const res = await api().solver.solve({ cages: puzzle.cages, givens: undefined });
    if (!res.solution) {
      toast.error('No solution from this state');
      return;
    }
    completed.current = true;
    const seconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    setValues(res.solution as GridValues);
    setHinted(new Set(Array.from({ length: 81 }, (_, i) => i)));
    setForfeited(true);
    setFinalSeconds(seconds);
    setScore(0);
    if (user) {
      void api().settings.set({ key: progressKey(user.id, puzzle.id), value: '' });
    }
    setCompleteOpen(true);
    playSound.forfeit();
    toast.message('Forfeited — no highscore saved');
  }, [puzzle, finalSeconds, startedAt, user]);

  useEffect(() => {
    if (!puzzle || finalSeconds !== null) return;
    const id = window.setTimeout(async () => {
      const res = await api().solver.check({ cages: puzzle.cages, grid: values });
      setErrors((prev) => {
        if (res.errorCells.length > 0 && prev.size === 0) playSound.error();
        return new Set(res.errorCells);
      });
      if (res.complete && res.correct && !completed.current) {
        completed.current = true;
        const seconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
        setFinalSeconds(seconds);
        if (user) {
          const saveRes = await api().result.save({
            userId: user.id,
            puzzleId: puzzle.id,
            timeSeconds: seconds,
            hintsUsed
          });
          setScore(saveRes.score);
          void api().settings.set({ key: progressKey(user.id, puzzle.id), value: '' });
        } else {
          setScore(Math.max(0, 10000 - seconds * 5 - hintsUsed * 500));
        }
        setCompleteOpen(true);
        playSound.success();
      }
    }, 120);
    return () => clearTimeout(id);
  }, [values, puzzle, finalSeconds, hintsUsed, startedAt, user]);

  useEffect(() => {
    if (!user || !puzzle || !initialized.current || finalSeconds !== null) return;
    const handle = window.setTimeout(() => {
      const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
      const payload: PersistedProgress = {
        values: values.map((v) => (v === null ? null : v)),
        notes: notes.map((s) => Array.from(s)),
        hintsUsed,
        elapsedSeconds: elapsed
      };
      void api().settings.set({
        key: progressKey(user.id, puzzle.id),
        value: JSON.stringify(payload)
      });
    }, 800);
    return () => clearTimeout(handle);
  }, [values, notes, hintsUsed, user, puzzle, startedAt, finalSeconds]);

  useEffect(() => {
    const onHint = (): void => void takeHint();
    const onAuto = (): void => setForfeitConfirm(true);
    window.addEventListener('solve:hint', onHint);
    window.addEventListener('solve:auto', onAuto);
    return () => {
      window.removeEventListener('solve:hint', onHint);
      window.removeEventListener('solve:auto', onAuto);
    };
  }, [takeHint]);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'z') { e.preventDefault(); undo(); return; }
        if (k === 'y') { e.preventDefault(); redo(); return; }
        return;
      }

      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); moveSelection(0, -1); return;
        case 'ArrowRight': e.preventDefault(); moveSelection(0, 1); return;
        case 'ArrowUp': e.preventDefault(); moveSelection(-1, 0); return;
        case 'ArrowDown': e.preventDefault(); moveSelection(1, 0); return;
        case 'Backspace':
        case 'Delete':
        case '0':
          e.preventDefault(); clearCell(); return;
        case 'n':
        case 'N':
          e.preventDefault(); setNotesMode((v) => !v); return;
        case 'h':
        case 'H':
          e.preventDefault(); void takeHint(); return;
        default:
          if (/^[1-9]$/.test(e.key)) {
            e.preventDefault();
            enterDigit(Number(e.key));
          }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [moveSelection, clearCell, undo, redo, takeHint, enterDigit]);

  const filledCount = useMemo(() => values.filter((v) => v !== null).length, [values]);

  const cardData: CardData | null = useMemo(() => {
    if (!puzzle || finalSeconds === null) return null;
    return {
      puzzleName: puzzle.name,
      difficulty: puzzle.difficulty,
      player: user?.username ?? 'guest',
      values,
      cages: puzzle.cages,
      timeSeconds: finalSeconds,
      score: score ?? 0,
      hintsUsed,
      forfeited
    };
  }, [puzzle, finalSeconds, user, values, score, hintsUsed, forfeited]);

  const stampedName = useCallback(
    (ext: string): string => {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const safe = (puzzle?.name ?? 'puzzle').replace(/[^a-z0-9-]+/gi, '_').slice(0, 40);
      const tag = forfeited ? 'forfeit' : 'solved';
      return `killer-sudoku-${tag}-${safe}-${stamp}.${ext}`;
    },
    [puzzle, forfeited]
  );

  const downloadPng = useCallback(async () => {
    if (!cardData || exportingPng) return;
    const fileApi = safeApi()?.file;
    if (!fileApi) {
      toast.error('File save bridge unavailable — restart the app');
      return;
    }
    setExportingPng(true);
    let b64 = '';
    try {
      b64 = exportPngBase64(cardData);
      if (!b64) throw new Error('Canvas returned empty PNG data');
    } catch (err) {
      console.error('[PNG] draw failed:', err);
      toast.error(`Could not render PNG (${err instanceof Error ? err.message : 'unknown error'})`);
      setExportingPng(false);
      return;
    }
    try {
      const res = await fileApi.save({
        dataBase64: b64,
        defaultName: stampedName('png'),
        filters: [{ name: 'PNG image', extensions: ['png'] }]
      });
      if (res.success && res.path) {
        toast.success(`Saved ${res.path.split('/').pop()}`);
      } else if (res.error && res.error !== 'Cancelled') {
        console.error('[PNG] save failed:', res.error);
        toast.error(`PNG save failed: ${res.error}`);
      }
    } catch (err) {
      console.error('[PNG] ipc failed:', err);
      toast.error(
        `PNG export failed (${err instanceof Error ? err.message : 'IPC error'})`
      );
    } finally {
      setExportingPng(false);
    }
  }, [cardData, exportingPng, stampedName]);

  const selectedCageInfo = useMemo(() => {
    if (!puzzle || selected === null) return null;
    const cageIdx = puzzle.cages.findIndex((c) => c.cells.includes(selected));
    if (cageIdx === -1) return null;
    const cage = puzzle.cages[cageIdx];
    let filled = 0;
    let filledCells = 0;
    for (const idx of cage.cells) {
      const v = values[idx];
      if (v !== null) {
        filled += v;
        filledCells += 1;
      }
    }
    return {
      cageIdx,
      target: cage.targetSum,
      filled,
      filledCells,
      totalCells: cage.cells.length,
      remaining: cage.targetSum - filled,
      complete: filledCells === cage.cells.length
    };
  }, [puzzle, selected, values]);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Skeleton className="h-[486px] w-[486px]" />
      </main>
    );
  }

  if (!puzzle) {
    return (
      <main className="flex-1 flex items-center justify-center px-10">
        <div className="text-center">
          <p className="text-ink mb-4">Puzzle not found.</p>
          <Button onClick={() => setView({ kind: 'list' })}>
            <ArrowLeft className="h-4 w-4" /> Back to puzzles
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex-1 overflow-y-auto">
      <HomeBackdrop intensity={0.3} />
      <div className="relative z-10 px-10 py-6 max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <button
              onClick={() => setView({ kind: 'list' })}
              className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1 mb-2 focus-ring"
            >
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
            <h1 className="text-3xl font-bold font-display tracking-tight">
              <span className="bg-hero-gradient bg-clip-text text-transparent">{puzzle.name}</span>
            </h1>
            <p className="text-xs text-ink-muted mt-1">
              {difficultyLabel(puzzle.difficulty)} · by {puzzle.createdByName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Timer startedAt={startedAt} finalSeconds={finalSeconds} />
            <div className="flex items-center gap-1 px-3 py-2 rounded-md border border-line bg-bg-surface/80 backdrop-blur text-xs text-ink-muted">
              <Lightbulb className="h-3.5 w-3.5" />
              <span className="tabular-num text-ink">{hintsUsed}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          <div className="shrink-0 relative">
            <div className="absolute -inset-3 bg-accent/10 blur-2xl rounded-2xl pointer-events-none" aria-hidden />
            <div className="relative">
              <Grid
                values={values}
                notes={notes}
                selected={selected}
                errors={errors}
                hinted={hinted}
                cages={puzzle.cages}
                highlightCageIdx={selectedCageInfo?.cageIdx ?? null}
                onSelect={setSelected}
              />
            </div>
          </div>
          <aside className="flex flex-col gap-4 min-w-[240px]">
            <NumberPad
              notesMode={notesMode}
              onToggleNotes={() => setNotesMode((v) => !v)}
              onDigit={enterDigit}
              onErase={clearCell}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={undo}>
                <Undo2 className="h-4 w-4" />
                Undo
              </Button>
              <Button variant="secondary" size="sm" onClick={redo}>
                <Redo2 className="h-4 w-4" />
                Redo
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void takeHint()}>
                <Lightbulb className="h-4 w-4" />
                Hint
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setForfeitConfirm(true)}
                className="text-danger hover:text-danger hover:bg-danger/10"
              >
                <Flag className="h-4 w-4" />
                Forfeit
              </Button>
            </div>

            <AnimatePresence mode="wait">
              {selectedCageInfo ? (
                <motion.div
                  key={selectedCageInfo.cageIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-xl border border-accent/30 bg-accent/[0.06] backdrop-blur-md p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider font-display text-accent font-semibold">
                      Selected cage
                    </span>
                    <span className="text-[10px] tabular-num text-ink-muted">
                      {selectedCageInfo.filledCells} / {selectedCageInfo.totalCells} cells
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] text-ink-muted font-display uppercase tracking-wider">Target</p>
                      <p className="text-2xl font-mono tabular-num text-ink">
                        {selectedCageInfo.target}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-muted font-display uppercase tracking-wider">Filled</p>
                      <p className="text-2xl font-mono tabular-num text-cyan-glow">
                        {selectedCageInfo.filled}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-muted font-display uppercase tracking-wider">
                        {selectedCageInfo.remaining < 0
                          ? 'Over'
                          : selectedCageInfo.complete
                            ? 'Match'
                            : 'Needs'}
                      </p>
                      <p
                        className={`text-2xl font-mono tabular-num ${
                          selectedCageInfo.remaining < 0
                            ? 'text-danger'
                            : selectedCageInfo.complete && selectedCageInfo.remaining === 0
                              ? 'text-success'
                              : 'text-accent'
                        }`}
                      >
                        {selectedCageInfo.complete && selectedCageInfo.remaining === 0
                          ? '✓'
                          : selectedCageInfo.remaining}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="surface p-4 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-ink-muted uppercase tracking-wider">Filled</span>
                <span className="text-ink font-mono tabular-num">{filledCount} / 81</span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-surface overflow-hidden">
                <motion.div
                  className="h-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${(filledCount / 81) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 160, damping: 24 }}
                />
              </div>
              <AnimatePresence>
                {errors.size > 0 ? (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 text-danger flex items-center gap-1.5"
                  >
                    <Eye className="h-3 w-3" />
                    {errors.size} conflict{errors.size === 1 ? '' : 's'}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>
          </aside>
        </div>

        <Modal
          open={completeOpen}
          onClose={() => setCompleteOpen(false)}
          title={forfeited ? 'Forfeited' : 'Puzzle complete'}
          className="max-w-lg"
        >
          <div className="relative text-center py-2">
            {completeOpen && !forfeited ? <ConfettiBurst /> : null}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              className={`h-16 w-16 rounded-full mx-auto flex items-center justify-center mb-4 ${
                forfeited ? 'bg-danger/15 shadow-glowPink' : 'bg-accent/15 shadow-glow'
              }`}
            >
              {forfeited ? (
                <Flag className="h-8 w-8 text-danger" />
              ) : (
                <Sparkles className="h-8 w-8 text-accent" />
              )}
            </motion.div>
            <p className="text-sm text-ink-muted mb-1">
              {forfeited ? 'Solution revealed' : 'Final score'}
            </p>
            {forfeited ? (
              <div className="text-5xl font-bold font-mono mb-4 text-danger drop-shadow-[0_0_24px_rgba(229,72,77,0.45)]">
                Forfeited
              </div>
            ) : (
              <div className="text-6xl font-bold font-mono mb-4 tabular-num bg-hero-gradient bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(244,167,44,0.45)]">
                <AnimatedNumber value={score ?? 0} duration={1.1} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm mb-5">
              <div className="surface p-3 text-center">
                <p className="text-ink-muted text-[10px] uppercase tracking-wider font-display mb-1">Time</p>
                <p className="text-ink font-mono">{formatTime(finalSeconds ?? 0)}</p>
              </div>
              <div className="surface p-3 text-center">
                <p className="text-ink-muted text-[10px] uppercase tracking-wider font-display mb-1">Hints</p>
                <p className="text-ink font-mono">{hintsUsed}</p>
              </div>
            </div>

            <div className="flex justify-center mb-3">
              <Button
                variant="secondary"
                onClick={() => void downloadPng()}
                disabled={exportingPng || !cardData}
              >
                <Download className="h-4 w-4" />
                {exportingPng ? 'Exporting…' : 'Download PNG card'}
              </Button>
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                variant="ghost"
                onClick={() => setView({ kind: 'highscore', puzzleId: puzzle.id })}
              >
                Highscores
              </Button>
              <Button onClick={() => setView({ kind: 'list' })}>Back to puzzles</Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={forfeitConfirm}
          onClose={() => setForfeitConfirm(false)}
          title="Forfeit this puzzle?"
        >
          <p className="text-sm text-ink-muted mb-2">
            The full solution will be revealed and the timer stops.
          </p>
          <p className="text-sm text-ink-muted mb-6">
            <span className="text-danger font-medium">No score is saved.</span> You can still
            export a PNG of the solved board.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setForfeitConfirm(false)}>
              Keep solving
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setForfeitConfirm(false);
                void performForfeit();
              }}
            >
              <Flag className="h-4 w-4" />
              Forfeit
            </Button>
          </div>
        </Modal>
      </div>
    </main>
  );
}

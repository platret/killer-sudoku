import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Check, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { CageLayer } from '@/components/sudoku/CageLayer';
import { HomeBackdrop } from '@/components/animations/HomeBackdrop';
import { toast } from '@/components/ui/Toaster';
import { useApp } from '@/lib/store';
import { api } from '@/lib/ipc';
import { cn } from '@/lib/utils';
import type { CageInput, Difficulty } from '@shared/types';

const CELL = 48;

function hueOf(i: number): number {
  return (i * 47) % 360;
}

export function CreatePage(): JSX.Element {
  const setView = useApp((s) => s.setView);
  const user = useApp((s) => s.user);

  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(1);
  const [cages, setCages] = useState<CageInput[]>([]);
  const [draft, setDraft] = useState<Set<number>>(new Set());
  const [draftSum, setDraftSum] = useState('');
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);

  const cageOfCell = useMemo(() => {
    const map = new Array<number>(81).fill(-1);
    cages.forEach((c, i) => c.cells.forEach((idx) => { map[idx] = i; }));
    return map;
  }, [cages]);

  const remainingCells = 81 - cages.reduce((acc, c) => acc + c.cells.length, 0);
  const totalSum = cages.reduce((acc, c) => acc + c.targetSum, 0);

  const onCellClick = (idx: number): void => {
    if (cageOfCell[idx] !== -1) return;
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const addDraft = (): void => {
    const target = Number(draftSum);
    if (draft.size === 0) {
      toast.error('Select at least one cell');
      return;
    }
    if (draft.size > 9) {
      toast.error('A cage cannot have more than 9 cells');
      return;
    }
    if (!Number.isFinite(target) || target < 1 || target > 45) {
      toast.error('Target sum must be 1–45');
      return;
    }
    setCages((prev) => [...prev, { targetSum: target, cells: Array.from(draft).sort((a, b) => a - b) }]);
    setDraft(new Set());
    setDraftSum('');
  };

  const removeCage = (i: number): void => {
    setCages((prev) => prev.filter((_, idx) => idx !== i));
  };

  const clearDraft = (): void => {
    setDraft(new Set());
    setDraftSum('');
  };

  const fillSingletons = (): void => {
    const taken = new Set<number>();
    cages.forEach((c) => c.cells.forEach((i) => taken.add(i)));
    const singletons: CageInput[] = [];
    for (let i = 0; i < 81; i++) if (!taken.has(i)) singletons.push({ targetSum: 1, cells: [i] });
    if (singletons.length === 0) return;
    setCages((prev) => [...prev, ...singletons]);
  };

  const validate = async (): Promise<void> => {
    if (remainingCells > 0) {
      toast.error(`${remainingCells} cells still uncovered`);
      return;
    }
    setValidating(true);
    try {
      const res = await api().puzzle.validate({ cages });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (!res.sumValid) {
        toast.error(`Cage sums must total 405 (currently ${totalSum})`);
        return;
      }
      if (!res.solvable) {
        toast.error('Puzzle has no solution');
        return;
      }
      if (!res.unique) {
        toast.error('Puzzle has multiple solutions');
        return;
      }
      toast.success('Valid — unique solution exists');
    } finally {
      setValidating(false);
    }
  };

  const save = async (): Promise<void> => {
    if (!user) return;
    if (name.trim().length < 2) {
      toast.error('Give the puzzle a name (2+ characters)');
      return;
    }
    if (remainingCells > 0) {
      toast.error('Cover all 81 cells before saving');
      return;
    }
    setSaving(true);
    try {
      const res = await api().puzzle.create({
        name: name.trim(),
        difficulty,
        cages,
        createdBy: user.id
      });
      if (res.success && res.puzzleId) {
        toast.success('Puzzle saved');
        setView({ kind: 'solve', puzzleId: res.puzzleId });
      } else {
        toast.error(res.error ?? 'Could not save puzzle');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative flex-1 overflow-y-auto">
      <HomeBackdrop intensity={0.4} />
      <div className="relative z-10 px-10 py-8 max-w-7xl mx-auto">
      <button
        onClick={() => setView({ kind: 'list' })}
        className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1 mb-3 focus-ring"
      >
        <ArrowLeft className="h-3 w-3" /> Back
      </button>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-glow mb-3 inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-glow shadow-glowCyan" />
            Designer
          </p>
          <Plus className="h-11 w-11 text-cyan-glow mb-2 drop-shadow-[0_0_24px_rgba(217,119,87,0.5)]" />
          <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight leading-none">
            <span className="bg-hero-gradient bg-clip-text text-transparent">Design a puzzle</span>
          </h1>
          <p className="text-sm text-ink-muted mt-3 max-w-xl">
            Click cells to build a cage, enter its target sum, then add the cage. Every cell must
            belong to exactly one cage. Sums total 405. The solver enforces uniqueness before save.
          </p>
        </div>
      </div>

      <div className="flex gap-8">
        <div
          className="relative shrink-0"
          style={{ width: CELL * 9, height: CELL * 9 }}
        >
          <div
            className="absolute inset-0 grid bg-bg-base border-2 border-line-strong/20"
            style={{
              gridTemplateColumns: `repeat(9, ${CELL}px)`,
              gridTemplateRows: `repeat(9, ${CELL}px)`
            }}
          >
            {Array.from({ length: 81 }).map((_, i) => {
              const cIdx = cageOfCell[i];
              const inDraft = draft.has(i);
              const row = Math.floor(i / 9);
              const col = i % 9;
              return (
                <button
                   key={i}
                   onClick={() => onCellClick(i)}
                   className={cn(
                     'relative flex items-center justify-center text-[10px] font-mono text-ink-dim',
                     'transition-colors',
                     row % 3 === 0 ? 'border-t-2 border-t-line-strong/20' : 'border-t border-t-line/10',
                     col % 3 === 0 ? 'border-l-2 border-l-line-strong/20' : 'border-l border-l-line/10',
                     row === 8 ? 'border-b-2 border-b-line-strong/20' : '',
                     col === 8 ? 'border-r-2 border-r-line-strong/20' : '',
                     cIdx !== -1 ? 'cursor-default' : 'cursor-pointer hover:bg-bg-surface'
                   )}
                   style={{
                     width: CELL,
                     height: CELL,
                     background:
                       cIdx !== -1
                         ? `hsla(${hueOf(cIdx)}, 65%, 50%, 0.18)`
                         : inDraft
                           ? 'rgba(244, 167, 44, 0.35)'
                           : undefined
                   }}
                   aria-label={`Cell ${row + 1},${col + 1}`}
                />
              );
            })}
          </div>
          <CageLayer cages={cages} cellSize={CELL} />
        </div>

        <aside className="flex flex-col gap-4 min-w-[320px] flex-1">
          <div className="surface p-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My first puzzle"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                id="difficulty"
                value={String(difficulty)}
                onChange={(e) => setDifficulty(Number(e.target.value) as Difficulty)}
                options={[
                  { value: '1', label: 'Easy' },
                  { value: '2', label: 'Medium' },
                  { value: '3', label: 'Hard' }
                ]}
                className="w-full"
              />
            </div>
          </div>

          <div className="surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Current cage</Label>
              <span className="text-xs text-ink-muted tabular-num">{draft.size} cells</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={draftSum}
                onChange={(e) => setDraftSum(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Sum"
                inputMode="numeric"
                className="w-24"
              />
              <Button onClick={addDraft} className="flex-1">
                <Plus className="h-4 w-4" />
                Add cage
              </Button>
              <Button variant="ghost" onClick={clearDraft} aria-label="Clear">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={fillSingletons} className="w-full">
              Fill remaining as singletons
            </Button>
          </div>

          <div className="surface p-4 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <Label>Cages ({cages.length})</Label>
              <span className="text-xs tabular-num text-ink-muted">
                Σ {totalSum} / 405 · {remainingCells} left
              </span>
            </div>
            {cages.length === 0 ? (
              <p className="text-xs text-ink-dim py-2">No cages yet.</p>
            ) : (
              <motion.ul layout className="space-y-1.5">
                {cages.map((c, i) => (
                  <motion.li
                    key={i}
                    layout
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className="h-3 w-3 rounded-sm shrink-0"
                      style={{ background: `hsla(${hueOf(i)}, 65%, 50%, 0.5)` }}
                    />
                    <span className="text-ink font-mono tabular-num w-12">Σ {c.targetSum}</span>
                    <span className="text-ink-muted flex-1 truncate">{c.cells.length} cells</span>
                    <button
                      onClick={() => removeCage(i)}
                      className="text-ink-muted hover:text-danger transition-colors focus-ring"
                      aria-label={`Remove cage ${i + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => void validate()} disabled={validating}>
              <Check className="h-4 w-4" />
              {validating ? 'Validating…' : 'Validate'}
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </aside>
      </div>
      </div>
    </main>
  );
}

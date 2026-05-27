import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Dices, Plus, Play, Trash2, Trophy, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/animations/EmptyState';
import { HomeBackdrop } from '@/components/animations/HomeBackdrop';
import { toast } from '@/components/ui/Toaster';
import { useApp } from '@/lib/store';
import { api } from '@/lib/ipc';
import { difficultyLabel } from '@/lib/utils';
import type { Difficulty, PuzzleSummary } from '@shared/types';

const DIFFICULTY_STYLES: Record<Difficulty, { ring: string; chip: string; dot: string }> = {
  1: {
    ring: 'shadow-[0_0_24px_rgba(52,211,153,0.18)]',
    chip: 'border-success/40 text-success bg-success/10',
    dot: 'bg-success'
  },
  2: {
    ring: 'shadow-[0_0_24px_rgba(251,191,36,0.18)]',
    chip: 'border-warning/40 text-warning bg-warning/10',
    dot: 'bg-warning'
  },
  3: {
    ring: 'shadow-[0_0_24px_rgba(244,63,94,0.20)]',
    chip: 'border-danger/40 text-danger bg-danger/10',
    dot: 'bg-danger'
  }
};

export function PuzzleListPage(): JSX.Element {
  const setView = useApp((s) => s.setView);
  const setUser = useApp((s) => s.setUser);
  const user = useApp((s) => s.user);
  const [puzzles, setPuzzles] = useState<PuzzleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Difficulty>('all');
  const [pendingDelete, setPendingDelete] = useState<PuzzleSummary | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await api().puzzle.list(filter === 'all' ? undefined : { difficulty: filter });
      setPuzzles(res.puzzles);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filter]);

  useEffect(() => {
    const handler = (): void => void surpriseMe();
    window.addEventListener('surprise:me', handler);
    return () => window.removeEventListener('surprise:me', handler);
  });

  const onDelete = async (): Promise<void> => {
    if (!pendingDelete || !user) return;
    const res = await api().puzzle.delete({ puzzleId: pendingDelete.id, userId: user.id });
    if (res.success) {
      toast.success('Puzzle deleted');
      setPendingDelete(null);
      void load();
    } else {
      toast.error(res.error ?? 'Could not delete puzzle');
    }
  };

  const onLogout = async (): Promise<void> => {
    await api().auth.logout();
    setUser(null);
    setView({ kind: 'start' });
  };

  const surpriseMe = async (): Promise<void> => {
    if (!user || generating) return;
    const target: Difficulty = filter === 'all' ? 2 : filter;
    setGenerating(true);
    const t0 = Date.now();
    try {
      const gen = await api().puzzle.generate({ difficulty: target });
      if (!gen.success || !gen.cages) {
        toast.error(gen.error ?? 'Could not generate a unique puzzle');
        return;
      }
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const name = `Surprise ${difficultyLabel(target)} · ${stamp}`;
      const created = await api().puzzle.create({
        name,
        difficulty: target,
        cages: gen.cages,
        createdBy: user.id
      });
      if (created.success && created.puzzleId) {
        toast.success(`Generated in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
        setView({ kind: 'solve', puzzleId: created.puzzleId });
      } else {
        toast.error(created.error ?? 'Could not save generated puzzle');
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="relative flex-1 overflow-y-auto">
      <HomeBackdrop />
      <div className="relative z-10 px-10 py-10 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-accent mb-2 inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-glow" />
              Signed in as {user?.username}
            </p>
            <h1 className="text-5xl font-bold tracking-tight leading-none">
              <span className="bg-hero-gradient bg-clip-text text-transparent">Puzzles</span>
            </h1>
            <p className="text-sm text-ink-muted mt-2">
              Pick something to solve, or design your own.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(filter)}
              onChange={(e) => {
                const v = e.target.value;
                setFilter(v === 'all' ? 'all' : (Number(v) as Difficulty));
              }}
              options={[
                { value: 'all', label: 'All difficulties' },
                { value: '1', label: 'Easy' },
                { value: '2', label: 'Medium' },
                { value: '3', label: 'Hard' }
              ]}
            />
            <Button variant="secondary" onClick={() => setView({ kind: 'stats' })}>
              <BarChart3 className="h-4 w-4" />
              Stats
            </Button>
            <Button variant="secondary" onClick={() => setView({ kind: 'highscore' })}>
              <Trophy className="h-4 w-4" />
              Highscores
            </Button>
            <Button variant="secondary" onClick={() => void surpriseMe()} disabled={generating}>
              <Dices className="h-4 w-4" />
              {generating ? 'Generating…' : 'Surprise me'}
            </Button>
            <Button onClick={() => setView({ kind: 'create' })} className="shadow-glow">
              <Plus className="h-4 w-4" />
              New puzzle
            </Button>
            <Button variant="ghost" onClick={onLogout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
        ) : puzzles.length === 0 ? (
          <EmptyState
            title="No puzzles yet"
            description="Be the first to design one. The solver guarantees a unique solution before publishing."
            action={
              <Button onClick={() => setView({ kind: 'create' })}>
                <Plus className="h-4 w-4" />
                Create puzzle
              </Button>
            }
          />
        ) : (
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {puzzles.map((p) => {
              const style = DIFFICULTY_STYLES[p.difficulty];
              return (
                <motion.li
                  key={p.id}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ y: -3 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 22 }}
                  className={`relative group overflow-hidden rounded-xl border border-line/70 bg-bg-panel/55 backdrop-blur-md p-5 flex flex-col gap-3 ${style.ring}`}
                >
                  <div className="absolute -inset-px bg-card-sheen opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl" />
                  <div className="relative flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-ink truncate text-lg">{p.name}</h3>
                      <p className="text-xs text-ink-muted inline-flex items-center gap-1.5 mt-1">
                        <User className="h-3 w-3" />
                        {p.createdByName}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${style.chip}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {difficultyLabel(p.difficulty)}
                    </span>
                  </div>
                  <div className="relative flex items-center justify-between gap-2 mt-auto pt-2">
                    <Button
                      size="sm"
                      onClick={() => setView({ kind: 'solve', puzzleId: p.id })}
                      className="flex-1"
                    >
                      <Play className="h-4 w-4" />
                      Solve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setView({ kind: 'highscore', puzzleId: p.id })}
                      aria-label="Highscores for this puzzle"
                    >
                      <Trophy className="h-4 w-4" />
                    </Button>
                    {user && p.createdBy === user.id ? (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setPendingDelete(p)}
                        aria-label="Delete puzzle"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </div>

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete this puzzle?"
      >
        <p className="text-sm text-ink-muted mb-6">
          <span className="text-ink font-medium">{pendingDelete?.name}</span> and every score for it
          will be removed. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </Modal>
    </main>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  BarChart3,
  CalendarCheck2,
  Clock,
  Dices,
  Flame,
  LogOut,
  Play,
  Plus,
  Search,
  Trash2,
  Trophy,
  User,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/animations/EmptyState';
import { HomeBackdrop } from '@/components/animations/HomeBackdrop';
import { toast } from '@/components/ui/Toaster';
import { useApp } from '@/lib/store';
import { api } from '@/lib/ipc';
import { difficultyLabel, formatTime } from '@/lib/utils';
import type { Difficulty, PuzzleSummary, StreakInfo } from '@shared/types';

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

type SortKey = 'newest' | 'oldest' | 'hardest' | 'easiest' | 'fastest';
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'hardest', label: 'Hardest first' },
  { value: 'easiest', label: 'Easiest first' },
  { value: 'fastest', label: 'Fastest solved' }
];

const FILTER_SETTING_KEY = 'puzzleList.filter';
const SORT_SETTING_KEY = 'puzzleList.sort';
const ONBOARDING_SEEN_KEY = 'onboarding.surpriseSeen';

interface BestRow {
  puzzleId: number;
  bestSeconds: number;
}

export function PuzzleListPage(): JSX.Element {
  const setView = useApp((s) => s.setView);
  const setUser = useApp((s) => s.setUser);
  const user = useApp((s) => s.user);
  const defaultDifficulty = useApp((s) => s.defaultDifficulty);

  const [puzzles, setPuzzles] = useState<PuzzleSummary[]>([]);
  const [dailyPuzzle, setDailyPuzzle] = useState<PuzzleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Difficulty>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<PuzzleSummary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [bestSeconds, setBestSeconds] = useState<Map<number, number>>(new Map());
  const surpriseRef = useRef<HTMLButtonElement | null>(null);
  const settingsHydrated = useRef(false);

  // Hydrate filter/sort from settings on first mount.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api().settings.get({ key: FILTER_SETTING_KEY }),
      api().settings.get({ key: SORT_SETTING_KEY })
    ])
      .then(([f, s]) => {
        if (cancelled) return;
        if (f.value === '1' || f.value === '2' || f.value === '3') {
          setFilter(Number(f.value) as Difficulty);
        } else if (f.value === 'all') {
          setFilter('all');
        }
        if (s.value && SORT_OPTIONS.some((o) => o.value === s.value)) {
          setSortKey(s.value as SortKey);
        }
      })
      .finally(() => {
        settingsHydrated.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist filter & sort after they change (skip the hydrate roundtrip).
  useEffect(() => {
    if (!settingsHydrated.current) return;
    void api().settings.set({ key: FILTER_SETTING_KEY, value: String(filter) });
  }, [filter]);
  useEffect(() => {
    if (!settingsHydrated.current) return;
    void api().settings.set({ key: SORT_SETTING_KEY, value: sortKey });
  }, [sortKey]);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const [res, daily] = await Promise.all([
        api().puzzle.list(filter === 'all' ? undefined : { difficulty: filter }),
        api().puzzle.list({ isDaily: true })
      ]);
      setPuzzles(res.puzzles);
      const today = new Date().toISOString().split('T')[0];
      setDailyPuzzle(daily.puzzles.find((p) => p.dailyDate === today) || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filter]);

  // Fetch user's best time per puzzle for the "fastest" sort.
  useEffect(() => {
    if (!user || puzzles.length === 0) {
      setBestSeconds(new Map());
      return;
    }
    let cancelled = false;
    void Promise.all(
      puzzles.map((p) =>
        api()
          .result.bestForPuzzle({ userId: user.id, puzzleId: p.id })
          .then((r) => ({ puzzleId: p.id, best: r.best }))
          .catch(() => ({ puzzleId: p.id, best: null }))
      )
    ).then((rows) => {
      if (cancelled) return;
      const map = new Map<number, number>();
      for (const row of rows) {
        if (row.best) map.set(row.puzzleId, row.best.timeSeconds);
      }
      setBestSeconds(map);
    });
    return () => {
      cancelled = true;
    };
  }, [puzzles, user]);

  // Streak widget data.
  useEffect(() => {
    if (!user) return;
    void api().result.streak({ userId: user.id }).then(setStreak).catch(() => setStreak(null));
  }, [user]);

  useEffect(() => {
    const handler = (): void => void surpriseMe();
    window.addEventListener('surprise:me', handler);
    return () => window.removeEventListener('surprise:me', handler);
  });

  // First-time onboarding: when puzzle list is empty AND the user hasn't dismissed it.
  useEffect(() => {
    if (loading) return;
    if (puzzles.length !== 0) return;
    void api()
      .settings.get({ key: ONBOARDING_SEEN_KEY })
      .then((r) => {
        if (r.value !== '1') {
          // small delay so the UI settles before the tooltip animates in
          window.setTimeout(() => setShowOnboarding(true), 320);
        }
      });
  }, [loading, puzzles.length]);

  const dismissOnboarding = async (): Promise<void> => {
    setShowOnboarding(false);
    try {
      await api().settings.set({ key: ONBOARDING_SEEN_KEY, value: '1' });
    } catch {
      /* it's just a hint, OK to skip persist */
    }
  };

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
    // Honour filter first, then the user's preferred default.
    const target: Difficulty = filter === 'all' ? defaultDifficulty : filter;
    setGenerating(true);
    void dismissOnboarding();
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

  const filteredSorted = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered =
      term.length === 0
        ? puzzles
        : puzzles.filter((p) => p.name.toLowerCase().includes(term));

    const sorted = filtered.slice();
    sorted.sort((a, b) => {
      switch (sortKey) {
        case 'newest':
          return b.createdAt.localeCompare(a.createdAt) || b.id - a.id;
        case 'oldest':
          return a.createdAt.localeCompare(b.createdAt) || a.id - b.id;
        case 'hardest':
          return b.difficulty - a.difficulty || b.createdAt.localeCompare(a.createdAt);
        case 'easiest':
          return a.difficulty - b.difficulty || b.createdAt.localeCompare(a.createdAt);
        case 'fastest': {
          const aBest = bestSeconds.get(a.id);
          const bBest = bestSeconds.get(b.id);
          // Unsolved puzzles sort to the bottom.
          if (aBest === undefined && bBest === undefined) {
            return b.createdAt.localeCompare(a.createdAt);
          }
          if (aBest === undefined) return 1;
          if (bBest === undefined) return -1;
          return aBest - bBest;
        }
      }
    });
    return sorted;
  }, [puzzles, search, sortKey, bestSeconds]);

  return (
    <main className="relative flex-1 overflow-y-auto">
      <HomeBackdrop />
      <div className="relative z-10 px-10 py-10 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-accent mb-2 inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-glow" />
              Signed in as {user?.username}
            </p>
            <h1 className="text-5xl font-bold font-display tracking-tight leading-none">
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
            <Button
              ref={surpriseRef}
              variant="secondary"
              onClick={() => void surpriseMe()}
              disabled={generating}
              className="relative"
            >
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

        {/* Streak / daily widget */}
        {streak ? <StreakStrip info={streak} /> : null}

        {dailyPuzzle && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
              <CalendarCheck2 className="h-5 w-5 text-accent" />
              Daily Challenge
            </h2>
            <div
              onClick={() => setView({ kind: 'solve', puzzleId: dailyPuzzle.id })}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-accent/30 bg-accent/[0.03] p-6 transition-all hover:border-accent/50 hover:bg-accent/[0.06]"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-ink group-hover:text-accent transition-colors">
                    {dailyPuzzle.name}
                  </h3>
                  <p className="text-sm text-ink-muted mt-1">
                    Solve today's seeded puzzle and climb the global leaderboard.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-full border border-warning/40 text-warning bg-warning/10 text-xs font-bold uppercase tracking-wider">
                    Medium
                  </div>
                  <Button className="shadow-glow">
                    <Play className="h-4 w-4 fill-current" />
                    Solve now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search & sort row */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search puzzles by name…"
              className="pl-9 pr-9"
              aria-label="Search puzzles"
            />
            {search ? (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-bg-elevated focus-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Select
            aria-label="Sort puzzles"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            options={SORT_OPTIONS}
          />
          <span className="text-xs text-ink-muted ml-1 inline-flex items-center gap-1.5">
            {sortKey === 'oldest' || sortKey === 'easiest' ? (
              <ArrowUpAZ className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownAZ className="h-3.5 w-3.5" />
            )}
            {filteredSorted.length} of {puzzles.length}
          </span>
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
            description="Try 'Surprise me' to generate one in seconds, or design your own from scratch."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => void surpriseMe()} disabled={generating} className="shadow-glow">
                  <Dices className="h-4 w-4" />
                  {generating ? 'Generating…' : 'Surprise me'}
                </Button>
                <Button variant="secondary" onClick={() => setView({ kind: 'create' })}>
                  <Plus className="h-4 w-4" />
                  Design one
                </Button>
              </div>
            }
          />
        ) : filteredSorted.length === 0 ? (
          <EmptyState
            title="No matches"
            description={`Nothing in this list matches "${search}". Clear the search to see everything.`}
            action={
              <Button variant="secondary" onClick={() => setSearch('')}>
                <X className="h-4 w-4" /> Clear search
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
            {filteredSorted.map((p) => {
              const style = DIFFICULTY_STYLES[p.difficulty];
              const best = bestSeconds.get(p.id);
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
                      <p className="text-xs text-ink-muted flex items-center gap-1.5 mt-1">
                        <User className="h-3 w-3" />
                        {p.createdByName}
                      </p>
                      {best !== undefined ? (
                        <p className="text-[10px] text-cyan-glow flex items-center gap-1.5 mt-3 uppercase tracking-wider">
                          <Clock className="h-3 w-3" />
                          Best {formatTime(best)}
                        </p>
                      ) : null}
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
        dismissible={false}
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

      <AnimatePresence>
        {showOnboarding && surpriseRef.current ? (
          <OnboardingTooltip
            anchor={surpriseRef.current}
            onDismiss={() => void dismissOnboarding()}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function StreakStrip({ info }: { info: StreakInfo }): JSX.Element {
  const noActivity =
    info.solvedToday === 0 && info.currentStreak === 0 && info.longestStreak === 0;

  let multiplier = 1.0;
  if (info.currentStreak >= 30) multiplier = 2.0;
  else if (info.currentStreak >= 7) multiplier = 1.5;
  else if (info.currentStreak >= 3) multiplier = 1.25;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-2"
    >
      <div className="rounded-lg border border-accent/30 bg-accent/[0.06] backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <CalendarCheck2 className="h-5 w-5 text-accent shrink-0" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Solved today</p>
          <p className="text-xl font-mono tabular-num text-ink leading-tight">{info.solvedToday}</p>
        </div>
      </div>
      <div className="rounded-lg border border-magenta-glow/30 bg-magenta-glow/[0.06] backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <Flame className="h-5 w-5 text-magenta-glow shrink-0" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Current streak</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-mono tabular-num text-ink leading-tight">
              {info.currentStreak} day{info.currentStreak === 1 ? '' : 's'}
            </p>
            {multiplier > 1 && (
              <span className="text-[10px] font-bold bg-magenta-glow text-bg px-1.5 py-0.5 rounded">
                x{multiplier}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-cyan-glow/30 bg-cyan-glow/[0.06] backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <Trophy className="h-5 w-5 text-cyan-glow shrink-0" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Longest streak</p>
          <p className="text-xl font-mono tabular-num text-ink leading-tight">
            {info.longestStreak} day{info.longestStreak === 1 ? '' : 's'}
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-line/60 bg-bg-panel/55 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <div className="relative">
          <Dices className="h-5 w-5 text-ink-muted shrink-0" />
          {multiplier > 1 && (
            <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-magenta-glow animate-pulse" />
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">
            {noActivity ? 'Get started' : 'Keep going'}
          </p>
          <p className="text-xs text-ink leading-tight">
            {noActivity ? 'Hit Surprise me to begin' : 'Solve one more to extend'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function OnboardingTooltip({
  anchor,
  onDismiss
}: {
  anchor: HTMLElement;
  onDismiss: () => void;
}): JSX.Element {
  const rect = anchor.getBoundingClientRect();
  // Position the tooltip card just below the Surprise button.
  const top = rect.bottom + 14;
  const left = Math.max(16, rect.right - 320);
  return (
    <motion.div
      role="dialog"
      aria-label="Quick start"
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      style={{
        position: 'fixed',
        top,
        left,
        width: 320,
        zIndex: 70
      }}
      className="rounded-xl border border-accent/50 bg-bg-elevated/95 backdrop-blur-md shadow-elev p-4"
    >
      {/* Arrow pointing to the Surprise button */}
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        className="absolute -top-2 right-8 h-3 w-3 rotate-45 bg-bg-elevated border-l border-t border-accent/50"
        aria-hidden
      />
      <div className="flex items-start gap-3">
        <motion.div
          animate={{ rotate: [0, -6, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="h-9 w-9 rounded-lg bg-accent/15 text-accent inline-flex items-center justify-center shrink-0"
        >
          <Dices className="h-5 w-5" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink mb-1">Start with a generated puzzle</p>
          <p className="text-xs text-ink-muted leading-relaxed">
            <span className="text-accent font-medium">Surprise me</span> builds a guaranteed-unique
            Killer Sudoku in seconds. You don't have to design one from scratch.
          </p>
          <div className="flex justify-end mt-3 gap-2">
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Got it
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

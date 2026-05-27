import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  BarChart3,
  Clock,
  Flame,
  Lightbulb,
  Sparkles,
  Trophy,
  Calendar,
  History
} from 'lucide-react';
import { HomeBackdrop } from '@/components/animations/HomeBackdrop';
import { Skeleton } from '@/components/ui/Skeleton';
import { AnimatedNumber } from '@/components/animations/AnimatedNumber';
import { EmptyState } from '@/components/animations/EmptyState';
import { HistoryChart } from '@/components/stats/HistoryChart';
import { useApp } from '@/lib/store';
import { api } from '@/lib/ipc';
import { cn, difficultyLabel, formatTime } from '@/lib/utils';
import type { SolveHistoryEntry, UserStats, StreakInfo } from '@shared/types';

interface MetricCardProps {
  icon: JSX.Element;
  label: string;
  value: string | number | null;
  accent: 'violet' | 'cyan' | 'pink' | 'amber';
  animated?: number;
}

const ACCENTS: Record<MetricCardProps['accent'], { bg: string; ring: string; text: string }> = {
  violet: { bg: 'bg-accent/10', ring: 'border-accent/30', text: 'text-accent' },
  cyan: { bg: 'bg-cyan-glow/10', ring: 'border-cyan-glow/30', text: 'text-cyan-glow' },
  pink: { bg: 'bg-magenta-glow/10', ring: 'border-magenta-glow/30', text: 'text-magenta-glow' },
  amber: { bg: 'bg-warning/10', ring: 'border-warning/30', text: 'text-warning' }
};

function MetricCard({ icon, label, value, accent, animated }: MetricCardProps): JSX.Element {
  const a = ACCENTS[accent];
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={`relative overflow-hidden rounded-xl border ${a.ring} bg-bg-panel/55 backdrop-blur-md p-5`}
    >
      <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full ${a.bg} blur-2xl`} />
      <div className="relative">
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${a.bg} ${a.text} mb-3`}>
          {icon}
        </div>
        <p className="text-[10px] uppercase tracking-wider font-display text-ink-muted mb-1">{label}</p>
        <p className={`text-3xl font-bold font-mono tabular-num ${a.text}`}>
          {animated !== undefined ? <AnimatedNumber value={animated} duration={0.9} /> : value ?? '—'}
        </p>
      </div>
    </motion.div>
  );
}

function Heatmap({ entries }: { entries: SolveHistoryEntry[] }): JSX.Element {
  const today = new Date();
  const days = Array.from({ length: 56 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (55 - i));
    return d.toISOString().split('T')[0];
  });

  const solveCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      const d = e.completedAt.split(' ')[0];
      counts[d] = (counts[d] || 0) + 1;
    });
    return counts;
  }, [entries]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {days.map((d) => {
        const count = solveCounts[d] || 0;
        return (
          <div
            key={d}
            title={`${d}: ${count} solve${count === 1 ? '' : 's'}`}
            className={cn(
              'h-3 w-3 rounded-[2px] transition-colors',
              count === 0
                ? 'bg-line/20'
                : count === 1
                  ? 'bg-accent/30'
                  : count === 2
                    ? 'bg-accent/60'
                    : 'bg-accent shadow-glow'
            )}
          />
        );
      })}
    </div>
  );
}

export function StatsPage(): JSX.Element {
  const user = useApp((s) => s.user);
  const setView = useApp((s) => s.setView);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<SolveHistoryEntry[]>([]);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    void Promise.all([
      api().result.stats({ userId: user.id }),
      api().result.history({ userId: user.id, limit: 100 }),
      api().result.streak({ userId: user.id })
    ])
      .then(([s, h, str]) => {
        setStats(s);
        setHistory(h.entries);
        setStreak(str);
      })
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <main className="relative flex-1 overflow-y-auto">
      <HomeBackdrop intensity={0.5} />
      <div className="relative z-10 px-10 py-10 max-w-6xl mx-auto">
        <button
          onClick={() => setView({ kind: 'list' })}
          className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1 mb-3 focus-ring"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>

        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div className="flex-1 min-w-[280px]">
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-glow mb-3 inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-glow shadow-glowCyan" />
              Profile
            </p>
            <BarChart3 className="h-12 w-12 text-accent mb-2 drop-shadow-[0_0_24px_rgba(244,167,44,0.4)]" />
            <h1 className="text-5xl md:text-6xl font-bold font-display tracking-tight leading-none">
              <span className="bg-hero-gradient bg-clip-text text-transparent break-all">
                {user?.username}
              </span>
            </h1>
            <div className="flex items-center gap-4 mt-4">
              <div className="px-4 py-2 rounded-xl bg-bg-panel border border-accent/20 flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-ink-muted">Level</span>
                <span className="text-2xl font-bold text-accent">{user?.level ?? 1}</span>
              </div>
              <div className="flex-1 max-w-[200px]">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-ink-muted">XP</span>
                  <span className="text-xs font-mono text-ink">
                    {user?.xp ?? 0} / {(user?.level ?? 1) * (user?.level ?? 1) * 100}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-bg-panel border border-line/40 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.max(0, Math.min(
                        100,
                        (user?.xp ?? 0) / (Math.max(1, (user?.level ?? 1) * (user?.level ?? 1) * 100)) * 100
                      ))}%`
                    }}
                    className="h-full bg-accent shadow-glow"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : !stats || stats.totalSolved === 0 ? (
          <EmptyState
            title="No solves yet"
            description="Finish a puzzle to start building your stats."
            icon={<Sparkles className="h-8 w-8" />}
          />
        ) : (
          <>
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8"
            >
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <MetricCard
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Puzzles solved"
                  value={stats.totalSolved}
                  animated={stats.totalSolved}
                  accent="violet"
                />
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <MetricCard
                  icon={<Clock className="h-4 w-4" />}
                  label="Best time"
                  value={stats.bestTimeSeconds === null ? '—' : formatTime(stats.bestTimeSeconds)}
                  accent="cyan"
                />
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <MetricCard
                  icon={<Flame className="h-4 w-4" />}
                  label="Average time"
                  value={stats.avgTimeSeconds === null ? '—' : formatTime(stats.avgTimeSeconds)}
                  accent="pink"
                />
              </motion.div>
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <MetricCard
                  icon={<Trophy className="h-4 w-4" />}
                  label="Best score"
                  value={stats.bestScore ?? '—'}
                  animated={stats.bestScore ?? undefined}
                  accent="amber"
                />
              </motion.div>
            </motion.div>

            {history.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mb-8"
              >
                <div className="rounded-xl border border-line/70 bg-bg-panel/55 backdrop-blur-md p-6">
                   <h2 className="text-sm font-semibold font-display text-ink uppercase tracking-wider inline-flex items-center gap-2 mb-6">
                    <Calendar className="h-4 w-4 text-ink-muted" />
                    Activity Heatmap
                  </h2>
                  <Heatmap entries={history} />
                </div>
              </motion.div>
            ) : null}

            {history.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mb-8"
              >
                <HistoryChart entries={history} />
              </motion.div>
            ) : null}

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-line/70 bg-bg-panel/55 backdrop-blur-md overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-line/60 flex items-center justify-between">
                <h2 className="text-sm font-semibold font-display text-ink uppercase tracking-wider inline-flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-ink-muted" />
                  Per difficulty
                </h2>
                <span className="text-xs text-ink-muted inline-flex items-center gap-1.5">
                  <Lightbulb className="h-3 w-3" />
                  {stats.totalHints} total hints used
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3">
                {stats.byDifficulty.map((d) => (
                  <div
                    key={d.difficulty}
                    className="p-5 border-b md:border-b-0 md:border-r border-line/40 last:border-r-0 last:border-b-0"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${
                          d.difficulty === 1
                            ? 'border-success/40 text-success bg-success/10'
                            : d.difficulty === 2
                              ? 'border-warning/40 text-warning bg-warning/10'
                              : 'border-danger/40 text-danger bg-danger/10'
                        }`}
                      >
                        {difficultyLabel(d.difficulty)}
                      </span>
                      <span className="text-xs tabular-num text-ink-muted">
                        {d.solved} solved
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] text-ink-muted uppercase tracking-wider mb-1">Best</p>
                        <p className="text-ink font-mono tabular-num">
                          {d.bestTimeSeconds === null ? '—' : formatTime(d.bestTimeSeconds)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-ink-muted uppercase tracking-wider mb-1">Avg</p>
                        <p className="text-ink-muted font-mono tabular-num">
                          {d.avgTimeSeconds === null ? '—' : formatTime(d.avgTimeSeconds)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-xl border border-magenta-glow/30 bg-bg-panel/55 backdrop-blur-md p-6 mt-8"
            >
              <h2 className="text-sm font-semibold font-display text-ink uppercase tracking-wider inline-flex items-center gap-2 mb-6">
                <History className="h-4 w-4 text-magenta-glow" />
                Personal Records
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="surface p-4">
                  <p className="text-[10px] text-ink-muted uppercase tracking-wider mb-2">Longest Streak</p>
                  <p className="text-2xl font-bold text-magenta-glow">{stats.totalSolved > 0 ? (streak?.longestStreak || 0) : 0} days</p>
                </div>
                <div className="surface p-4">
                  <p className="text-[10px] text-ink-muted uppercase tracking-wider mb-2">Total Hours</p>
                  <p className="text-2xl font-bold text-cyan-glow">
                    {stats.avgTimeSeconds ? Math.floor((stats.avgTimeSeconds * stats.totalSolved) / 3600) : 0} hrs
                  </p>
                </div>
                <div className="surface p-4">
                  <p className="text-[10px] text-ink-muted uppercase tracking-wider mb-2">Total Hints</p>
                  <p className="text-2xl font-bold text-warning">{stats.totalHints}</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </main>
  );
}

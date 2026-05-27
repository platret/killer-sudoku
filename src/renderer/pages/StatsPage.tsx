import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  BarChart3,
  Clock,
  Flame,
  Lightbulb,
  Sparkles,
  Trophy
} from 'lucide-react';
import { HomeBackdrop } from '@/components/animations/HomeBackdrop';
import { Skeleton } from '@/components/ui/Skeleton';
import { AnimatedNumber } from '@/components/animations/AnimatedNumber';
import { EmptyState } from '@/components/animations/EmptyState';
import { useApp } from '@/lib/store';
import { api } from '@/lib/ipc';
import { difficultyLabel, formatTime } from '@/lib/utils';
import type { UserStats } from '@shared/types';

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
        <p className="text-[10px] uppercase tracking-wider text-ink-muted mb-1">{label}</p>
        <p className={`text-3xl font-bold tabular-num ${a.text}`}>
          {animated !== undefined ? <AnimatedNumber value={animated} duration={0.9} /> : value ?? '—'}
        </p>
      </div>
    </motion.div>
  );
}

export function StatsPage(): JSX.Element {
  const user = useApp((s) => s.user);
  const setView = useApp((s) => s.setView);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    void api()
      .result.stats({ userId: user.id })
      .then((s) => setStats(s))
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
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-glow mb-2 inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-glow shadow-glowCyan" />
              Profile
            </p>
            <h1 className="text-5xl font-bold tracking-tight leading-none inline-flex items-center gap-3">
              <BarChart3 className="h-10 w-10 text-accent drop-shadow-[0_0_24px_rgba(168,85,247,0.4)]" />
              <span className="bg-hero-gradient bg-clip-text text-transparent">
                {user?.username}
              </span>
            </h1>
            <p className="text-sm text-ink-muted mt-2">
              How you have been solving on this machine.
            </p>
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

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-line/70 bg-bg-panel/55 backdrop-blur-md overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-line/60 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wider inline-flex items-center gap-2">
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
          </>
        )}
      </div>
    </main>
  );
}

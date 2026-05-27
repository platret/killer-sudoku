import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Crown, Download, FileJson, Medal, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/animations/EmptyState';
import { HomeBackdrop } from '@/components/animations/HomeBackdrop';
import { toast } from '@/components/ui/Toaster';
import { useApp } from '@/lib/store';
import { api } from '@/lib/ipc';
import { formatTime } from '@/lib/utils';
import type { HighscoreEntry, Puzzle } from '@shared/types';

function rankIcon(i: number): JSX.Element {
  if (i === 0) return <Crown className="h-4 w-4 text-warning drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />;
  if (i === 1) return <Medal className="h-4 w-4 text-ink" />;
  if (i === 2) return <Medal className="h-4 w-4 text-ink-muted" />;
  return <span className="text-ink-muted tabular-num text-xs w-4 text-center">{i + 1}</span>;
}

export function HighscorePage(): JSX.Element {
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const puzzleId = view.kind === 'highscore' ? view.puzzleId : undefined;

  const [entries, setEntries] = useState<HighscoreEntry[]>([]);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null);

  const onExport = async (format: 'csv' | 'json'): Promise<void> => {
    if (exporting || entries.length === 0) return;
    setExporting(format);
    try {
      const res = await api().result.export({ format, puzzleId });
      if (res.success && res.path) {
        toast.success(`Exported to ${res.path.split('/').pop()}`);
      } else if (res.error && res.error !== 'Cancelled') {
        toast.error(res.error);
      }
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      api().result.highscores({ puzzleId }),
      puzzleId ? api().puzzle.get({ id: puzzleId }) : Promise.resolve({ puzzle: null })
    ]).then(([scores, puz]) => {
      if (cancelled) return;
      setEntries(scores.entries);
      setPuzzle(puz.puzzle);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [puzzleId]);

  return (
    <main className="relative flex-1 overflow-y-auto">
      <HomeBackdrop intensity={0.45} />
      <div className="relative z-10 px-10 py-10 max-w-5xl mx-auto">
        <button
          onClick={() => setView({ kind: 'list' })}
          className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1 mb-3 focus-ring"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-warning mb-2 inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-warning shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
              Leaderboard
            </p>
            <h1 className="text-5xl font-bold tracking-tight leading-none inline-flex items-center gap-3">
              <Trophy className="h-10 w-10 text-warning drop-shadow-[0_0_24px_rgba(251,191,36,0.4)]" />
              <span className="bg-hero-gradient bg-clip-text text-transparent">Highscores</span>
            </h1>
            <p className="text-sm text-ink-muted mt-2">
              {puzzle ? <>For <span className="text-ink font-medium">&ldquo;{puzzle.name}&rdquo;</span></> : 'Across every puzzle.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {puzzleId ? (
              <Button variant="secondary" onClick={() => setView({ kind: 'highscore' })}>
                Show all puzzles
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => void onExport('csv')}
              disabled={exporting !== null || entries.length === 0}
              aria-label="Export CSV"
            >
              <Download className="h-4 w-4" />
              {exporting === 'csv' ? 'Exporting…' : 'CSV'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void onExport('json')}
              disabled={exporting !== null || entries.length === 0}
              aria-label="Export JSON"
            >
              <FileJson className="h-4 w-4" />
              {exporting === 'json' ? 'Exporting…' : 'JSON'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            title="No scores yet"
            description="Be the first to record a time on this leaderboard."
            icon={<Trophy className="h-8 w-8" />}
          />
        ) : (
          <div className="rounded-xl border border-line/70 bg-bg-panel/55 backdrop-blur-md overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_100px_80px_120px] gap-3 px-4 py-3 border-b border-line/60 text-[10px] uppercase tracking-wider text-ink-muted">
              <span>#</span>
              <span>Player</span>
              <span className="text-right">Time</span>
              <span className="text-right">Hints</span>
              <span className="text-right">Score</span>
            </div>
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
            >
              {entries.map((e, i) => (
                <motion.li
                  key={`${e.username}-${e.completedAt}-${i}`}
                  variants={{ hidden: { opacity: 0, x: -6 }, show: { opacity: 1, x: 0 } }}
                  className={`grid grid-cols-[40px_1fr_100px_80px_120px] gap-3 px-4 py-3 border-b border-line/40 last:border-b-0 items-center ${
                    i === 0 ? 'bg-warning/[0.04]' : ''
                  }`}
                >
                  <span className="flex items-center justify-center">{rankIcon(i)}</span>
                  <span className="text-sm text-ink truncate">{e.username}</span>
                  <span className="text-right text-sm font-mono tabular-num text-ink">
                    {formatTime(e.timeSeconds)}
                  </span>
                  <span className="text-right text-sm font-mono tabular-num text-ink-muted">
                    {e.hintsUsed}
                  </span>
                  <span className="text-right text-sm font-mono tabular-num text-accent font-semibold">
                    {e.score}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        )}
      </div>
    </main>
  );
}

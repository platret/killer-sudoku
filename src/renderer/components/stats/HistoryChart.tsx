import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { difficultyLabel, formatTime } from '@/lib/utils';
import type { SolveHistoryEntry } from '@shared/types';

type Metric = 'score' | 'time';

interface Props {
  entries: SolveHistoryEntry[];
}

const W = 760;
const H = 240;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 18;
const PAD_B = 36;

interface Point {
  x: number;
  y: number;
  raw: SolveHistoryEntry;
  index: number;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  let m = 1;
  if (f > 5) m = 10;
  else if (f > 2) m = 5;
  else if (f > 1) m = 2;
  return m * exp;
}

function difficultyColor(d: 1 | 2 | 3): string {
  if (d === 1) return '#4cae6a';
  if (d === 2) return '#f4a72c';
  return '#e5484d';
}

export function HistoryChart({ entries }: Props): JSX.Element | null {
  const [metric, setMetric] = useState<Metric>('score');
  const [hover, setHover] = useState<number | null>(null);

  const { points, yMax, plotW, plotH } = useMemo(() => {
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;
    if (entries.length === 0) return { points: [] as Point[], yMax: 1, plotW, plotH };
    const values = entries.map((e) => (metric === 'score' ? e.score : e.timeSeconds));
    const max = niceMax(Math.max(...values, 1));
    const step = entries.length === 1 ? plotW / 2 : plotW / (entries.length - 1);
    const points: Point[] = entries.map((e, i) => ({
      x: PAD_L + step * i,
      y: PAD_T + plotH - (((metric === 'score' ? e.score : e.timeSeconds) / max) * plotH),
      raw: e,
      index: i
    }));
    return { points, yMax: max, plotW, plotH };
  }, [entries, metric]);

  if (entries.length === 0) return null;

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${path} L ${points[points.length - 1].x.toFixed(1)} ${(PAD_T + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(PAD_T + plotH).toFixed(1)} Z`;

  const yTicks = 4;
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => (yMax * i) / yTicks);

  const hoveredPoint = hover !== null ? points[hover] : null;
  const formatY = (v: number): string =>
    metric === 'score' ? Math.round(v).toLocaleString() : formatTime(v);

  return (
    <div className="rounded-xl border border-line/70 bg-bg-panel/55 backdrop-blur-md overflow-hidden">
      <div className="px-5 py-4 border-b border-line/60 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold font-display text-ink uppercase tracking-wider">
            Recent solves
          </h2>
          <p className="text-[11px] text-ink-muted mt-0.5">
            Last {entries.length} {entries.length === 1 ? 'solve' : 'solves'} · oldest → newest
          </p>
        </div>
        <div
          role="tablist"
          className="inline-flex rounded-md border border-line/10 bg-bg-surface/60 p-0.5 text-[11px]"
        >
          {(['score', 'time'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={metric === m}
              onClick={() => setMetric(m)}
              className={
                metric === m
                  ? 'px-3 py-1 rounded text-accent-foreground bg-accent font-semibold uppercase tracking-wider'
                  : 'px-3 py-1 rounded text-ink-muted hover:text-ink uppercase tracking-wider'
              }
            >
              {m === 'score' ? 'Score' : 'Time'}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto select-none"
            role="img"
            aria-label={`Recent solves ${metric} chart`}
          >
            <defs>
              <linearGradient id="area-grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#f4a72c" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#f4a72c" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="line-grad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#ffb845" />
                <stop offset="100%" stopColor="#f4a72c" />
              </linearGradient>
            </defs>
            {tickVals.map((v, i) => {
              const y = PAD_T + plotH - (v / yMax) * plotH;
              return (
                <g key={i}>
                  <line
                    x1={PAD_L}
                    x2={W - PAD_R}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray={i === 0 ? '' : '3 4'}
                  />
                  <text
                    x={PAD_L - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-ink-muted"
                    style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {formatY(v)}
                  </text>
                </g>
              );
            })}

            <motion.path
              d={areaPath}
              fill="url(#area-grad)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
            <motion.path
              d={path}
              fill="none"
              stroke="url(#line-grad)"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />

            {points.map((p) => (
              <g key={p.index}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hover === p.index ? 5 : 3.2}
                  fill={difficultyColor(p.raw.difficulty)}
                  stroke="rgb(var(--bg-base))"
                  strokeWidth={1.5}
                />
                <rect
                  x={p.x - 14}
                  y={PAD_T}
                  width={28}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(p.index)}
                  onMouseLeave={() => setHover((h) => (h === p.index ? null : h))}
                  className="cursor-crosshair"
                />
              </g>
            ))}

            {hoveredPoint ? (
              <g pointerEvents="none">
                <line
                  x1={hoveredPoint.x}
                  x2={hoveredPoint.x}
                  y1={PAD_T}
                  y2={PAD_T + plotH}
                  stroke="rgba(244,167,44,0.45)"
                  strokeDasharray="3 3"
                />
              </g>
            ) : null}

            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={PAD_T + plotH}
              y2={PAD_T + plotH}
              stroke="rgba(255,255,255,0.18)"
            />
          </svg>

          {hoveredPoint ? (
            <div
              className="absolute pointer-events-none rounded-md border border-line/10 bg-bg-elevated/95 backdrop-blur px-3 py-2 text-[11px] shadow-elev"
              style={{
                left: `${(hoveredPoint.x / W) * 100}%`,
                top: `${(hoveredPoint.y / H) * 100}%`,
                transform: 'translate(-50%, calc(-100% - 10px))',
                minWidth: 160
              }}
            >
              <p className="text-ink truncate max-w-[200px] font-semibold">
                {hoveredPoint.raw.puzzleName}
              </p>
              <p className="text-ink-muted text-[10px] uppercase tracking-wider mt-0.5">
                {difficultyLabel(hoveredPoint.raw.difficulty)} ·{' '}
                {new Date(hoveredPoint.raw.completedAt).toLocaleDateString()}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2 font-mono tabular-num">
                <div>
                  <p className="text-[9px] text-ink-muted uppercase">Score</p>
                  <p className="text-accent">{hoveredPoint.raw.score.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-ink-muted uppercase">Time</p>
                  <p className="text-cyan-glow">{formatTime(hoveredPoint.raw.timeSeconds)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-4 mt-3 text-[10px] uppercase tracking-wider text-ink-muted font-display">
          {([1, 2, 3] as const).map((d) => (
            <span key={d} className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: difficultyColor(d) }}
              />
              {difficultyLabel(d)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

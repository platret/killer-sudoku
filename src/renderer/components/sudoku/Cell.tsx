import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { Cell as CellValue } from '@shared/types';

interface Props {
  index: number;
  value: CellValue;
  notes: Set<number>;
  selected: boolean;
  peer: boolean;
  sameValue: boolean;
  error: boolean;
  hinted: boolean;
  cellSize: number;
  onClick: (index: number) => void;
  readOnly?: boolean;
}

function borders(index: number): string {
  const r = Math.floor(index / 9);
  const c = index % 9;
  const top = r % 3 === 0 ? 'border-t-2 border-t-line-strong' : 'border-t border-t-line';
  const left = c % 3 === 0 ? 'border-l-2 border-l-line-strong' : 'border-l border-l-line';
  const right = c === 8 ? 'border-r-2 border-r-line-strong' : '';
  const bottom = r === 8 ? 'border-b-2 border-b-line-strong' : '';
  return `${top} ${left} ${right} ${bottom}`;
}

export function Cell({
  index,
  value,
  notes,
  selected,
  peer,
  sameValue,
  error,
  hinted,
  cellSize,
  onClick,
  readOnly
}: Props): JSX.Element {
  return (
    <button
      role="gridcell"
      aria-label={`Cell row ${Math.floor(index / 9) + 1} column ${(index % 9) + 1}`}
      aria-selected={selected}
      onClick={() => onClick(index)}
      tabIndex={selected ? 0 : -1}
      className={cn(
        'relative flex items-center justify-center transition-colors focus:outline-none',
        borders(index),
        selected
          ? 'bg-accent/25 ring-2 ring-accent/60 ring-inset z-10'
          : sameValue
            ? 'bg-cyan-glow/18 ring-1 ring-cyan-glow/35 ring-inset'
            : peer
              ? 'bg-bg-surface/60'
              : 'bg-bg-base',
        error ? 'animate-shake' : '',
        readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-bg-surface'
      )}
      style={{ width: cellSize, height: cellSize }}
    >
      {value !== null ? (
        <motion.span
          key={`v-${value}`}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className={cn(
            'font-semibold tabular-num',
            error ? 'text-danger' : hinted ? 'text-accent' : 'text-ink'
          )}
          style={{ fontSize: Math.floor(cellSize * 0.5) }}
        >
          {value}
        </motion.span>
      ) : notes.size > 0 ? (
        <div className="absolute inset-1 grid grid-cols-3 grid-rows-3 place-items-center text-[9px] text-ink-muted font-mono">
          {Array.from({ length: 9 }).map((_, k) => (
            <span key={k} className="leading-none">
              {notes.has(k + 1) ? k + 1 : ''}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}

import { useEffect, useMemo, useRef } from 'react';
import { Cell } from './Cell';
import { CageLayer } from './CageLayer';
import type { Cage, CageInput, Grid as GridValues } from '@shared/types';

type CageLike = Cage | (CageInput & { id?: number });

interface Props {
  values: GridValues;
  notes: ReadonlyArray<Set<number>>;
  selected: number | null;
  errors: Set<number>;
  errorVersion?: number;
  hinted: Set<number>;
  givens?: Set<number>;
  cages: CageLike[];
  cellSize?: number;
  highlightCageIdx?: number | null;
  onSelect: (index: number) => void;
  readOnly?: boolean;
}

function peersOf(idx: number): Set<number> {
  const r = Math.floor(idx / 9);
  const c = idx % 9;
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  const out = new Set<number>();
  for (let i = 0; i < 9; i++) {
    out.add(r * 9 + i);
    out.add(i * 9 + c);
  }
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) out.add((br + dr) * 9 + (bc + dc));
  }
  out.delete(idx);
  return out;
}

export function Grid({
  values,
  notes,
  selected,
  errors,
  errorVersion = 0,
  hinted,
  givens,
  cages,
  cellSize = 54,
  highlightCageIdx,
  onSelect,
  readOnly
}: Props): JSX.Element {
  const peers = useMemo(() => (selected === null ? new Set<number>() : peersOf(selected)), [selected]);
  const selectedValue = selected !== null ? values[selected] : null;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected !== null && scrollRef.current) {
      const cell = scrollRef.current.querySelector(`[data-index="${selected}"]`);
      if (cell) {
        cell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [selected]);

  return (
    <div
      ref={scrollRef}
      role="grid"
      aria-label="Sudoku grid"
      className="relative bg-bg-base border-2 border-line-strong/20 shadow-elev"
      style={{ width: cellSize * 9, height: cellSize * 9 }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(9, ${cellSize}px)`,
          gridTemplateRows: `repeat(9, ${cellSize}px)`
        }}
      >
        {Array.from({ length: 81 }).map((_, i) => (
          <Cell
            key={i}
            index={i}
            value={values[i] ?? null}
            notes={notes[i] ?? new Set()}
            selected={selected === i}
            peer={peers.has(i)}
            sameValue={selectedValue !== null && selectedValue !== undefined && values[i] === selectedValue && i !== selected}
            error={errors.has(i)}
            errorVersion={errorVersion}
            hinted={hinted.has(i)}
            given={givens?.has(i) ?? false}
            cellSize={cellSize}
            onClick={onSelect}
            readOnly={readOnly}
          />
        ))}
      </div>
      <CageLayer cages={cages} cellSize={cellSize} highlightCageIdx={highlightCageIdx ?? null} />
    </div>
  );
}

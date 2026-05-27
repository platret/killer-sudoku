import { useMemo } from 'react';
import type { Cage, CageInput } from '@shared/types';

type CageLike = Cage | (CageInput & { id?: number });

interface Props {
  cages: CageLike[];
  cellSize: number;
  highlightCageIdx?: number | null;
}

interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const INSET = 4;

function cellIndex(r: number, c: number): number {
  return r * 9 + c;
}

function rcOf(i: number): { r: number; c: number } {
  return { r: Math.floor(i / 9), c: i % 9 };
}

export function CageLayer({ cages, cellSize, highlightCageIdx }: Props): JSX.Element {
  const W = cellSize * 9;
  const H = cellSize * 9;

  const data = useMemo(() => {
    return cages.map((cage) => {
      const set = new Set(cage.cells);
      const edges: Edge[] = [];
      for (const idx of cage.cells) {
        const { r, c } = rcOf(idx);
        const x = c * cellSize;
        const y = r * cellSize;
        const xi = x + INSET;
        const yi = y + INSET;
        const xj = x + cellSize - INSET;
        const yj = y + cellSize - INSET;

        if (!set.has(cellIndex(r - 1, c))) edges.push({ x1: xi, y1: yi, x2: xj, y2: yi });
        if (!set.has(cellIndex(r + 1, c))) edges.push({ x1: xi, y1: yj, x2: xj, y2: yj });
        if (!set.has(cellIndex(r, c - 1))) edges.push({ x1: xi, y1: yi, x2: xi, y2: yj });
        if (!set.has(cellIndex(r, c + 1))) edges.push({ x1: xj, y1: yi, x2: xj, y2: yj });
      }

      const head = cage.cells.slice().sort((a, b) => a - b)[0];
      const { r: hr, c: hc } = rcOf(head);
      const headPos = { x: hc * cellSize + 4, y: hr * cellSize + 4 };

      return { edges, headPos, target: cage.targetSum };
    });
  }, [cages, cellSize]);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 pointer-events-none"
      aria-hidden
    >
      {data.map((c, i) => {
        const highlight = highlightCageIdx === i;
        const stroke = highlight ? '#c084fc' : '#8b7fb8';
        return (
          <g key={i}>
            {c.edges.map((e, j) => (
              <line
                key={j}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke={stroke}
                strokeWidth={highlight ? 1.6 : 1}
                strokeDasharray="3,3"
              />
            ))}
          </g>
        );
      })}
      {data.map((c, i) => (
        <text
          key={`t-${i}`}
          x={c.headPos.x}
          y={c.headPos.y + 9}
          fontSize={10}
          fontFamily="JetBrains Mono, monospace"
          fill="#c4b5fd"
          fontWeight={700}
        >
          {c.target}
        </text>
      ))}
    </svg>
  );
}

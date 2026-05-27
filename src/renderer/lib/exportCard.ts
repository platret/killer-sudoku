import type { Cage, CageInput, Difficulty, Grid } from '@shared/types';
import { difficultyLabel, formatTime } from './utils';

type AnyCage = Cage | (CageInput & { id?: number });

export interface CardData {
  puzzleName: string;
  difficulty: Difficulty;
  player: string;
  values: Grid;
  cages: AnyCage[];
  timeSeconds: number;
  score: number;
  hintsUsed: number;
  forfeited?: boolean;
}

const W = 1080;
const H = 1080;
const GRID_SIZE = 720;
const CELL = GRID_SIZE / 9;
const GRID_X = (W - GRID_SIZE) / 2;
const GRID_Y = 200;

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, '#0c0b09');
  base.addColorStop(0.5, '#16140f');
  base.addColorStop(1, '#0c0b09');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  const blob1 = ctx.createRadialGradient(W * 0.15, H * 0.05, 0, W * 0.15, H * 0.05, W * 0.55);
  blob1.addColorStop(0, 'rgba(244,167,44,0.25)');
  blob1.addColorStop(1, 'transparent');
  ctx.fillStyle = blob1;
  ctx.fillRect(0, 0, W, H);

  const blob2 = ctx.createRadialGradient(W * 0.95, H * 0.1, 0, W * 0.95, H * 0.1, W * 0.5);
  blob2.addColorStop(0, 'rgba(181,101,29,0.2)');
  blob2.addColorStop(1, 'transparent');
  ctx.fillStyle = blob2;
  ctx.fillRect(0, 0, W, H);

  const blob3 = ctx.createRadialGradient(W * 0.5, H * 1.05, 0, W * 0.5, H * 1.05, W * 0.6);
  blob3.addColorStop(0, 'rgba(122,62,18,0.15)');
  blob3.addColorStop(1, 'transparent');
  ctx.fillStyle = blob3;
  ctx.fillRect(0, 0, W, H);
}

const HEADER_MAX_WIDTH = W - 2 * GRID_X;

function fitTitleFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx = 64,
  minPx = 28
): number {
  let size = startPx;
  while (size > minPx) {
    ctx.font = `700 ${size}px "Space Grotesk Variable", "Space Grotesk", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return minPx;
}

function truncateToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + '…';
}

function drawHeader(ctx: CanvasRenderingContext2D, data: CardData): void {
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  ctx.font = '700 14px "Space Grotesk Variable", "Space Grotesk", sans-serif';
  const accent = data.forfeited ? '#e5484d' : '#f4a72c';
  ctx.fillStyle = accent;
  const eyebrow = data.forfeited ? 'FORFEITED' : 'SOLVED';
  ctx.fillText(eyebrow + '  ·  KILLER SUDOKU', GRID_X, 70);

  const titleSize = fitTitleFont(ctx, data.puzzleName, HEADER_MAX_WIDTH, 64, 28);
  ctx.font = `700 ${titleSize}px "Space Grotesk Variable", "Space Grotesk", sans-serif`;
  const titleFitted = truncateToWidth(ctx, data.puzzleName, HEADER_MAX_WIDTH);
  const grad = ctx.createLinearGradient(GRID_X, 0, GRID_X + HEADER_MAX_WIDTH, 0);
  grad.addColorStop(0, '#ffb845');
  grad.addColorStop(0.5, '#f4a72c');
  grad.addColorStop(1, '#f3eee2');
  ctx.fillStyle = grad;
  const titleY = 96 + (64 - titleSize) / 2;
  ctx.fillText(titleFitted, GRID_X, titleY);

  ctx.font = '500 22px "SoraVariable", "Sora", sans-serif';
  ctx.fillStyle = '#a39a8a';
  const sub = `${data.player}  ·  ${difficultyLabel(data.difficulty)}`;
  ctx.fillText(sub, GRID_X, 168);
}

function drawGridCells(ctx: CanvasRenderingContext2D, data: CardData): void {
  ctx.fillStyle = '#0c0b09';
  ctx.fillRect(GRID_X, GRID_Y, GRID_SIZE, GRID_SIZE);

  ctx.font = '600 42px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9);
    const c = i % 9;
    const x = GRID_X + c * CELL;
    const y = GRID_Y + r * CELL;
    const v = data.values[i];
    if (v !== null && v !== undefined) {
      ctx.fillStyle = '#f3eee2';
      ctx.fillText(String(v), x + CELL / 2, y + CELL / 2 + 2);
    }
  }

  for (let i = 0; i <= 9; i++) {
    const isMajor = i % 3 === 0;
    ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = isMajor ? 3 : 1;
    ctx.beginPath();
    ctx.moveTo(GRID_X + i * CELL, GRID_Y);
    ctx.lineTo(GRID_X + i * CELL, GRID_Y + GRID_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(GRID_X, GRID_Y + i * CELL);
    ctx.lineTo(GRID_X + GRID_SIZE, GRID_Y + i * CELL);
    ctx.stroke();
  }
}

function drawCageOutlines(ctx: CanvasRenderingContext2D, cages: AnyCage[]): void {
  const INSET = 5;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(163, 154, 138, 0.7)';
  ctx.lineWidth = 1.2;

  for (const cage of cages) {
    const set = new Set(cage.cells);
    ctx.beginPath();
    for (const idx of cage.cells) {
      const r = Math.floor(idx / 9);
      const c = idx % 9;
      const x = GRID_X + c * CELL;
      const y = GRID_Y + r * CELL;
      const xi = x + INSET;
      const yi = y + INSET;
      const xj = x + CELL - INSET;
      const yj = y + CELL - INSET;
      if (!set.has((r - 1) * 9 + c) || r === 0) {
        ctx.moveTo(xi, yi);
        ctx.lineTo(xj, yi);
      }
      if (!set.has((r + 1) * 9 + c) || r === 8) {
        ctx.moveTo(xi, yj);
        ctx.lineTo(xj, yj);
      }
      if (c === 0 || !set.has(r * 9 + (c - 1))) {
        ctx.moveTo(xi, yi);
        ctx.lineTo(xi, yj);
      }
      if (c === 8 || !set.has(r * 9 + (c + 1))) {
        ctx.moveTo(xj, yi);
        ctx.lineTo(xj, yj);
      }
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.font = '700 14px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#f4a72c';
  for (const cage of cages) {
    const head = cage.cells.slice().sort((a, b) => a - b)[0];
    const r = Math.floor(head / 9);
    const c = head % 9;
    ctx.fillText(String(cage.targetSum), GRID_X + c * CELL + 8, GRID_Y + r * CELL + 8);
  }
}

interface StatColumn {
  label: string;
  value: string;
  color: string;
}

function drawStats(ctx: CanvasRenderingContext2D, data: CardData): void {
  const baseY = GRID_Y + GRID_SIZE + 36;
  const columns: StatColumn[] = data.forfeited
    ? [
        { label: 'STATUS', value: 'FORFEITED', color: '#e5484d' },
        { label: 'TIME', value: formatTime(data.timeSeconds), color: '#f3eee2' },
        { label: 'HINTS', value: String(data.hintsUsed), color: '#ffb845' }
      ]
    : [
        { label: 'TIME', value: formatTime(data.timeSeconds), color: '#4cae6a' },
        { label: 'SCORE', value: String(data.score), color: '#f4a72c' },
        { label: 'HINTS', value: String(data.hintsUsed), color: '#e5484d' }
      ];

  const total = W - 2 * GRID_X;
  const colW = total / columns.length;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  columns.forEach((col, i) => {
    const cx = GRID_X + colW * i + colW / 2;
    ctx.font = '600 12px "Space Grotesk Variable", "Space Grotesk", sans-serif';
    ctx.fillStyle = '#a39a8a';
    const labelMetrics = ctx.measureText(col.label);
    ctx.fillText(col.label, cx, baseY);
    ctx.fillStyle = `${col.color}33`;
    ctx.fillRect(
      cx - labelMetrics.width / 2 - 8,
      baseY - 2,
      labelMetrics.width + 16,
      18
    );
    ctx.fillStyle = '#a39a8a';
    ctx.fillText(col.label, cx, baseY);

    ctx.font = '700 54px "JetBrains Mono", monospace';
    ctx.fillStyle = col.color;
    ctx.shadowColor = `${col.color}88`;
    ctx.shadowBlur = 24;
    ctx.fillText(col.value, cx, baseY + 28);
    ctx.shadowBlur = 0;
  });
}

function drawWatermark(ctx: CanvasRenderingContext2D): void {
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';

  ctx.font = '600 16px "Space Grotesk Variable", "Space Grotesk", sans-serif';
  ctx.fillStyle = '#f3eee2';
  ctx.fillText('KillerSudoku', W - 40, H - 50);

  ctx.font = '500 13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#a39a8a';
  ctx.fillText('https://github.com/platret/killer-sudoku', W - 40, H - 28);

  ctx.fillStyle = '#f4a72c';
  ctx.fillRect(40, H - 40, 12, 12);
  ctx.fillStyle = '#4cae6a';
  ctx.fillRect(58, H - 40, 12, 12);
  ctx.fillStyle = '#e5484d';
  ctx.fillRect(76, H - 40, 12, 12);
}

export function drawSolvedCard(canvas: HTMLCanvasElement, data: CardData): void {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context not available');
  drawBackground(ctx);
  drawHeader(ctx, data);
  drawGridCells(ctx, data);
  drawCageOutlines(ctx, data.cages);
  drawStats(ctx, data);
  drawWatermark(ctx);
}

export function exportPngBase64(data: CardData): string {
  const c = document.createElement('canvas');
  drawSolvedCard(c, data);
  const url = c.toDataURL('image/png');
  return url.split(',')[1] ?? '';
}

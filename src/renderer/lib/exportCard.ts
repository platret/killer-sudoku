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
  base.addColorStop(0, '#0a0612');
  base.addColorStop(0.5, '#1a1535');
  base.addColorStop(1, '#0a0612');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  const blob1 = ctx.createRadialGradient(W * 0.15, H * 0.05, 0, W * 0.15, H * 0.05, W * 0.55);
  blob1.addColorStop(0, 'rgba(168,85,247,0.28)');
  blob1.addColorStop(1, 'transparent');
  ctx.fillStyle = blob1;
  ctx.fillRect(0, 0, W, H);

  const blob2 = ctx.createRadialGradient(W * 0.95, H * 0.1, 0, W * 0.95, H * 0.1, W * 0.5);
  blob2.addColorStop(0, 'rgba(6,182,212,0.22)');
  blob2.addColorStop(1, 'transparent');
  ctx.fillStyle = blob2;
  ctx.fillRect(0, 0, W, H);

  const blob3 = ctx.createRadialGradient(W * 0.5, H * 1.05, 0, W * 0.5, H * 1.05, W * 0.6);
  blob3.addColorStop(0, 'rgba(236,72,153,0.18)');
  blob3.addColorStop(1, 'transparent');
  ctx.fillStyle = blob3;
  ctx.fillRect(0, 0, W, H);
}

function drawHeader(ctx: CanvasRenderingContext2D, data: CardData): void {
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  ctx.font = '700 14px "Inter", system-ui, sans-serif';
  const accent = data.forfeited ? '#f43f5e' : '#a855f7';
  ctx.fillStyle = accent;
  const eyebrow = data.forfeited ? 'FORFEITED' : 'SOLVED';
  ctx.fillText(eyebrow + '  ·  KILLER SUDOKU', GRID_X, 70);

  ctx.font = '700 64px "Inter", system-ui, sans-serif';
  const grad = ctx.createLinearGradient(GRID_X, 0, GRID_X + 600, 0);
  grad.addColorStop(0, '#c084fc');
  grad.addColorStop(0.5, '#f0abfc');
  grad.addColorStop(1, '#67e8f9');
  ctx.fillStyle = grad;
  ctx.fillText(data.puzzleName, GRID_X, 96);

  ctx.font = '500 22px "Inter", system-ui, sans-serif';
  ctx.fillStyle = '#a8a4c4';
  const sub = `${data.player}  ·  ${difficultyLabel(data.difficulty)}`;
  ctx.fillText(sub, GRID_X, 168);
}

function drawGridCells(ctx: CanvasRenderingContext2D, data: CardData): void {
  ctx.fillStyle = '#0a0612';
  ctx.fillRect(GRID_X, GRID_Y, GRID_SIZE, GRID_SIZE);

  ctx.font = '600 42px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9);
    const c = i % 9;
    const x = GRID_X + c * CELL;
    const y = GRID_Y + r * CELL;
    const v = data.values[i];
    if (v !== null && v !== undefined) {
      ctx.fillStyle = '#fafafa';
      ctx.fillText(String(v), x + CELL / 2, y + CELL / 2 + 2);
    }
  }

  for (let i = 0; i <= 9; i++) {
    const isMajor = i % 3 === 0;
    ctx.strokeStyle = isMajor ? '#5a4f80' : '#2a2444';
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
  ctx.strokeStyle = '#9d8fc4';
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

  ctx.font = '700 14px "JetBrains Mono", "Consolas", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#c4b5fd';
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
        { label: 'STATUS', value: 'FORFEITED', color: '#f43f5e' },
        { label: 'TIME', value: formatTime(data.timeSeconds), color: '#06b6d4' },
        { label: 'HINTS', value: String(data.hintsUsed), color: '#fbbf24' }
      ]
    : [
        { label: 'TIME', value: formatTime(data.timeSeconds), color: '#06b6d4' },
        { label: 'SCORE', value: String(data.score), color: '#a855f7' },
        { label: 'HINTS', value: String(data.hintsUsed), color: '#fbbf24' }
      ];

  const total = W - 2 * GRID_X;
  const colW = total / columns.length;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  columns.forEach((col, i) => {
    const cx = GRID_X + colW * i + colW / 2;
    ctx.font = '600 12px "Inter", system-ui, sans-serif';
    ctx.fillStyle = '#a8a4c4';
    const labelMetrics = ctx.measureText(col.label);
    ctx.fillText(col.label, cx, baseY);
    ctx.fillStyle = `${col.color}33`;
    ctx.fillRect(
      cx - labelMetrics.width / 2 - 8,
      baseY - 2,
      labelMetrics.width + 16,
      18
    );
    ctx.fillStyle = '#a8a4c4';
    ctx.fillText(col.label, cx, baseY);

    ctx.font = '700 54px "Inter", system-ui, sans-serif';
    ctx.fillStyle = col.color;
    ctx.shadowColor = `${col.color}88`;
    ctx.shadowBlur = 24;
    ctx.fillText(col.value, cx, baseY + 28);
    ctx.shadowBlur = 0;
  });
}

function drawWatermark(ctx: CanvasRenderingContext2D): void {
  ctx.font = '600 14px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#6b6790';
  ctx.fillText('KillerSudoku · platret/killer-sudoku', W - 40, H - 30);

  ctx.fillStyle = '#a855f7';
  ctx.fillRect(40, H - 40, 12, 12);
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(58, H - 40, 12, 12);
  ctx.fillStyle = '#ec4899';
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

interface Particle {
  hx: number;
  hy: number;
  rot: number;
  scale: number;
  delay: number;
  color: string;
  shape: 'square' | 'circle' | 'rect';
}

const PALETTE = ['#a855f7', '#c084fc', '#06b6d4', '#67e8f9', '#ec4899', '#fbbf24'];

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const radius = 240 + Math.random() * 380;
    return {
      hx: Math.cos(angle) * radius,
      hy: Math.sin(angle) * radius * 0.7 - 90,
      rot: (Math.random() - 0.5) * 1080,
      scale: 0.7 + Math.random() * 0.9,
      delay: Math.random() * 0.4,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      shape: (['square', 'rect', 'circle'] as const)[Math.floor(Math.random() * 3)]
    };
  });
}

function drawConfetti(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  t: number,
  duration: number
): void {
  const cx = W / 2;
  const cy = H / 2;
  for (const p of particles) {
    const u = Math.max(0, Math.min(1, (t - p.delay) / (duration - p.delay)));
    if (u <= 0) continue;
    const ease = 1 - Math.pow(1 - u, 3);
    const x = cx + p.hx * ease;
    const y = cy + p.hy * ease + Math.pow(u, 2) * 320;
    const rot = (p.rot * ease * Math.PI) / 180;
    const opacity = u < 0.1 ? u * 10 : u > 0.8 ? (1 - u) * 5 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.shadowColor = `${p.color}88`;
    ctx.shadowBlur = 14;
    ctx.fillStyle = p.color;
    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, 8 * p.scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'rect') {
      ctx.fillRect(-10 * p.scale, -3 * p.scale, 20 * p.scale, 6 * p.scale);
    } else {
      ctx.fillRect(-7 * p.scale, -7 * p.scale, 14 * p.scale, 14 * p.scale);
    }
    ctx.restore();
  }
}

export async function exportWebmBase64(
  data: CardData,
  durationMs = 4000,
  onProgress?: (ratio: number) => void
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context not available');

  drawSolvedCard(canvas, data);

  const stream = canvas.captureStream(30);
  const chunks: BlobPart[] = [];
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stopPromise = new Promise<string>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? '');
        resolve(result.split(',')[1] ?? '');
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    };
    recorder.onerror = (e) => reject(e);
  });

  recorder.start();
  const particles = makeParticles(80);
  const startedAt = performance.now();

  return new Promise<string>((resolve, reject) => {
    const tick = (now: number): void => {
      const elapsed = now - startedAt;
      const t = elapsed / 1000;
      drawSolvedCard(canvas, data);
      drawConfetti(ctx, particles, t, durationMs / 1000);
      if (onProgress) onProgress(Math.min(1, elapsed / durationMs));
      if (elapsed >= durationMs) {
        recorder.stop();
        stream.getTracks().forEach((tr) => tr.stop());
        stopPromise.then(resolve).catch(reject);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

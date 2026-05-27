type AudioContextClass = typeof AudioContext;

let ctx: AudioContext | null = null;
let muted = false;
let lastPlay: Record<string, number> = {};

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      (window as unknown as { AudioContext?: AudioContextClass }).AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setSoundMuted(value: boolean): void {
  muted = value;
}

export function isSoundMuted(): boolean {
  return muted;
}

interface ToneOpts {
  freq: number;
  freqEnd?: number;
  durationMs: number;
  type?: OscillatorType;
  volume?: number;
  delayMs?: number;
  attackMs?: number;
}

function tone(opts: ToneOpts): void {
  const c = getCtx();
  if (!c || muted) return;
  const now = c.currentTime + (opts.delayMs ?? 0) / 1000;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, now);
  if (opts.freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, opts.freqEnd),
      now + opts.durationMs / 1000
    );
  }
  const peak = opts.volume ?? 0.1;
  const attack = (opts.attackMs ?? 8) / 1000;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.durationMs / 1000);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + opts.durationMs / 1000 + 0.05);
}

function throttled(key: string, minGapMs: number): boolean {
  const now = performance.now();
  if (lastPlay[key] !== undefined && now - lastPlay[key] < minGapMs) return false;
  lastPlay[key] = now;
  return true;
}

export const playSound = {
  click(): void {
    if (!throttled('click', 25)) return;
    tone({ freq: 1500, durationMs: 35, type: 'square', volume: 0.04 });
  },
  hover(): void {
    if (!throttled('hover', 80)) return;
    tone({ freq: 1100, durationMs: 22, type: 'sine', volume: 0.02 });
  },
  place(): void {
    if (!throttled('place', 30)) return;
    tone({ freq: 660, durationMs: 85, type: 'sine', volume: 0.08 });
    tone({ freq: 990, durationMs: 55, type: 'sine', volume: 0.05, delayMs: 30 });
  },
  clear(): void {
    if (!throttled('clear', 30)) return;
    tone({ freq: 340, durationMs: 60, type: 'triangle', volume: 0.06 });
  },
  error(): void {
    if (!throttled('error', 120)) return;
    tone({ freq: 200, freqEnd: 140, durationMs: 220, type: 'sawtooth', volume: 0.09 });
  },
  hint(): void {
    if (!throttled('hint', 150)) return;
    tone({ freq: 1320, freqEnd: 1980, durationMs: 240, type: 'sine', volume: 0.1 });
    tone({ freq: 1980, freqEnd: 2640, durationMs: 200, type: 'sine', volume: 0.06, delayMs: 80 });
  },
  toggle(): void {
    if (!throttled('toggle', 60)) return;
    tone({ freq: 720, durationMs: 50, type: 'triangle', volume: 0.05 });
    tone({ freq: 960, durationMs: 50, type: 'triangle', volume: 0.05, delayMs: 30 });
  },
  open(): void {
    if (!throttled('open', 80)) return;
    tone({ freq: 880, freqEnd: 1320, durationMs: 120, type: 'sine', volume: 0.06 });
  },
  success(): void {
    if (!throttled('success', 400)) return;
    tone({ freq: 523.25, durationMs: 150, type: 'sine', volume: 0.1, delayMs: 0 });
    tone({ freq: 659.25, durationMs: 150, type: 'sine', volume: 0.1, delayMs: 140 });
    tone({ freq: 783.99, durationMs: 150, type: 'sine', volume: 0.1, delayMs: 280 });
    tone({ freq: 1046.5, durationMs: 320, type: 'sine', volume: 0.13, delayMs: 420 });
    tone({ freq: 1567.98, durationMs: 280, type: 'triangle', volume: 0.06, delayMs: 480 });
  },
  forfeit(): void {
    if (!throttled('forfeit', 400)) return;
    tone({
      freq: 440,
      freqEnd: 392,
      durationMs: 240,
      type: 'sawtooth',
      volume: 0.11,
      delayMs: 0
    });
    tone({
      freq: 392,
      freqEnd: 349.23,
      durationMs: 240,
      type: 'sawtooth',
      volume: 0.11,
      delayMs: 220
    });
    tone({
      freq: 349.23,
      freqEnd: 311.13,
      durationMs: 280,
      type: 'sawtooth',
      volume: 0.12,
      delayMs: 440
    });
    tone({
      freq: 261.63,
      freqEnd: 207.65,
      durationMs: 600,
      type: 'sawtooth',
      volume: 0.13,
      delayMs: 720
    });
  },
  startup(): void {
    if (!throttled('startup', 800)) return;
    tone({ freq: 261.63, durationMs: 180, type: 'triangle', volume: 0.08, delayMs: 0 });
    tone({ freq: 329.63, durationMs: 180, type: 'triangle', volume: 0.08, delayMs: 160 });
    tone({ freq: 392.0, durationMs: 200, type: 'triangle', volume: 0.1, delayMs: 320 });
    tone({ freq: 523.25, durationMs: 260, type: 'sine', volume: 0.12, delayMs: 500 });
    tone({ freq: 783.99, durationMs: 220, type: 'sine', volume: 0.07, delayMs: 560 });
  }
};

export function unlockAudio(): void {
  // Browsers gate AudioContext until a user gesture.
  // Call this from a click/keydown handler to warm it up.
  getCtx();
}

import { Minus, Square, X } from 'lucide-react';
import { safeApi } from '@/lib/ipc';

export function TitleBar(): JSX.Element {
  const minimize = (): void => { safeApi()?.window.minimize(); };
  const maximize = (): void => { safeApi()?.window.maximize(); };
  const close = (): void => { safeApi()?.window.close(); };
  return (
    <header className="titlebar-drag h-9 flex items-center justify-between px-3 border-b border-line bg-bg-base/95 backdrop-blur z-50 select-none">
      <div className="flex items-center gap-2.5">
        <div className="h-4 w-4 grid grid-cols-3 gap-[1px] shadow-glow rounded-[2px]" aria-hidden>
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className={i === 4 ? 'bg-accent shadow-[0_0_6px_rgba(168,85,247,0.8)]' : 'bg-line-strong'}
              style={{ borderRadius: 1 }}
            />
          ))}
        </div>
        <span className="text-[11px] font-semibold tracking-[0.16em] text-ink uppercase">
          Killer<span className="text-accent">Sudoku</span>
        </span>
      </div>
      <div className="titlebar-no-drag flex items-center">
        <button
          aria-label="Minimize"
          onClick={minimize}
          className="h-9 w-11 flex items-center justify-center text-ink-muted hover:bg-bg-surface hover:text-ink transition-colors"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Maximize"
          onClick={maximize}
          className="h-9 w-11 flex items-center justify-center text-ink-muted hover:bg-bg-surface hover:text-ink transition-colors"
        >
          <Square className="h-3 w-3" />
        </button>
        <button
          aria-label="Close"
          onClick={close}
          className="h-9 w-11 flex items-center justify-center text-ink-muted hover:bg-danger hover:text-white transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}

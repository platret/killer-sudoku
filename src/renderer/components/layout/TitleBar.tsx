import { HelpCircle, Minus, Moon, Settings as SettingsIcon, Square, Sun, X } from 'lucide-react';
import { safeApi } from '@/lib/ipc';
import { useApp } from '@/lib/store';
import { api } from '@/lib/ipc';

export function TitleBar(): JSX.Element {
  const minimize = (): void => { safeApi()?.window.minimize(); };
  const maximize = (): void => { safeApi()?.window.maximize(); };
  const close = (): void => { safeApi()?.window.close(); };
  const user = useApp((s) => s.user);
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  const setHowToOpen = useApp((s) => s.setHowToOpen);
  const showChrome = true;
  const showSettings = !!user && view.kind !== 'settings' && view.kind !== 'auth' && view.kind !== 'start';
  const toggleTheme = (): void => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    void api().settings.set({ key: 'theme', value: next });
  };
  return (
    <header className="titlebar-drag h-9 flex items-center justify-between px-3 border-b border-line/10 bg-bg-base/95 backdrop-blur z-50 select-none">
      <div className="flex items-center gap-2.5">
        <div className="h-4 w-4 grid grid-cols-3 gap-[1px] shadow-glow rounded-[2px]" aria-hidden>
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className={i === 4 ? 'bg-accent shadow-[0_0_6px_rgba(244,167,44,0.8)]' : 'bg-line-strong'}
              style={{ borderRadius: 1 }}
            />
          ))}
        </div>
        <span className="text-[11px] font-semibold tracking-[0.16em] text-ink uppercase">
          Killer<span className="text-accent">Sudoku</span>
        </span>
      </div>
      <div className="titlebar-no-drag flex items-center">
        {showChrome ? (
          <button
            aria-label="How to play"
            title="How to play Killer Sudoku"
            onClick={() => setHowToOpen(true)}
            className="h-9 px-3 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-muted hover:text-accent hover:bg-bg-surface rounded transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">How to</span>
          </button>
        ) : null}
        {showChrome ? (
          <button
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
            className="h-9 px-3 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-muted hover:text-accent hover:bg-bg-surface rounded transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        ) : null}
        {showSettings ? (
          <button
            aria-label="Settings"
            title="Settings"
            onClick={() => setView({ kind: 'settings' })}
            className="h-9 px-3 mr-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-muted hover:text-accent hover:bg-bg-surface rounded transition-colors"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        ) : null}
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

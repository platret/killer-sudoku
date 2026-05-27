import { Component, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TitleBar } from './components/layout/TitleBar';
import { DbErrorScreen } from './components/layout/DbErrorScreen';
import { Toaster } from './components/ui/Toaster';
import { CommandPalette } from './components/palette/CommandPalette';
import { ShortcutsOverlay } from './components/shortcuts/ShortcutsOverlay';
import { SplashScreen } from './components/animations/SplashScreen';
import { HowToPlay } from './components/help/HowToPlay';
import { StartPage } from './pages/StartPage';
import { AuthPage } from './pages/AuthPage';
import { PuzzleListPage } from './pages/PuzzleListPage';
import { SolvePage } from './pages/SolvePage';
import { CreatePage } from './pages/CreatePage';
import { HighscorePage } from './pages/HighscorePage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';
import { useApp } from './lib/store';
import { hasApi, safeApi } from './lib/ipc';
import { setSoundMuted } from './lib/sounds';
import type { Difficulty } from '@shared/types';

interface BoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    console.error('[renderer] uncaught error', error, info);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <main className="flex-1 flex items-center justify-center px-8">
          <div className="max-w-2xl w-full surface p-8">
            <h1 className="text-xl font-bold text-ink mb-2">Renderer error</h1>
            <p className="text-sm text-ink-muted mb-4">
              The UI crashed. Reload the window to recover. Full stack below.
            </p>
            <pre className="text-xs text-danger bg-bg-surface border border-line/10 rounded-md p-3 overflow-auto max-h-80 font-mono whitespace-pre-wrap">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack ?? ''}
            </pre>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

function MissingApiScreen(): JSX.Element {
  return (
    <main className="flex-1 flex items-center justify-center px-8">
      <div className="max-w-xl w-full surface p-8">
        <h1 className="text-xl font-bold text-ink mb-2">Preload bridge not available</h1>
        <p className="text-sm text-ink-muted">
          <span className="font-mono text-accent">window.electronAPI</span> is undefined. This
          usually means the preload script failed to load or you are viewing the renderer outside
          of Electron. Check the main-process log for a <span className="font-mono">[preload]</span>
          error.
        </p>
      </div>
    </main>
  );
}

function ViewSwitch(): JSX.Element {
  const view = useApp((s) => s.view);
  const user = useApp((s) => s.user);

  const requiresAuth =
    view.kind === 'list' ||
    view.kind === 'solve' ||
    view.kind === 'create' ||
    view.kind === 'highscore' ||
    view.kind === 'stats' ||
    view.kind === 'settings';

  if (requiresAuth && !user) return <AuthPage />;

  switch (view.kind) {
    case 'start':
      return <StartPage />;
    case 'auth':
      return <AuthPage />;
    case 'list':
      return <PuzzleListPage />;
    case 'solve':
      return <SolvePage />;
    case 'create':
      return <CreatePage />;
    case 'highscore':
      return <HighscorePage />;
    case 'stats':
      return <StatsPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <StartPage />;
  }
}

export default function App(): JSX.Element {
  const view = useApp((s) => s.view);
  const setReducedMotion = useApp((s) => s.setReducedMotion);
  const setSoundsMuted = useApp((s) => s.setSoundsMuted);
  const setDefaultDifficulty = useApp((s) => s.setDefaultDifficulty);
  const setTheme = useApp((s) => s.setTheme);
  const [dbReady, setDbReady] = useState<{ ok: boolean; error?: string } | null>(null);
  const [splashDone, setSplashDone] = useState(false);
  const apiPresent = hasApi();

  useEffect(() => {
    if (!apiPresent) return;
    let mounted = true;
    const api = safeApi();
    if (!api) return;

    api.db.status().then((s) => {
      if (mounted) setDbReady(s);
    }).catch((err: unknown) => {
      if (mounted) {
        setDbReady({
          ok: false,
          error: err instanceof Error ? err.message : 'Could not query database status'
        });
      }
    });

    const off = api.db.onStatus((s) => {
      if (mounted) setDbReady(s);
    });

    return () => {
      mounted = false;
      off();
    };
  }, [apiPresent]);

  useEffect(() => {
    if (!apiPresent || !dbReady?.ok) return;
    const api = safeApi();
    if (!api) return;
    void Promise.all([
      api.settings.get({ key: 'reducedMotion' }),
      api.settings.get({ key: 'soundsMuted' }),
      api.settings.get({ key: 'defaultDifficulty' }),
      api.settings.get({ key: 'theme' })
    ])
      .then(([rm, sm, dd, th]) => {
        if (rm.value === '1') setReducedMotion(true);
        if (sm.value === '1') {
          setSoundsMuted(true);
          setSoundMuted(true);
        }
        if (dd.value) {
          const n = Number(dd.value);
          if (n === 1 || n === 2 || n === 3) setDefaultDifficulty(n as Difficulty);
        }
        if (th.value === 'light' || th.value === 'dark') setTheme(th.value);
      })
      .catch(() => { /* settings optional */ });
  }, [apiPresent, dbReady?.ok, setReducedMotion, setSoundsMuted, setDefaultDifficulty, setTheme]);

  const viewKey = (() => {
    if (view.kind === 'solve') return `solve-${view.puzzleId}`;
    if (view.kind === 'highscore') return `highscore-${view.puzzleId ?? 'all'}`;
    if (view.kind === 'auth') return 'auth';
    if (view.kind === 'stats') return 'stats';
    if (view.kind === 'settings') return 'settings';
    return view.kind;
  })();

  const body = (() => {
    if (!apiPresent) return <MissingApiScreen />;
    if (dbReady === null) {
      return (
        <div className="flex-1 flex items-center justify-center text-ink-muted text-sm">
          Opening local database…
        </div>
      );
    }
    if (!dbReady.ok) return <DbErrorScreen error={dbReady.error ?? 'Unknown error'} />;
    return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={viewKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex-1 flex flex-col min-h-0"
        >
          <ViewSwitch />
        </motion.div>
      </AnimatePresence>
    );
  })();

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-base text-ink overflow-hidden">
      <TitleBar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <ErrorBoundary>{body}</ErrorBoundary>
      </div>
      {apiPresent ? <CommandPalette /> : null}
      {apiPresent ? <ShortcutsOverlay /> : null}
      <HowToPlay />
      <Toaster />
      {!splashDone ? <SplashScreen onComplete={() => setSplashDone(true)} /> : null}
    </div>
  );
}

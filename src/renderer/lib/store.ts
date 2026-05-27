import { create } from 'zustand';
import type { Difficulty, User } from '@shared/types';

export type View =
  | { kind: 'start' }
  | { kind: 'auth'; mode: 'login' | 'register' }
  | { kind: 'list' }
  | { kind: 'solve'; puzzleId: number }
  | { kind: 'create' }
  | { kind: 'highscore'; puzzleId?: number }
  | { kind: 'stats' }
  | { kind: 'settings' };

export type Theme = 'dark' | 'light';

interface AppState {
  user: User | null;
  view: View;
  reducedMotion: boolean;
  soundsMuted: boolean;
  defaultDifficulty: Difficulty;
  paletteOpen: boolean;
  helpOpen: boolean;
  howToOpen: boolean;
  theme: Theme;
  setUser: (user: User | null) => void;
  setView: (view: View) => void;
  setReducedMotion: (v: boolean) => void;
  setSoundsMuted: (v: boolean) => void;
  setDefaultDifficulty: (d: Difficulty) => void;
  setPaletteOpen: (v: boolean) => void;
  setHelpOpen: (v: boolean) => void;
  setHowToOpen: (v: boolean) => void;
  setTheme: (t: Theme) => void;
}

function applyThemeToDocument(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('light', theme === 'light');
  root.classList.toggle('dark', theme === 'dark');
}

export const useApp = create<AppState>((set) => ({
  user: null,
  view: { kind: 'start' },
  reducedMotion: false,
  soundsMuted: false,
  defaultDifficulty: 2,
  paletteOpen: false,
  helpOpen: false,
  howToOpen: false,
  theme: 'dark',
  setUser: (user) => set({ user }),
  setView: (view) => set({ view }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setSoundsMuted: (soundsMuted) => set({ soundsMuted }),
  setDefaultDifficulty: (defaultDifficulty) => set({ defaultDifficulty }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setHowToOpen: (howToOpen) => set({ howToOpen }),
  setTheme: (theme) => {
    applyThemeToDocument(theme);
    set({ theme });
  }
}));

if (typeof document !== 'undefined') {
  applyThemeToDocument('dark');
}

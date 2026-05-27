import { create } from 'zustand';
import type { User } from '@shared/types';

export type View =
  | { kind: 'start' }
  | { kind: 'auth'; mode: 'login' | 'register' }
  | { kind: 'list' }
  | { kind: 'solve'; puzzleId: number }
  | { kind: 'create' }
  | { kind: 'highscore'; puzzleId?: number }
  | { kind: 'stats' };

interface AppState {
  user: User | null;
  view: View;
  reducedMotion: boolean;
  paletteOpen: boolean;
  helpOpen: boolean;
  setUser: (user: User | null) => void;
  setView: (view: View) => void;
  setReducedMotion: (v: boolean) => void;
  setPaletteOpen: (v: boolean) => void;
  setHelpOpen: (v: boolean) => void;
}

export const useApp = create<AppState>((set) => ({
  user: null,
  view: { kind: 'start' },
  reducedMotion: false,
  paletteOpen: false,
  helpOpen: false,
  setUser: (user) => set({ user }),
  setView: (view) => set({ view }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setHelpOpen: (helpOpen) => set({ helpOpen })
}));

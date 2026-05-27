import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Command } from 'cmdk';
import {
  BarChart3,
  Compass,
  Dices,
  HelpCircle,
  Lightbulb,
  ListChecks,
  LogOut,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { api } from '@/lib/ipc';
import { playSound, setSoundMuted } from '@/lib/sounds';
import { toast } from '@/components/ui/Toaster';

interface ItemSpec {
  id: string;
  label: string;
  icon: JSX.Element;
  shortcut?: string;
  onSelect: () => void;
  show?: boolean;
}

export function CommandPalette(): JSX.Element {
  const open = useApp((s) => s.paletteOpen);
  const setOpen = useApp((s) => s.setPaletteOpen);
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const setHelpOpen = useApp((s) => s.setHelpOpen);
  const user = useApp((s) => s.user);
  const setUser = useApp((s) => s.setUser);
  const soundsMuted = useApp((s) => s.soundsMuted);
  const setSoundsMuted = useApp((s) => s.setSoundsMuted);

  const toggleSounds = async (): Promise<void> => {
    const next = !soundsMuted;
    setSoundsMuted(next);
    setSoundMuted(next);
    try {
      await api().settings.set({ key: 'soundsMuted', value: next ? '1' : '0' });
    } catch {
      /* still applied in-memory */
    }
    toast.message(next ? 'Sound effects muted' : 'Sound effects on');
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) playSound.open();
  }, [open]);

  const close = (): void => setOpen(false);

  const inSolve = view.kind === 'solve';

  const items: ItemSpec[] = [
    {
      id: 'nav-list',
      label: 'Go to puzzles',
      icon: <ListChecks className="h-4 w-4" />,
      onSelect: () => { setView({ kind: 'list' }); close(); },
      show: !!user
    },
    {
      id: 'nav-create',
      label: 'New puzzle',
      icon: <Plus className="h-4 w-4" />,
      onSelect: () => { setView({ kind: 'create' }); close(); },
      show: !!user
    },
    {
      id: 'nav-highscore',
      label: 'Highscores',
      icon: <Trophy className="h-4 w-4" />,
      onSelect: () => { setView({ kind: 'highscore' }); close(); },
      show: !!user
    },
    {
      id: 'nav-stats',
      label: 'My stats',
      icon: <BarChart3 className="h-4 w-4" />,
      onSelect: () => { setView({ kind: 'stats' }); close(); },
      show: !!user
    },
    {
      id: 'nav-surprise',
      label: 'Surprise me — generate a puzzle',
      icon: <Dices className="h-4 w-4" />,
      onSelect: () => { window.dispatchEvent(new CustomEvent('surprise:me')); close(); },
      show: !!user
    },
    {
      id: 'nav-start',
      label: 'Home',
      icon: <Compass className="h-4 w-4" />,
      onSelect: () => { setView({ kind: 'start' }); close(); }
    },
    {
      id: 'nav-settings',
      label: 'Settings',
      icon: <SettingsIcon className="h-4 w-4" />,
      onSelect: () => { setView({ kind: 'settings' }); close(); },
      show: !!user
    },
    {
      id: 'toggle-sound',
      label: soundsMuted ? 'Unmute sound effects' : 'Toggle sound effects (mute)',
      icon: soundsMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />,
      onSelect: () => { void toggleSounds(); close(); }
    },
    {
      id: 'help',
      label: 'Keyboard shortcuts',
      icon: <HelpCircle className="h-4 w-4" />,
      shortcut: '?',
      onSelect: () => { setHelpOpen(true); close(); }
    },
    {
      id: 'solve-hint',
      label: 'Reveal a hint',
      icon: <Lightbulb className="h-4 w-4" />,
      shortcut: 'H',
      onSelect: () => { window.dispatchEvent(new CustomEvent('solve:hint')); close(); },
      show: inSolve
    },
    {
      id: 'solve-auto',
      label: 'Auto-solve current puzzle',
      icon: <Sparkles className="h-4 w-4" />,
      onSelect: () => { window.dispatchEvent(new CustomEvent('solve:auto')); close(); },
      show: inSolve
    },
    {
      id: 'logout',
      label: 'Log out',
      icon: <LogOut className="h-4 w-4" />,
      onSelect: async () => {
        await api().auth.logout();
        setUser(null);
        setView({ kind: 'start' });
        close();
      },
      show: !!user
    }
  ];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
          <motion.div
            initial={{ y: -8, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -8, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="relative z-10 w-full max-w-lg mx-4 surface shadow-elev overflow-hidden"
          >
            <Command label="Command palette" className="text-ink">
              <Command.Input
                placeholder="Type a command…"
                className="w-full h-12 bg-transparent px-4 text-sm outline-none border-b border-line/10 placeholder:text-ink-dim"
              />
              <Command.List className="max-h-80 overflow-y-auto p-1">
                <Command.Empty className="p-4 text-sm text-ink-muted">No matches.</Command.Empty>
                {items
                  .filter((i) => i.show !== false)
                  .map((item) => (
                    <Command.Item
                      key={item.id}
                      value={item.label}
                      onSelect={() => {
                        playSound.click();
                        item.onSelect();
                      }}
                      className="flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent/15 aria-selected:text-ink"
                    >
                      <span className="text-ink-muted">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {item.shortcut ? (
                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-elevated border border-line/10 text-ink-muted">
                          {item.shortcut}
                        </kbd>
                      ) : null}
                    </Command.Item>
                  ))}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

import { useState } from 'react';
import {
  ArrowLeft,
  Eraser,
  Gauge,
  Moon,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  Zap
} from 'lucide-react';
import { HomeBackdrop } from '@/components/animations/HomeBackdrop';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toaster';
import { useApp } from '@/lib/store';
import { api } from '@/lib/ipc';
import { setSoundMuted } from '@/lib/sounds';
import { difficultyLabel } from '@/lib/utils';
import type { Difficulty } from '@shared/types';

interface RowProps {
  icon: JSX.Element;
  title: string;
  description: string;
  accent: 'violet' | 'cyan' | 'pink' | 'amber';
  control: JSX.Element;
}

const ACCENTS: Record<RowProps['accent'], { bg: string; ring: string; text: string }> = {
  violet: { bg: 'bg-accent/10', ring: 'border-accent/30', text: 'text-accent' },
  cyan: { bg: 'bg-cyan-glow/10', ring: 'border-cyan-glow/30', text: 'text-cyan-glow' },
  pink: { bg: 'bg-magenta-glow/10', ring: 'border-magenta-glow/30', text: 'text-magenta-glow' },
  amber: { bg: 'bg-warning/10', ring: 'border-warning/30', text: 'text-warning' }
};

function SettingRow({ icon, title, description, accent, control }: RowProps): JSX.Element {
  const a = ACCENTS[accent];
  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${a.ring} bg-bg-panel/55 backdrop-blur-md p-5 flex items-center gap-5 transition-transform hover:-translate-y-0.5`}
    >
      <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full ${a.bg} blur-2xl`} />
      <div
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-lg ${a.bg} ${a.text} shrink-0`}
      >
        {icon}
      </div>
      <div className="relative flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-ink-muted leading-relaxed mt-0.5">{description}</p>
      </div>
      <div className="relative shrink-0">{control}</div>
    </div>
  );
}

interface ToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

function Toggle({ value, onChange, label }: ToggleProps): JSX.Element {
  return (
    <button
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className={`relative h-7 w-12 rounded-full transition-colors focus-ring ${
        value ? 'bg-accent shadow-glow' : 'bg-bg-elevated border border-line/10'
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-[left] duration-200 ease-out ${
          value ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export function SettingsPage(): JSX.Element {
  const user = useApp((s) => s.user);
  const setView = useApp((s) => s.setView);
  const reducedMotion = useApp((s) => s.reducedMotion);
  const setReducedMotion = useApp((s) => s.setReducedMotion);
  const soundsMuted = useApp((s) => s.soundsMuted);
  const setSoundsMutedStore = useApp((s) => s.setSoundsMuted);
  const defaultDifficulty = useApp((s) => s.defaultDifficulty);
  const setDefaultDifficulty = useApp((s) => s.setDefaultDifficulty);
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const persist = async (key: string, value: string): Promise<void> => {
    try {
      await api().settings.set({ key, value });
    } catch (err) {
      toast.error(`Could not save ${key}`);
      console.error(err);
    }
  };

  const onToggleSounds = async (next: boolean): Promise<void> => {
    setSoundsMutedStore(next);
    setSoundMuted(next);
    await persist('soundsMuted', next ? '1' : '0');
    toast.message(next ? 'Sound effects muted' : 'Sound effects on');
  };

  const onToggleMotion = async (next: boolean): Promise<void> => {
    setReducedMotion(next);
    await persist('reducedMotion', next ? '1' : '0');
    toast.message(next ? 'Reduced motion on' : 'Reduced motion off');
  };

  const onChangeDifficulty = async (d: Difficulty): Promise<void> => {
    setDefaultDifficulty(d);
    await persist('defaultDifficulty', String(d));
    toast.message(`Default difficulty set to ${difficultyLabel(d)}`);
  };

  const onChangeTheme = async (next: 'dark' | 'light'): Promise<void> => {
    setTheme(next);
    await persist('theme', next);
  };

  const onConfirmClear = async (): Promise<void> => {
    if (!user) return;
    setClearing(true);
    try {
      const res = await api().settings.clearProgress({ userId: user.id });
      if (res.success) {
        toast.success(
          res.cleared === 0
            ? 'No in-progress saves to clear'
            : `Cleared ${res.cleared} in-progress save${res.cleared === 1 ? '' : 's'}`
        );
      } else {
        toast.error('Could not clear in-progress saves');
      }
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

  return (
    <main className="relative flex-1 overflow-y-auto">
      <HomeBackdrop intensity={0.5} />
      <div className="relative z-10 px-10 py-10 max-w-3xl mx-auto">
        <button
          onClick={() => setView({ kind: 'list' })}
          className="text-xs text-ink-muted hover:text-ink inline-flex items-center gap-1 mb-3 focus-ring"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>

        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-glow mb-3 inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-glow shadow-glowCyan" />
            Preferences
          </p>
          <SettingsIcon className="h-12 w-12 text-accent mb-2 drop-shadow-[0_0_24px_rgba(244,167,44,0.4)]" />
          <h1 className="text-5xl md:text-6xl font-bold font-display tracking-tight leading-none">
            <span className="bg-hero-gradient bg-clip-text text-transparent">Settings</span>
          </h1>
          <p className="text-sm text-ink-muted mt-3">
            Tuned locally on this machine. Everything below lives in the{' '}
            <span className="font-mono text-accent">app_settings</span> table.
          </p>
        </div>

        <div className="space-y-3">
          <SettingRow
            icon={theme === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            title="Appearance"
            description="Dark mode keeps the ember feel; light mode flips surfaces and text for daytime focus."
            accent="cyan"
            control={
              <div className="flex items-center rounded-lg border border-line/10 bg-bg-surface p-0.5 gap-0.5">
                {(['dark', 'light'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => void onChangeTheme(t)}
                    className={`px-3 h-8 text-xs font-medium rounded-md transition-colors focus-ring inline-flex items-center gap-1.5 ${
                      theme === t
                        ? 'bg-accent text-accent-foreground shadow-glow'
                        : 'text-ink-muted hover:text-ink hover:bg-bg-elevated'
                    }`}
                  >
                    {t === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                    {t === 'dark' ? 'Dark' : 'Light'}
                  </button>
                ))}
              </div>
            }
          />

          <SettingRow
            icon={soundsMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            title="Sound effects"
            description="Place, hint, complete and forfeit tones. Mute here if you prefer pure focus mode."
            accent="violet"
            control={
              <Toggle
                label="Toggle sound effects"
                value={!soundsMuted}
                onChange={(v) => void onToggleSounds(!v)}
              />
            }
          />

          <SettingRow
            icon={<Zap className="h-5 w-5" />}
            title="Reduced motion"
            description="Soften decorative animations across the app. Respects accessibility preferences."
            accent="cyan"
            control={
              <Toggle
                label="Toggle reduced motion"
                value={reducedMotion}
                onChange={(v) => void onToggleMotion(v)}
              />
            }
          />

          <SettingRow
            icon={<Gauge className="h-5 w-5" />}
            title="Default difficulty"
            description="The level Surprise me generates when no filter is active."
            accent="amber"
            control={
              <div className="flex items-center rounded-lg border border-line/10 bg-bg-surface p-0.5 gap-0.5">
                {([1, 2, 3] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => void onChangeDifficulty(d)}
                    className={`px-3 h-8 text-xs font-medium rounded-md transition-colors focus-ring ${
                      defaultDifficulty === d
                        ? 'bg-accent text-accent-foreground shadow-glow'
                        : 'text-ink-muted hover:text-ink hover:bg-bg-elevated'
                    }`}
                  >
                    {difficultyLabel(d)}
                  </button>
                ))}
              </div>
            }
          />

          <SettingRow
            icon={<Eraser className="h-5 w-5" />}
            title="In-progress saves"
            description="Every puzzle you pause is saved so you can resume. Wipe them all in one click."
            accent="pink"
            control={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmClear(true)}
                disabled={clearing}
              >
                <Eraser className="h-4 w-4" />
                {clearing ? 'Clearing…' : 'Clear saves'}
              </Button>
            }
          />

          <div className="rounded-xl border border-line/60 bg-bg-panel/40 backdrop-blur-md p-5 mt-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-ink-muted shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-ink mb-1">
                  These settings are persisted per-machine
                </p>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Reads on every launch via{' '}
                  <span className="font-mono text-accent">settings:get</span> and saved instantly via{' '}
                  <span className="font-mono text-accent">settings:set</span>. The{' '}
                  <span className="font-mono text-cyan-glow">app_settings</span> table also stores
                  your window bounds, puzzle list preferences, and in-progress saves.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear all in-progress saves?"
        dismissible={false}
      >
        <p className="text-sm text-ink-muted mb-2">
          Every paused puzzle for{' '}
          <span className="text-ink font-medium">{user?.username}</span> will be removed. Saved
          highscores are unaffected.
        </p>
        <p className="text-sm text-ink-muted mb-6">
          <span className="text-danger font-medium">This cannot be undone.</span>
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmClear(false)} disabled={clearing}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void onConfirmClear()} disabled={clearing}>
            <Eraser className="h-4 w-4" />
            {clearing ? 'Clearing…' : 'Clear saves'}
          </Button>
        </div>
      </Modal>
    </main>
  );
}

import { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { Modal } from '@/components/ui/Modal';

interface Row {
  keys: string[];
  label: string;
}

const ROWS: Row[] = [
  { keys: ['↑', '↓', '←', '→'], label: 'Move selection' },
  { keys: ['1 – 9'], label: 'Enter a digit' },
  { keys: ['Backspace', '0'], label: 'Clear cell' },
  { keys: ['N'], label: 'Toggle notes mode' },
  { keys: ['H'], label: 'Reveal hint' },
  { keys: ['Ctrl + Z'], label: 'Undo' },
  { keys: ['Ctrl + Y'], label: 'Redo' },
  { keys: ['Ctrl + K'], label: 'Command palette' },
  { keys: ['?'], label: 'Show this overlay' }
];

export function ShortcutsOverlay(): JSX.Element {
  const open = useApp((s) => s.helpOpen);
  const setOpen = useApp((s) => s.setHelpOpen);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === '?' && (e.target as HTMLElement | null)?.tagName !== 'INPUT') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts" className="max-w-lg">
      <div className="grid grid-cols-1 gap-2">
        {ROWS.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-2 border-b border-line/10 last:border-b-0">
            <span className="text-sm text-ink">{r.label}</span>
            <div className="flex items-center gap-1">
              {r.keys.map((k) => (
                <kbd
                  key={k}
                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-bg-elevated border border-line/10 text-ink-muted"
                >
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

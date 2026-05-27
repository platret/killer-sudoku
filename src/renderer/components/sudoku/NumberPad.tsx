import { Eraser, PencilLine } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Props {
  notesMode: boolean;
  onToggleNotes: () => void;
  onDigit: (n: number) => void;
  onErase: () => void;
}

export function NumberPad({ notesMode, onToggleNotes, onDigit, onErase }: Props): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => {
          const n = i + 1;
          return (
            <motion.button
              key={n}
              whileTap={{ scale: 0.92 }}
              whileHover={{ y: -1 }}
              onClick={() => onDigit(n)}
              className={cn(
                'h-12 w-12 rounded-md border border-line/10 bg-bg-surface text-ink font-semibold text-lg',
                'hover:border-strong hover:bg-bg-elevated transition-colors focus-ring tabular-num',
                notesMode ? 'text-ink-muted' : ''
              )}
              aria-label={`Enter ${n}`}
            >
              {n}
            </motion.button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant={notesMode ? 'primary' : 'secondary'} size="sm" onClick={onToggleNotes}>
          <PencilLine className="h-4 w-4" />
          Notes
        </Button>
        <Button variant="secondary" size="sm" onClick={onErase}>
          <Eraser className="h-4 w-4" />
          Erase
        </Button>
      </div>
    </div>
  );
}

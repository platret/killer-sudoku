import { BookOpen, Calculator, Grid3x3, Hash, Lightbulb } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/lib/store';

interface RuleProps {
  icon: JSX.Element;
  title: string;
  body: JSX.Element | string;
}

function Rule({ icon, title, body }: RuleProps): JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink mb-1">{title}</p>
        <p className="text-xs text-ink-muted leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

export function HowToPlay(): JSX.Element {
  const open = useApp((s) => s.howToOpen);
  const setHowToOpen = useApp((s) => s.setHowToOpen);
  return (
    <Modal
      open={open}
      onClose={() => setHowToOpen(false)}
      title="How to play Killer Sudoku"
      className="max-w-xl"
    >
      <div className="space-y-5">
        <p className="text-sm text-ink-muted leading-relaxed">
          Killer Sudoku is classic Sudoku with one extra twist: cages. Same digit rules apply,
          plus every cage of dashed cells must sum to its target number.
        </p>

        <div className="space-y-4">
          <Rule
            icon={<Grid3x3 className="h-5 w-5" />}
            title="The grid"
            body="Fill the 9×9 board with digits 1–9. Each row, each column, and each 3×3 box must contain every digit exactly once — same as standard Sudoku."
          />
          <Rule
            icon={<Hash className="h-5 w-5" />}
            title="The cages"
            body={
              <>
                Cells with the same dashed outline form a <span className="text-accent font-medium">cage</span>.
                The small number in the top-left of each cage is its target sum. The digits you place
                in a cage must add up to exactly that number.
              </>
            }
          />
          <Rule
            icon={<Calculator className="h-5 w-5" />}
            title="No repeats inside a cage"
            body="A cage cannot contain the same digit twice, even if its cells fall in different rows or columns. So a 3-cell cage summing to 7 could be {1,2,4} but never {1,3,3}."
          />
          <Rule
            icon={<Lightbulb className="h-5 w-5" />}
            title="How to start"
            body={
              <>
                Look for small cages first — a 2-cell cage summing to 3 must be {'{1, 2}'}.
                A 2-cell cage summing to 17 must be {'{8, 9}'}. These &ldquo;forced&rdquo; pairs
                anchor everything else. From there, use standard Sudoku scanning to eliminate
                candidates row by row, column by column, box by box.
              </>
            }
          />
          <Rule
            icon={<BookOpen className="h-5 w-5" />}
            title="Difficulty"
            body={
              <>
                <span className="text-success font-medium">Easy</span> puzzles ship with around
                half the cells pre-filled (givens). <span className="text-warning font-medium">Medium</span>{' '}
                gives you a handful. <span className="text-danger font-medium">Hard</span> gives you nothing —
                just the cages. The grader still guarantees a unique solution.
              </>
            }
          />
        </div>

        <div className="rounded-lg border border-line/40 bg-bg-surface/60 p-3 text-[11px] text-ink-muted leading-relaxed">
          <span className="font-semibold text-ink">Tip:</span> use{' '}
          <span className="font-mono text-accent">N</span> to toggle notes mode and pencil in candidates.{' '}
          <span className="font-mono text-accent">H</span> takes a hint (costs you score). Arrow keys move,
          <span className="font-mono text-accent"> 1–9</span> places, and{' '}
          <span className="font-mono text-accent">Backspace</span> clears.
        </div>
      </div>
    </Modal>
  );
}

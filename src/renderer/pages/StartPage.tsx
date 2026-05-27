import { motion } from 'motion/react';
import { ArrowRight, Grid3x3, Hash, Lightbulb, ShieldCheck } from 'lucide-react';
import { ShaderBackground } from '@/components/animations/ShaderBackground';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/lib/store';

const RULES: { icon: JSX.Element; title: string; body: string }[] = [
  {
    icon: <Grid3x3 className="h-5 w-5" />,
    title: 'Standard Sudoku rules',
    body: 'Each row, column, and 3×3 box contains the digits 1–9 with no repeats.'
  },
  {
    icon: <Hash className="h-5 w-5" />,
    title: 'Cages and sums',
    body: 'Dashed regions are cages. Digits inside a cage must sum to the small number, with no repeats.'
  },
  {
    icon: <Lightbulb className="h-5 w-5" />,
    title: 'Hints, notes, undo',
    body: 'Reveal a hint at the cost of points, write pencil-mark candidates, and undo any move.'
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: 'Unique by construction',
    body: 'Every published puzzle has exactly one solution — verified by the solver before saving.'
  }
];

export function StartPage(): JSX.Element {
  const setView = useApp((s) => s.setView);

  return (
    <div className="relative flex-1 overflow-y-auto">
      <ShaderBackground />
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 max-w-4xl mx-auto px-10 pt-24 pb-20 text-center"
      >
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.6, ease: 'easeOut' }}
          className="text-7xl md:text-8xl font-bold font-display tracking-tight leading-[0.95] mb-6"
        >
          <span className="bg-hero-gradient bg-clip-text text-transparent drop-shadow-[0_0_36px_rgba(244,167,44,0.4)]">
            Killer
          </span>
          <span className="text-ink">Sudoku</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.55 }}
          className="text-ink-muted max-w-xl mx-auto text-base md:text-lg leading-relaxed mb-9"
        >
          A bold, dark, keyboard-first Killer Sudoku for desktop. Solve hand-crafted puzzles or
          design your own — the engine guarantees a unique solution before anything is published.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-3 mb-16"
        >
          <Button
            size="lg"
            onClick={() => setView({ kind: 'auth', mode: 'login' })}
            className="shadow-glow"
          >
            Start playing <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setView({ kind: 'auth', mode: 'register' })}
          >
            Create an account
          </Button>
        </motion.div>

        <motion.ul
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.07, delayChildren: 0.36 } }
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left"
        >
          {RULES.map((r, i) => (
            <motion.li
              key={r.title}
              variants={{
                hidden: { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              className="relative group p-5 rounded-xl border border-line/70 bg-bg-panel/55 backdrop-blur-md overflow-hidden"
            >
              <div className="absolute inset-0 bg-card-sheen opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative flex gap-4">
                <div
                  className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${
                    i % 3 === 0
                      ? 'bg-accent/15 text-accent'
                      : i % 3 === 1
                        ? 'bg-cyan-glow/15 text-cyan-glow'
                        : 'bg-magenta-glow/15 text-magenta-glow'
                  }`}
                >
                  {r.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink mb-1">{r.title}</p>
                  <p className="text-sm text-ink-muted leading-relaxed">{r.body}</p>
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </motion.section>
    </div>
  );
}

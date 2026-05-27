import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface Props {
  onComplete: () => void;
  durationMs?: number;
}

const GRID_SIZE = 240;
const CELLS = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9);
  const c = i % 9;
  const dist = Math.max(Math.abs(r - 4), Math.abs(c - 4));
  return { i, r, c, dist };
});

export function SplashScreen({ onComplete, durationMs = 1750 }: Props): JSX.Element {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fadeOutAt = setTimeout(() => setVisible(false), durationMs - 380);
    const done = setTimeout(() => onComplete(), durationMs);
    return () => {
      clearTimeout(fadeOutAt);
      clearTimeout(done);
    };
  }, [durationMs, onComplete]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.06, filter: 'blur(10px)' }}
          transition={{ duration: 0.38, ease: 'easeIn' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ background: '#0a0612' }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(60% 70% at 50% 50%, rgba(168,85,247,0.22) 0%, transparent 60%), radial-gradient(50% 60% at 30% 80%, rgba(6,182,212,0.16) 0%, transparent 60%), radial-gradient(50% 60% at 75% 20%, rgba(236,72,153,0.16) 0%, transparent 60%)'
            }}
          />

          <div className="relative flex flex-col items-center">
            <div
              className="absolute -inset-12 rounded-full blur-3xl pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle, rgba(168,85,247,0.32) 0%, transparent 70%)'
              }}
              aria-hidden
            />

            <motion.div
              initial={{ scale: 0.85, rotate: -4 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 0.84, 0.44, 1] }}
              className="relative"
              style={{ width: GRID_SIZE, height: GRID_SIZE }}
            >
              <div
                className="grid h-full w-full"
                style={{
                  gridTemplateColumns: 'repeat(9, 1fr)',
                  gridTemplateRows: 'repeat(9, 1fr)',
                  gap: 3
                }}
              >
                {CELLS.map(({ i, r, c, dist }) => {
                  const isCenter = i === 40;
                  const major = r % 3 === 0 && c % 3 === 0;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{
                        opacity: 1,
                        scale: isCenter ? [0.4, 1.25, 1] : 1
                      }}
                      transition={{
                        delay: 0.05 + dist * 0.055,
                        duration: isCenter ? 0.55 : 0.32,
                        ease: 'easeOut',
                        scale: isCenter
                          ? { duration: 0.7, times: [0, 0.5, 1] }
                          : undefined
                      }}
                      className="rounded-[3px]"
                      style={{
                        background: isCenter
                          ? '#a855f7'
                          : major
                            ? 'rgba(168,85,247,0.18)'
                            : `rgba(58, 52, 88, ${0.35 + (4 - dist) * 0.08})`,
                        boxShadow: isCenter
                          ? '0 0 22px rgba(168,85,247,0.85), 0 0 6px rgba(168,85,247,0.6)'
                          : 'none'
                      }}
                    />
                  );
                })}
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16, letterSpacing: '0.6em' }}
              animate={{ opacity: 1, y: 0, letterSpacing: '0.18em' }}
              transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 0.84, 0.44, 1] }}
              className="mt-12 text-2xl md:text-3xl font-bold uppercase tabular-nums whitespace-nowrap"
            >
              <span className="bg-hero-gradient bg-clip-text text-transparent">Killer</span>
              <span className="text-ink ml-2">Sudoku</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.9, duration: 0.55, ease: 'easeOut' }}
              className="mt-4 h-px w-32 bg-accent/40 origin-center"
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.05, duration: 0.5 }}
              className="mt-3 text-[10px] tracking-[0.32em] text-ink-muted uppercase"
            >
              Loading
            </motion.p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

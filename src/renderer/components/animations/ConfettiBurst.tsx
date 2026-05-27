import { useMemo } from 'react';
import { motion } from 'motion/react';

interface Particle {
  id: number;
  hx: number;
  hy: number;
  rot: number;
  scale: number;
  delay: number;
  color: string;
  shape: 'square' | 'rect' | 'circle';
}

const PALETTE = ['#f4a72c', '#ffb845', '#7a3e12', '#b5651d', '#4cae6a', '#e5484d'];

interface Props {
  count?: number;
  durationSec?: number;
  spread?: number;
  className?: string;
}

export function ConfettiBurst({
  count = 56,
  durationSec = 1.7,
  spread = 360,
  className
}: Props): JSX.Element {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const radius = spread * (0.55 + Math.random() * 0.45);
      return {
        id: i,
        hx: Math.cos(angle) * radius,
        hy: Math.sin(angle) * radius - 80,
        rot: (Math.random() - 0.5) * 720,
        scale: 0.6 + Math.random() * 0.9,
        delay: Math.random() * 0.18,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        shape: (['square', 'rect', 'circle'] as const)[Math.floor(Math.random() * 3)]
      };
    });
  }, [count, spread]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ''}`}
      aria-hidden
    >
      <div className="absolute left-1/2 top-1/2">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0.2 }}
            animate={{
              x: p.hx,
              y: [0, p.hy * 0.4, p.hy + 80],
              rotate: p.rot,
              opacity: [0, 1, 1, 0],
              scale: [0.2, p.scale, p.scale * 0.9]
            }}
            transition={{
              duration: durationSec,
              delay: p.delay,
              times: [0, 0.15, 0.7, 1],
              ease: [0.16, 0.84, 0.44, 1]
            }}
            className="absolute"
            style={{
              left: -4,
              top: -4,
              width: p.shape === 'rect' ? 10 : 8,
              height: p.shape === 'rect' ? 4 : 8,
              borderRadius: p.shape === 'circle' ? 999 : 2,
              background: p.color,
              boxShadow: `0 0 8px ${p.color}80`
            }}
          />
        ))}
      </div>
    </div>
  );
}

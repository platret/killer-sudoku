import { useEffect } from 'react';
import { animate, useMotionValue, useTransform, motion } from 'motion/react';

interface Props {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}

export function AnimatedNumber({ value, duration = 0.6, className, format }: Props): JSX.Element {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (latest) => {
    const n = Math.round(latest);
    return format ? format(n) : String(n);
  });

  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: 'easeOut'
    });
    return controls.stop;
  }, [value, duration, mv]);

  return <motion.span className={className}>{rounded}</motion.span>;
}

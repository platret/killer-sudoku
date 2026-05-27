import { useEffect, useState } from 'react';
import { Timer as TimerIcon } from 'lucide-react';
import { AnimatedNumber } from '../animations/AnimatedNumber';
import { formatTime } from '@/lib/utils';

interface Props {
  startedAt: number | null;
  paused?: boolean;
  finalSeconds?: number | null;
}

export function Timer({ startedAt, paused, finalSeconds }: Props): JSX.Element {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (paused || startedAt === null || finalSeconds !== null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [paused, startedAt, finalSeconds]);

  const seconds = finalSeconds ?? (startedAt === null ? 0 : Math.floor((now - startedAt) / 1000));

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-line/10 bg-bg-surface tabular-num">
      <TimerIcon className="h-4 w-4 text-ink-muted" />
      <AnimatedNumber value={seconds} format={formatTime} className="text-sm font-mono text-ink" />
    </div>
  );
}

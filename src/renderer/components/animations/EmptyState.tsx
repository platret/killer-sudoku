import { motion } from 'motion/react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: Props): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <motion.div
        className="relative h-16 w-16 mb-4"
        initial={{ scale: 0.8 }}
        animate={{ scale: [0.95, 1.02, 0.95] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 rounded-full bg-accent/10 blur-xl" />
        <div className="relative h-full w-full flex items-center justify-center text-accent">
          {icon ?? <Inbox className="h-8 w-8" />}
        </div>
      </motion.div>
      <h3 className="text-base font-semibold text-ink mb-1">{title}</h3>
      {description ? (
        <p className="text-sm text-ink-muted max-w-sm mb-4">{description}</p>
      ) : null}
      {action}
    </motion.div>
  );
}

import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  /**
   * When `false`, clicking the backdrop and pressing Escape do NOT close the modal.
   * Use for destructive confirmations and completion screens where accidental
   * dismiss would lose work.
   */
  dismissible?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  dismissible = true
}: ModalProps): JSX.Element {
  useEffect(() => {
    if (!open || !dismissible) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, dismissible]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={dismissible ? onClose : undefined}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            initial={{ scale: 0.94, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={cn(
              'relative z-10 w-full max-w-md surface shadow-elev p-6 mx-4',
              className
            )}
          >
            {title ? (
              <h2 className="text-lg font-semibold mb-4 text-ink">{title}</h2>
            ) : null}
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

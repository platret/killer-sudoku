import { forwardRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { playSound } from '@/lib/sounds';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
  silent?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-foreground hover:bg-accent-hover',
  secondary: 'bg-bg-surface text-ink hover:bg-bg-elevated border border-line',
  ghost: 'bg-transparent text-ink hover:bg-bg-surface',
  danger: 'bg-danger text-white hover:bg-red-500',
  outline: 'bg-transparent text-ink border border-line hover:border-strong'
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-9 w-9'
};

const MotionButton = motion.button;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', children, disabled, silent, onClick, ...rest },
  ref
) {
  const wrappedOnClick = (e: MouseEvent<HTMLButtonElement>): void => {
    if (!disabled && !silent) playSound.click();
    onClick?.(e);
  };

  return (
    <MotionButton
      ref={ref}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      whileHover={disabled ? undefined : { y: -1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors focus-ring select-none',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      onClick={wrappedOnClick}
      {...(rest as React.ComponentProps<typeof MotionButton>)}
    >
      {children}
    </MotionButton>
  );
});

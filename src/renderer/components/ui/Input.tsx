import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border bg-bg-surface px-3 text-sm text-ink placeholder:text-ink-dim',
        'transition-colors focus-ring',
        invalid ? 'border-danger' : 'border-line hover:border-strong focus:border-accent',
        className
      )}
      {...props}
    />
  );
});

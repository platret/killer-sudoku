import { type SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-10 rounded-md border border-line/10 bg-bg-surface px-3 text-sm text-ink',
        'focus-ring hover:border-strong transition-colors',
        className
      )}
      {...props}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
});

import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-2xl border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 text-sm text-[var(--foreground)] shadow-[0_2px_12px_rgba(24,24,27,0.05)] outline-none transition focus:border-[color:var(--line-strong)] focus:ring-4 focus:ring-[rgba(24,24,27,0.06)] placeholder:text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
});

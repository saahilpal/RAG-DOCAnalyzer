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
        'h-10 w-full rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[color:var(--line-strong)] focus:ring-2 focus:ring-[rgba(24,24,27,0.08)] placeholder:text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
});

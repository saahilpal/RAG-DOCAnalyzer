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
        'h-11 w-full rounded-xl border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 text-sm text-[var(--foreground)] outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-[color:var(--line-strong)] focus:bg-white focus:ring-2 focus:ring-[rgba(24,24,27,0.08)] placeholder:text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
});

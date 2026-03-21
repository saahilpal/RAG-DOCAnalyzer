'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background-strong)] hover:bg-[#0f0f0f]',
  secondary:
    'border border-[color:var(--line)] bg-[var(--panel-strong)] text-[var(--foreground)] hover:bg-[var(--panel-muted)]',
  ghost: 'border border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--foreground)]',
  danger: 'border border-[#991b1b] bg-[#991b1b] text-white hover:bg-[#7f1d1d]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-10 px-4 text-sm',
  icon: 'h-9 w-9 p-0',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium outline-none transition-[background-color,border-color,color,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-[rgba(24,24,27,0.18)] active:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

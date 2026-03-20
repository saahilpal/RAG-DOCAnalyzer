'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background-strong)] hover:-translate-y-0.5 hover:bg-[#0f0d0b] hover:shadow-[0_14px_28px_rgba(23,20,17,0.18)]',
  secondary:
    'border border-[color:var(--line)] bg-[rgba(255,252,247,0.78)] text-[var(--foreground)] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_20px_rgba(23,20,17,0.08)]',
  ghost: 'border border-transparent bg-transparent text-[var(--muted)] hover:bg-[rgba(24,19,13,0.05)] hover:text-[var(--foreground)]',
  danger: 'border border-[#8f2d12] bg-[#8f2d12] text-white hover:-translate-y-0.5 hover:bg-[#7c240d]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
  icon: 'h-10 w-10 p-0',
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
        'inline-flex items-center justify-center gap-2 rounded-2xl font-medium outline-none transition-[transform,background-color,border-color,color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-[rgba(23,20,17,0.18)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
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

import { cn } from '@/lib/cn';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(16,16,16,0.04),0_8px_24px_rgba(16,16,16,0.05)]',
        className,
      )}
      {...props}
    />
  );
}

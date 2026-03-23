import { cn } from '@/lib/cn';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[color:var(--line)] bg-[var(--panel-strong)] shadow-[var(--shadow-panel)]',
        className,
      )}
      {...props}
    />
  );
}

import { cn } from '@/lib/cn';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)]',
        className,
      )}
      {...props}
    />
  );
}

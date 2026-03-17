import { cn } from '@/lib/cn';

type BadgeTone = 'default' | 'muted' | 'danger';

const toneClasses: Record<BadgeTone, string> = {
  default: 'bg-neutral-900 text-white border-neutral-900',
  muted: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  danger: 'bg-neutral-900 text-white border-neutral-900',
};

export function Badge({
  children,
  tone = 'muted',
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

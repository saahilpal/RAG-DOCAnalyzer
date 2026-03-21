'use client';

export function TypingIndicator({ label = 'Thinking' }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 text-xs text-[var(--muted)]">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--foreground)]"
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </span>
    </div>
  );
}

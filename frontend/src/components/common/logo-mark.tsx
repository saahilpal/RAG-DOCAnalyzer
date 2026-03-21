import { FileText } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export function LogoMark({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-3', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--line)] bg-[var(--foreground)] text-[var(--background-strong)]">
        <FileText size={16} />
      </span>
      <span className="font-display text-sm font-semibold tracking-tight text-[var(--foreground)]">Document Analyzer</span>
    </Link>
  );
}

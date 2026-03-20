import { FileText } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export function LogoMark({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-3', className)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.18)] bg-[linear-gradient(135deg,#09090b_0%,#18181b_55%,#27272a_160%)] text-white shadow-[0_10px_30px_rgba(24,24,27,0.16)]">
        <FileText size={16} />
      </span>
      <span className="font-display text-sm font-semibold tracking-tight text-[var(--foreground)]">Document Analyzer</span>
    </Link>
  );
}

import { FileText } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export function LogoMark({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-3', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-900 bg-neutral-900 text-white">
        <FileText size={16} />
      </span>
      <span className="text-sm font-semibold tracking-tight text-neutral-900">Document Analyzer</span>
    </Link>
  );
}

'use client';

import { FileText, Loader2, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { AttachmentChip as AttachmentChipRecord } from '@/hooks/use-chat-workspace';

type AttachmentChipProps = {
  attachment: AttachmentChipRecord;
  onRemove: (documentId: string) => void;
};

function statusLabel(attachment: AttachmentChipRecord) {
  if (attachment.status === 'uploading') {
    return attachment.progress != null ? `Uploading ${attachment.progress}%` : 'Uploading';
  }

  if (attachment.status === 'processing') {
    return 'Processing';
  }

  if (attachment.status === 'failed') {
    return attachment.last_error || 'Failed';
  }

  return 'Ready';
}

export function AttachmentChip({ attachment, onRemove }: AttachmentChipProps) {
  const loading = attachment.status === 'uploading' || attachment.status === 'processing';
  const failed = attachment.status === 'failed';

  return (
    <div
      className={cn(
        'inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-[0_8px_20px_rgba(18,14,10,0.05)]',
        failed
          ? 'border-[rgba(143,45,18,0.16)] bg-[rgba(143,45,18,0.07)] text-[#7d2a12]'
          : 'border-[color:var(--line)] bg-[rgba(255,252,247,0.92)] text-[var(--foreground)]',
      )}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin text-neutral-500" />
      ) : failed ? (
        <TriangleAlert size={14} className="text-neutral-500" />
      ) : (
        <FileText size={14} className="text-neutral-500" />
      )}

      <div className="flex min-w-0 flex-col leading-tight">
        <span className="max-w-40 truncate">{attachment.file_name}</span>
        <span className={cn('max-w-44 truncate text-[11px]', failed ? 'text-[#8f2d12]/70' : 'text-[var(--muted)]')}>
          {statusLabel(attachment)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        className="rounded-full p-0.5 text-[var(--muted)] transition hover:bg-[rgba(23,20,17,0.06)] hover:text-[var(--foreground)]"
        aria-label={`Remove ${attachment.file_name}`}
      >
        <X size={12} />
      </button>
    </div>
  );
}

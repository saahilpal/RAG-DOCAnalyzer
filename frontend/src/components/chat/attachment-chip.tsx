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
        'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium',
        failed ? 'border-neutral-300 bg-white text-neutral-700' : 'border-neutral-200 bg-neutral-50 text-neutral-700',
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
        <span className="max-w-40 truncate text-neutral-900">{attachment.file_name}</span>
        <span className="max-w-44 truncate text-[11px] text-neutral-500">{statusLabel(attachment)}</span>
      </div>

      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        className="rounded-full p-0.5 text-neutral-400 transition hover:bg-neutral-200 hover:text-neutral-700"
        aria-label={`Remove ${attachment.file_name}`}
      >
        <X size={12} />
      </button>
    </div>
  );
}

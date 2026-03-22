'use client';

import { memo } from 'react';
import { FileText, Loader2, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import type { AttachmentChip as AttachmentChipRecord } from '@/hooks/use-chat-workspace';

type DocumentBubbleProps = {
  attachment: AttachmentChipRecord;
  onRemove: (documentId: string) => void;
};

function getStatusLabel(attachment: AttachmentChipRecord) {
  if (attachment.status === 'uploading') {
    return attachment.progress != null ? `Uploading ${attachment.progress}%` : 'Uploading';
  }

  if (attachment.status === 'processing') {
    return 'Processing';
  }

  if (attachment.status === 'failed') {
    return attachment.last_error || 'Processing failed';
  }

  return 'Ready';
}

function DocumentBubbleComponent({ attachment, onRemove }: DocumentBubbleProps) {
  const loading = attachment.status === 'uploading' || attachment.status === 'processing';
  const failed = attachment.status === 'failed';
  const timestamp = attachment.attached_at || attachment.created_at;
  const progress = attachment.progress != null ? Math.max(0, Math.min(100, attachment.progress)) : null;

  return (
    <article className="flex w-full justify-center py-1.5">
      <div className="flex w-full max-w-[720px] justify-end">
        <div
          className={cn(
            'w-full max-w-[92%] rounded-[24px] px-4 py-3 shadow-[var(--shadow-panel)] sm:max-w-[80%]',
            failed
              ? 'border border-[rgba(153,27,27,0.2)] bg-[rgba(153,27,27,0.08)] text-[#7f1d1d]'
              : 'bg-[var(--foreground)] text-[var(--background-strong)]',
          )}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : failed ? (
                <TriangleAlert size={16} />
              ) : (
                <FileText size={16} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium leading-6', failed ? 'text-[#7f1d1d]' : 'text-inherit')}>
                {attachment.file_name}
              </p>
              <p
                className={cn(
                  'text-xs leading-5',
                  failed ? 'text-[#7f1d1d]/80' : 'text-[var(--background-strong)]/70',
                )}
              >
                {getStatusLabel(attachment)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onRemove(attachment.id)}
              className={cn(
                'rounded-full p-1 transition',
                failed
                  ? 'text-[#7f1d1d]/70 hover:bg-[rgba(127,29,29,0.08)] hover:text-[#7f1d1d]'
                  : 'text-[var(--background-strong)]/70 hover:bg-white/10 hover:text-[var(--background-strong)]',
              )}
              aria-label={`Remove ${attachment.file_name}`}
            >
              <X size={12} />
            </button>
          </div>

          {loading && progress != null ? (
            <div className="mt-3 overflow-hidden rounded-full bg-white/12">
              <div
                className="h-1.5 rounded-full bg-white/70 transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}

          {timestamp ? (
            <div className="mt-2 flex justify-end">
              <p className={cn('text-[11px]', failed ? 'text-[#7f1d1d]/70' : 'text-[var(--background-strong)]/55')}>
                {formatTime(timestamp)}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export const DocumentBubble = memo(DocumentBubbleComponent);

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Loader2, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import type { AttachmentChip as AttachmentChipRecord } from '@/hooks/use-chat-workspace';
import { transitions } from '@/lib/motion';

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
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.dropdown}
      className="flex w-full justify-center py-0.5"
    >
      <div className="flex w-full max-w-[720px] justify-end">
        <div
          className={cn(
            'w-full max-w-[90%] rounded-[18px] px-3 py-2.5 sm:max-w-[78%]',
            failed
              ? 'border border-[rgba(153,27,27,0.12)] bg-[rgba(153,27,27,0.06)] text-[#7f1d1d]'
              : 'bg-[rgba(24,24,27,0.92)] text-[var(--background-strong)]',
          )}
        >
          <div className="flex items-start gap-2.5">
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
              <p className={cn('text-sm font-medium leading-5', failed ? 'text-[#7f1d1d]' : 'text-inherit')}>
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
                'rounded-full p-1 transition-colors duration-200',
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
            <div className="mt-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-1 rounded-full bg-white/65 transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}

          {timestamp ? (
            <div className="mt-1.5 flex justify-end">
              <p className={cn('text-[11px]', failed ? 'text-[#7f1d1d]/70' : 'text-[var(--background-strong)]/55')}>
                {formatTime(timestamp)}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}

export const DocumentBubble = memo(DocumentBubbleComponent);

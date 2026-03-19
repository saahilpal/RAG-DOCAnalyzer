'use client';

import { useRef } from 'react';
import { Loader2, Paperclip, SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { AttachmentChip } from '@/components/chat/attachment-chip';
import type { AttachmentChip as AttachmentChipRecord } from '@/hooks/use-chat-workspace';

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAttach: (file: File) => Promise<void>;
  onRemoveAttachment: (documentId: string) => Promise<void>;
  attachments: AttachmentChipRecord[];
  disabled?: boolean;
  loading?: boolean;
  maxLength?: number;
  maxAttachments?: number;
};

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  onAttach,
  onRemoveAttachment,
  attachments,
  disabled,
  loading,
  maxLength = 4000,
  maxAttachments = 3,
}: ChatComposerProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const countedAttachments = attachments.filter(
    (attachment) => !(attachment.isTemp && attachment.status === 'failed'),
  ).length;

  return (
    <form
      ref={formRef}
      className="rounded-[28px] border border-neutral-200 bg-white px-4 py-3 shadow-[0_10px_30px_rgba(16,16,16,0.06)]"
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim() || disabled || loading) {
          return;
        }

        onSubmit();
      }}
    >
      {attachments.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <AttachmentChip
              key={attachment.id}
              attachment={attachment}
              onRemove={(documentId) => {
                void onRemoveAttachment(documentId);
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || loading || countedAttachments >= maxAttachments}
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 rounded-full text-neutral-500 hover:text-neutral-900"
        >
          <Paperclip size={18} />
        </Button>

        <textarea
          rows={1}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          onChange={(event) => {
            onChange(event.target.value.slice(0, maxLength));
            event.target.style.height = 'auto';
            event.target.style.height = `${event.target.scrollHeight}px`;
          }}
          placeholder="Ask anything, or attach a PDF for grounded answers"
          className={cn(
            'max-h-48 min-h-[44px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-neutral-900 outline-none placeholder:text-neutral-400',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        />

        <Button
          type="submit"
          size="icon"
          disabled={disabled || loading || !value.trim()}
          className="h-11 w-11 shrink-0 rounded-full"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={16} />}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="application/pdf"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) {
            await onAttach(file);
          }
          event.target.value = '';
        }}
      />
    </form>
  );
}

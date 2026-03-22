'use client';

import { useEffect, useRef } from 'react';
import { Loader2, Paperclip, SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { AttachmentChip as AttachmentChipRecord } from '@/hooks/use-chat-workspace';

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAttach: (file: File) => Promise<void>;
  attachments: AttachmentChipRecord[];
  disabled?: boolean;
  attachDisabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  maxLength?: number;
  maxAttachments?: number;
};

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  onAttach,
  attachments,
  disabled,
  attachDisabled,
  loading,
  placeholder = 'Message your documents',
  maxLength = 4000,
  maxAttachments = 3,
}: ChatComposerProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const countedAttachments = attachments.filter(
    (attachment) => attachment.status !== 'failed',
  ).length;

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [value]);

  return (
    <form
      ref={formRef}
      className="rounded-[24px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.86)] px-3 py-3 shadow-[var(--shadow-panel)] transition-[border-color,box-shadow,background-color] duration-200 focus-within:border-[color:var(--line-strong)] focus-within:bg-white"
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim() || disabled || loading) {
          return;
        }

        onSubmit();
      }}
    >
      <div className="flex items-end gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={attachDisabled || countedAttachments >= maxAttachments}
          onClick={() => fileInputRef.current?.click()}
          className="h-10 w-10 shrink-0 rounded-xl border border-[color:var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:bg-[var(--panel-muted)] hover:text-[var(--foreground)]"
        >
          <Paperclip size={16} />
        </Button>

        <textarea
          ref={textareaRef}
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
          placeholder={placeholder}
          className={cn(
            'max-h-44 min-h-[44px] flex-1 resize-none bg-transparent py-1.5 text-sm leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        />

        <Button
          type="submit"
          size="icon"
          disabled={disabled || loading || !value.trim()}
          className="h-10 w-10 shrink-0 rounded-xl"
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

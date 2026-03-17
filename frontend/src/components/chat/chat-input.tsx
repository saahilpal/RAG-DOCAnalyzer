'use client';

import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type ChatInputProps = {
  value: string;
  disabled?: boolean;
  loading?: boolean;
  maxLength?: number;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function ChatInput({
  value,
  disabled,
  loading,
  maxLength = 4000,
  onChange,
  onSubmit,
}: ChatInputProps) {
  return (
    <form
      className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled) {
          return;
        }
        onSubmit();
      }}
    >
      <div className="flex items-end gap-3">
        <textarea
          rows={3}
          value={value}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
          placeholder="Ask a question about your document..."
          className={cn(
            'min-h-16 w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200',
            disabled && 'cursor-not-allowed opacity-70',
          )}
          disabled={disabled}
        />

        <Button type="submit" size="icon" disabled={disabled || !value.trim()}>
          <SendHorizontal size={16} />
        </Button>
      </div>

      {loading ? <p className="mt-2 text-xs text-neutral-500">Streaming response...</p> : null}
      <p className="mt-2 text-right text-xs text-neutral-500">
        {value.length}/{maxLength}
      </p>
    </form>
  );
}

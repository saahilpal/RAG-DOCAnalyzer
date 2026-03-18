'use client';

import { SendHorizontal, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { useRef } from 'react';

type ChatInputProps = {
  value: string;
  disabled?: boolean;
  loading?: boolean;
  maxLength?: number;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onUploadClick?: () => void;
};

export function ChatInput({
  value,
  disabled,
  loading,
  maxLength = 4000,
  onChange,
  onSubmit,
  onUploadClick,
}: ChatInputProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-100 transition-all"
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled || !value.trim() || loading) return;
        onSubmit();
      }}
    >
      <div className="flex items-end gap-2">
        {onUploadClick && (
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={onUploadClick}
            className="shrink-0 text-neutral-500 hover:text-neutral-900"
          >
            <Plus size={20} />
          </Button>
        )}

        <textarea
          rows={1}
          value={value}
          maxLength={maxLength}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          onChange={(event) => {
            onChange(event.target.value.slice(0, maxLength));
            // Auto-resize
            event.target.style.height = 'auto';
            event.target.style.height = `${event.target.scrollHeight}px`;
          }}
          placeholder="Message AI..."
          className={cn(
            'flex-1 max-h-48 min-h-[40px] w-full resize-none bg-transparent px-3 py-2 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400',
            disabled && 'cursor-not-allowed opacity-70',
          )}
          disabled={disabled}
        />

        <Button 
          type="submit" 
          size="icon" 
          disabled={disabled || !value.trim() || loading}
          className={cn(
            "shrink-0 transition-transform active:scale-95",
            value.trim() && !loading ? "bg-neutral-900" : "bg-neutral-200 text-neutral-400"
          )}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={16} />}
        </Button>
      </div>
    </form>
  );
}

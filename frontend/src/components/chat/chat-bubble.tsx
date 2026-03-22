'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';

type ChatBubbleProps = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  streaming?: boolean;
};

function ChatBubbleComponent({ role, content, timestamp, streaming = false }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <article className="flex w-full justify-center py-1.5">
      <div
        className={cn(
          'flex w-full max-w-[720px] gap-2',
          isUser ? 'justify-end' : 'justify-start',
        )}
      >
        <div
          className={cn(
            isUser
              ? 'max-w-[92%] rounded-[24px] bg-[var(--foreground)] px-4 py-3 text-[var(--background-strong)] shadow-[var(--shadow-panel)] sm:max-w-[80%]'
              : 'min-w-0 max-w-[94%] rounded-[24px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.88)] px-4 py-3 text-[var(--foreground)] shadow-[var(--shadow-panel)] sm:max-w-[84%]',
          )}
        >
          {!isUser ? (
            <p className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Assistant</p>
          ) : null}

          <div
            className={cn(
              'markdown text-sm leading-6',
              isUser ? 'text-[var(--background-strong)]' : 'text-[var(--foreground)]',
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {streaming && !isUser ? (
              <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-[var(--foreground)] align-middle" />
            ) : null}
          </div>

          {timestamp ? (
            <div className={cn('mt-1 flex items-center', isUser ? 'justify-end' : 'justify-start')}>
              <p className={cn('text-[11px]', isUser ? 'text-white/55' : 'text-[var(--muted)]')}>
                {formatTime(timestamp)}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export const ChatBubble = memo(ChatBubbleComponent);

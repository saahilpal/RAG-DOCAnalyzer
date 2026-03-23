'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { transitions } from '@/lib/motion';

type ChatBubbleProps = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  streaming?: boolean;
};

function ChatBubbleComponent({ role, content, timestamp, streaming = false }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.dropdown}
      className="flex w-full justify-center py-0.5"
    >
      <div
        className={cn(
          'flex w-full max-w-[720px]',
          isUser ? 'justify-end' : 'justify-start',
        )}
      >
        <div
          className={cn(
            isUser
              ? 'max-w-[90%] rounded-[18px] bg-[rgba(24,24,27,0.92)] px-3 py-2 text-[var(--background-strong)] sm:max-w-[78%]'
              : 'min-w-0 max-w-[92%] rounded-[18px] bg-[rgba(255,255,255,0.56)] px-3 py-2 text-[var(--foreground)] sm:max-w-[82%]',
          )}
        >
          {!isUser ? (
            <p className="mb-1 text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]/85">Assistant</p>
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
            <div className={cn('mt-0.5 flex items-center', isUser ? 'justify-end' : 'justify-start')}>
              <p className={cn('text-[11px]', isUser ? 'text-white/55' : 'text-[var(--muted)]')}>
                {formatTime(timestamp)}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}

export const ChatBubble = memo(ChatBubbleComponent);

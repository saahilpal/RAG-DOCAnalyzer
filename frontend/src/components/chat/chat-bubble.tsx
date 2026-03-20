'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { transitions } from '@/lib/motion';

type ChatBubbleProps = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
};

export function ChatBubble({ role, content, timestamp }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.panelEnter}
      className="flex w-full justify-center px-4"
    >
      <div
        className={cn(
          'flex w-full max-w-[720px] gap-3 py-5 md:gap-4',
          isUser
            ? 'justify-end'
            : 'justify-start',
        )}
      >
        {!isUser ? (
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[var(--panel-strong)] text-[var(--accent)] shadow-[var(--shadow-panel)] sm:flex">
            <Sparkles size={16} />
          </div>
        ) : null}

        <div
          className={cn(
            isUser
              ? 'max-w-[85%] rounded-[26px] bg-[var(--foreground)] px-5 py-4 text-[var(--background-strong)] shadow-[0_18px_36px_rgba(24,24,27,0.16)] sm:max-w-[78%]'
              : 'min-w-0 flex-1 text-[var(--foreground)]',
          )}
        >
          {!isUser ? (
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              <FileText size={12} />
              Assistant
            </div>
          ) : null}

          <div
            className={cn(
              'markdown text-[15px] leading-7',
              isUser ? 'text-[var(--background-strong)]' : 'text-[var(--foreground)]',
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>

          {timestamp ? (
            <div className={cn('mt-3 flex items-center', isUser ? 'justify-end' : 'justify-start')}>
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

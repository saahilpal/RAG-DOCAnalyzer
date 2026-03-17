'use client';

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
  fallbackUsed?: boolean;
};

export function ChatBubble({ role, content, timestamp, fallbackUsed = false }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.panelEnter}
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm md:max-w-[78%]',
          isUser
            ? 'border-neutral-300 bg-neutral-200 text-neutral-900'
            : 'border-neutral-200 bg-white text-neutral-800',
        )}
      >
        <div className="markdown text-sm leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          {fallbackUsed ? (
            <span className="rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-neutral-600">
              Fallback
            </span>
          ) : null}
          {timestamp ? <p className="text-right text-[11px] text-neutral-500">{formatTime(timestamp)}</p> : null}
        </div>
      </div>
    </motion.article>
  );
}

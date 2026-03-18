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
      className={cn('flex w-full mb-4', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm md:max-w-[70%]',
          isUser
            ? 'border-neutral-300 bg-neutral-200 text-neutral-900 rounded-tr-none'
            : 'border-neutral-200 bg-white text-neutral-800 rounded-tl-none',
        )}
      >
        <div className="markdown text-sm leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>

        {timestamp ? (
          <div className="mt-2 flex items-center justify-end">
            <p className="text-[10px] text-neutral-400 font-medium">{formatTime(timestamp)}</p>
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}

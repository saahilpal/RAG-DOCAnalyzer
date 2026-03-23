'use client';

import { motion } from 'framer-motion';
import { transitions } from '@/lib/motion';

export function TypingIndicator({ label = 'Thinking' }: { label?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.dropdown}
      className="inline-flex items-center gap-2 rounded-[14px] bg-[rgba(255,255,255,0.56)] px-2.5 py-1 text-xs text-[var(--muted)] transition-colors duration-200"
    >
      <span>{label}</span>
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--foreground)]"
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </span>
    </motion.div>
  );
}

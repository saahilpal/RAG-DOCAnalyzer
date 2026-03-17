'use client';

import { motion } from 'framer-motion';
import { transitions } from '@/lib/motion';

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.panelEnter}
      className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-500"
    >
      <span>Thinking</span>
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="h-1.5 w-1.5 rounded-full bg-neutral-500"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -1, 0] }}
            transition={{ duration: 1.05, repeat: Infinity, ease: 'easeInOut', delay: index * 0.16 }}
          />
        ))}
      </span>
    </motion.div>
  );
}

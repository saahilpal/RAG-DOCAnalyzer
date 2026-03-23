'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import { transitions } from '@/lib/motion';

export type DropdownItem = 
  | {
      type?: 'item';
      label: string;
      onSelect?: () => void;
      destructive?: boolean;
      disabled?: boolean;
    }
  | {
      type: 'separator';
    };

type DropdownProps = {
  items: DropdownItem[];
  align?: 'left' | 'right';
  buttonClassName?: string;
};

export function Dropdown({ items, align = 'right', buttonClassName }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', onDocumentClick);
    }

    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'rounded-xl border border-transparent p-1.5 text-[var(--muted)] transition-colors duration-200 hover:bg-[var(--panel-muted)] hover:text-[var(--foreground)]',
          buttonClassName,
        )}
        aria-label="Open menu"
      >
        <MoreHorizontal size={16} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 2 }}
            transition={transitions.dropdown}
            className={cn(
              'absolute z-30 mt-2 min-w-44 rounded-xl border border-[color:var(--line)] bg-[var(--panel-strong)] py-1 shadow-[var(--shadow-panel)]',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {items.map((item, index) => {
              if (item.type === 'separator') {
                return <div key={`sep-${index}`} className="my-1 border-t border-[color:var(--line)]" />;
              }

              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={item.disabled}
                  className={cn(
                    'flex w-full items-center px-3 py-2 text-left text-sm transition-colors duration-200',
                    item.disabled 
                      ? 'cursor-default opacity-60 text-[var(--muted)] font-medium' 
                      : 'text-[var(--foreground)] hover:bg-[var(--panel-muted)]',
                    item.destructive && !item.disabled && 'text-[#991b1b]',
                  )}
                  onClick={() => {
                    if (item.onSelect) {
                      item.onSelect();
                      setOpen(false);
                    }
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { transitions } from '@/lib/motion';

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  onConfirm?: () => void;
  onClose: () => void;
  children?: React.ReactNode;
};

export function Modal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onClose,
  children,
}: ModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transitions.overlay}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] p-5"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={transitions.panelEnter}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
                {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--panel-muted)]"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {children}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                {cancelLabel}
              </Button>
              {onConfirm ? <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button> : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

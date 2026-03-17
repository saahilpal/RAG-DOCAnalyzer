'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/common/logo-mark';
import { transitions } from '@/lib/motion';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-900">
      <div className="hidden h-full lg:block">
        <Sidebar />
      </div>

      <AnimatePresence>
        {sidebarOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transitions.overlay}
            onClick={() => setSidebarOpen(false)}
          >
            <motion.div
              className="h-full"
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -16, opacity: 0 }}
              transition={transitions.panelEnter}
              onClick={(event) => event.stopPropagation()}
            >
              <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
          <Button variant="secondary" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu size={16} />
          </Button>
          <LogoMark href="/app" />
        </header>

        <main className="flex-1 overflow-auto p-2 sm:p-3 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

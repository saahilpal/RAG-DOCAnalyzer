'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, LogOut, Menu, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { transitions } from '@/lib/motion';
import { useAuth } from '@/hooks/use-auth';
import { useChatWorkspace } from '@/hooks/use-chat-workspace';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  const { activeChat, chatQuota, runLocallyGuideUrl, readyStatus } = useChatWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const remainingQuota = chatQuota?.remaining ?? null;
  const quotaLimit = chatQuota?.limit ?? null;
  const quotaLabel =
    remainingQuota != null && quotaLimit != null ? `${remainingQuota} left of ${quotaLimit}` : 'Quota loading';
  const initials = user?.email.slice(0, 2).toUpperCase() || 'DA';

  return (
    <div className="app-shell-grid flex h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="hidden h-full lg:block">
        <Sidebar />
      </div>

      <AnimatePresence>
        {sidebarOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-black/38 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transitions.overlay}
            onClick={() => setSidebarOpen(false)}
          >
            <motion.div
              className="h-full"
              initial={{ x: -26, opacity: 0 }}
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

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="glass-panel z-20 flex h-16 items-center justify-between border-b border-[color:var(--line)] px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="secondary"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={16} />
            </Button>

            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Workspace</p>
              <p className="truncate font-display text-sm font-semibold text-[var(--foreground)] md:text-base">
                {activeChat?.title || 'New chat'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[color:var(--line)] bg-[rgba(255,252,247,0.72)] px-3 py-1.5 text-xs text-[var(--muted)] shadow-[0_6px_20px_rgba(18,14,10,0.06)] sm:inline-flex">
              <Sparkles size={13} className={readyStatus.ai ? 'text-[var(--accent)]' : 'text-[var(--muted)]'} />
              <span>{quotaLabel}</span>
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-[rgba(255,252,247,0.88)] text-sm font-semibold text-[var(--foreground)] shadow-[0_6px_18px_rgba(18,14,10,0.08)] transition hover:-translate-y-0.5 hover:bg-white"
              aria-label="Open settings panel"
            >
              {initials}
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>

      <AnimatePresence>
        {settingsOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-black/28"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transitions.overlay}
            onClick={() => setSettingsOpen(false)}
          >
            <motion.aside
              className="absolute right-0 top-0 h-full w-full max-w-md border-l border-[color:var(--line)] bg-[rgba(255,252,247,0.95)] p-6 shadow-[0_24px_80px_rgba(18,14,10,0.18)] backdrop-blur-2xl"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={transitions.panelEnter}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Settings</p>
                    <h2 className="font-display text-2xl font-semibold text-[var(--foreground)]">Your workspace</h2>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(false)}>
                    <span className="text-lg leading-none">×</span>
                  </Button>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="rounded-[28px] border border-[color:var(--line)] bg-[var(--panel-strong)] p-5 shadow-[var(--shadow-panel)]">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Account</p>
                    <p className="mt-3 text-base font-semibold text-[var(--foreground)]">{user?.email}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">Signed in with passwordless email access.</p>
                  </div>

                  <div className="rounded-[28px] border border-[color:var(--line)] bg-[var(--panel-strong)] p-5 shadow-[var(--shadow-panel)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Quota</p>
                        <p className="mt-3 font-display text-3xl font-semibold text-[var(--foreground)]">
                          {remainingQuota ?? '--'}
                        </p>
                        <p className="text-sm text-[var(--muted)]">Replies remaining today</p>
                      </div>
                      <div className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                        {quotaLimit ? `${chatQuota?.used || 0}/${quotaLimit} used` : 'Loading'}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-[color:var(--line)] bg-[linear-gradient(135deg,rgba(216,120,27,0.12),rgba(255,252,247,0.9))] p-5 shadow-[var(--shadow-panel)]">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Unlimited mode</p>
                    <h3 className="mt-3 font-display text-xl font-semibold text-[var(--foreground)]">
                      Run locally for unlimited usage
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      Keep the same chat experience with your own keys, your own limits, and full control.
                    </p>
                    <Link
                      href={runLocallyGuideUrl}
                      target="_blank"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]"
                    >
                      Open local setup
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                <div className="mt-auto pt-6">
                  <Button
                    variant="danger"
                    className="w-full justify-center"
                    onClick={async () => {
                      await signOutUser();
                      router.push('/login');
                    }}
                  >
                    <LogOut size={16} />
                    Log out
                  </Button>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

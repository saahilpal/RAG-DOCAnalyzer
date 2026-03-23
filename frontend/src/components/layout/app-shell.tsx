'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, LogOut, Menu, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { transitions } from '@/lib/motion';
import { useAuth } from '@/hooks/use-auth';
import { useChatWorkspace } from '@/hooks/use-chat-workspace';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  const { activeChat, chatQuota, runLocallyGuideUrl, readyStatus, modelName } = useChatWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const remainingQuota = chatQuota?.remaining ?? null;
  const quotaLimit = chatQuota?.limit ?? null;
  const quotaLabel =
    remainingQuota != null && quotaLimit != null ? `${remainingQuota} left of ${quotaLimit}` : 'Usage loading';

  return (
    <div className="app-shell-grid flex h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="hidden h-full lg:block">
        <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      <AnimatePresence>
        {sidebarOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] lg:hidden"
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
              <Sidebar
                onNavigate={() => setSidebarOpen(false)}
                onOpenSettings={() => {
                  setSidebarOpen(false);
                  setSettingsOpen(true);
                }}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex h-16 items-center justify-between border-b border-[color:var(--line)] bg-[rgba(247,244,238,0.92)] px-3 backdrop-blur-xl sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="secondary" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu size={16} />
            </Button>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Document chat</p>
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">{activeChat?.title || 'New chat'}</p>
                <span className="hidden rounded-full border border-[color:var(--line)] bg-[var(--panel-strong)] px-2 py-0.5 text-[11px] text-[var(--muted)] md:inline-flex">
                  {readyStatus.ai ? 'AI ready' : 'AI limited'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1 text-[11px] text-[var(--muted)] shadow-[var(--shadow-panel)] sm:hidden">
              <span className={`h-2 w-2 rounded-full ${readyStatus.ai ? 'bg-neutral-900' : 'bg-neutral-400'}`} />
              <span>{remainingQuota != null ? `${remainingQuota} left` : 'Loading'}</span>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 text-xs text-[var(--muted)] shadow-[var(--shadow-panel)] sm:inline-flex">
              <span className={`h-2 w-2 rounded-full ${readyStatus.ai ? 'bg-neutral-900' : 'bg-neutral-400'}`} />
              <span>{quotaLabel}</span>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="lg:hidden"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings panel"
            >
              <Settings2 size={16} />
            </Button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>

      <AnimatePresence>
        {settingsOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transitions.overlay}
            onClick={() => setSettingsOpen(false)}
          >
            <motion.aside
              className="absolute right-0 top-0 h-full w-full max-w-[420px] overflow-y-auto border-l border-[color:var(--line)] bg-[rgba(247,244,238,0.96)] p-4 shadow-[var(--shadow-soft)] sm:p-6"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={transitions.panelEnter}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Settings</p>
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">Workspace controls</h2>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(false)}>
                    <span className="text-lg leading-none">×</span>
                  </Button>
                </div>

                <div className="mt-6 space-y-4">
                  <Card className="bg-white/86 p-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Email</p>
                    <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{user?.email}</p>
                  </Card>

                  <Card className="bg-white/86 p-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Model</p>
                    <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{modelName || 'Loading model...'}</p>
                  </Card>

                  <Card className="bg-white/86 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Remaining usage</p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                          {remainingQuota ?? '--'}
                        </p>
                      </div>
                      <div className="rounded-full border border-[color:var(--line)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
                        {quotaLimit ? `${chatQuota?.used || 0}/${quotaLimit}` : '...'}
                      </div>
                    </div>
                  </Card>

                  <Card className="bg-white/86 p-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">Actions</p>
                    <div className="mt-3 space-y-2">
                      <button
                        type="button"
                        className="inline-flex w-full items-center justify-between rounded-xl border border-[color:var(--line)] px-3 py-3 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--panel-muted)]"
                        onClick={async () => {
                          await signOutUser();
                          router.push('/login');
                        }}
                      >
                        Switch Google account
                        <Settings2 size={14} />
                      </button>
                      <Link
                        href={runLocallyGuideUrl}
                        target="_blank"
                        className="inline-flex w-full items-center justify-between rounded-xl border border-[color:var(--line)] px-3 py-3 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--panel-muted)]"
                      >
                        View project quick start
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </Card>

                  <Card className="bg-white/86 p-4">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">About me</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      Built by Sahil Pal. Backend-first engineer focused on resilient systems and polished user
                      experience.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Link
                        href="https://github.com/saahilpal"
                        target="_blank"
                        className="inline-flex rounded-full border border-[color:var(--line)] px-3 py-1 text-xs font-medium text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--panel-muted)]"
                      >
                        GitHub
                      </Link>
                      <Link
                        href="https://www.linkedin.com/in/sahiilpal"
                        target="_blank"
                        className="inline-flex rounded-full border border-[color:var(--line)] px-3 py-1 text-xs font-medium text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--panel-muted)]"
                      >
                        LinkedIn
                      </Link>
                    </div>
                  </Card>
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

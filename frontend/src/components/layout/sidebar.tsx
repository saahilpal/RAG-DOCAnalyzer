'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageSquare, Plus, Settings, Search, LogOut, X, Activity, Database } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';
import { LogoMark } from '@/components/common/logo-mark';
import { useAuth } from '@/hooks/use-auth';
import { useAppData } from '@/hooks/use-app-data';
import { cn } from '@/lib/cn';
import { formatRelativeTime } from '@/lib/format';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();

  const { user, signOutUser } = useAuth();
  const { 
    sessions, 
    activeSessionId, 
    setActiveSessionId, 
    documents, 
    chatQuota,
    readyStatus,
    selectedDocumentId,
    setSelectedDocumentId
  } = useAppData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    return sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [sessions, searchQuery]);

  const initials = user?.email.slice(0, 2).toUpperCase() || 'DA';

  return (
    <>
      <aside className="flex h-full w-[86vw] max-w-[320px] flex-col border-r border-neutral-200 bg-white/90 px-4 py-5 backdrop-blur lg:w-[300px] lg:max-w-none">
        <div className="mb-6">
          <LogoMark href="/app" />
        </div>

        {/* TOP: New Chat & Search */}
        <div className="mb-6 space-y-3">
          <Button
            className="w-full justify-start gap-2 shadow-sm"
            onClick={() => {
              setActiveSessionId(null);
              router.push('/app');
              onNavigate?.();
            }}
          >
            <Plus size={16} />
            New Chat
          </Button>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-xs outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
            />
          </div>
        </div>

        {/* MIDDLE: Chat Sessions ONLY */}
        <div className="mb-2 flex items-center justify-between px-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Sessions</h3>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {filteredSessions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
              {searchQuery ? 'No matches found.' : 'No sessions for this document.'}
            </p>
          ) : (
            filteredSessions.map((session) => (
              <motion.button
                key={session.id}
                whileHover={{ y: -0.5 }}
                transition={{ duration: 0.1 }}
                type="button"
                onClick={() => {
                  setActiveSessionId(session.id);
                  if (session.document_id !== selectedDocumentId) {
                    setSelectedDocumentId(session.document_id);
                  }
                  router.push('/app');
                  onNavigate?.();
                }}
                className={cn(
                  'w-full rounded-xl border px-3 py-2 text-left transition',
                  session.id === activeSessionId
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-md'
                    : 'border-transparent bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                )}
              >
                <p className="truncate text-sm font-medium">{session.title}</p>
                <p
                  className={cn(
                    'mt-0.5 text-[10px]',
                    session.id === activeSessionId ? 'text-neutral-300' : 'text-neutral-400',
                  )}
                >
                  {formatRelativeTime(session.updated_at)}
                </p>
              </motion.button>
            ))
          )}
        </div>

        {/* BOTTOM: Profile / Settings */}
        <div className="mt-auto border-t border-neutral-200 pt-4">
          <div className="group relative flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 transition-colors hover:bg-neutral-100">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                {initials}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-xs font-semibold text-neutral-800">{user?.email}</p>
                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-tight">Active Workspace</p>
              </div>
            </div>

            <Dropdown
              items={[
                {
                  label: 'Workspace Settings',
                  onSelect: () => setIsSettingsOpen(true),
                },
                {
                  type: 'separator',
                },
                {
                  label: 'Logout',
                  onSelect: async () => {
                    await signOutUser();
                    router.push('/login');
                    onNavigate?.();
                  },
                  destructive: true,
                },
              ]}
            />
          </div>
        </div>
      </aside>

      {/* Settings Overlay (Phase 6) */}
      {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end bg-black/20 backdrop-blur-sm">
            <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col border-l border-neutral-200 overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5">
                <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Settings size={20} className="text-neutral-500" />
                  Settings
                </h2>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-neutral-50/50">
                <section>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Workspace Health</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-neutral-500 mb-2">
                        <Database size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Docs</span>
                      </div>
                      <p className="text-2xl font-black text-neutral-900">{documents.length}</p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-neutral-500 mb-2">
                        <MessageSquare size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Chats</span>
                      </div>
                      <p className="text-2xl font-black text-neutral-900">{sessions.length}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Daily Limits</h3>
                  <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-neutral-500">
                        <Activity size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Requests</span>
                      </div>
                      <span className="text-xs font-medium text-neutral-500">
                        {chatQuota ? `${chatQuota.remaining} left` : '...'}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div 
                        className="h-full bg-neutral-900 transition-all duration-500" 
                        style={{ width: chatQuota ? `${(chatQuota.used / chatQuota.limit) * 100}%` : '0%' }} 
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">System</h3>
                  <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm space-y-4">
                    <div className="flex items-center justify-between text-sm">
                       <span className="text-neutral-600">Database</span>
                       <span className={cn("font-bold uppercase text-[10px]", readyStatus.database ? "text-green-600" : "text-red-500")}>
                         {readyStatus.database ? 'Online' : 'Offline'}
                       </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                       <span className="text-neutral-600">AI Service</span>
                       <span className={cn("font-bold uppercase text-[10px]", readyStatus.ai ? "text-green-600" : "text-yellow-500")}>
                         {readyStatus.ai ? 'Online' : 'Degraded'}
                       </span>
                    </div>
                  </div>
                </section>
              </div>

              <div className="p-6 border-t border-neutral-200 bg-white">
                <Button
                  variant="ghost"
                  className="w-full justify-center text-red-600 hover:bg-red-50 hover:text-red-700 h-11"
                  onClick={async () => {
                    await signOutUser();
                    router.push('/login');
                  }}
                >
                  <LogOut size={16} className="mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Files, MessageSquare, Plus, Settings, Search, LogOut, X, Activity, Shield, Database, Zap } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';
import { LogoMark } from '@/components/common/logo-mark';
import { useAuth } from '@/hooks/use-auth';
import { useAppData } from '@/hooks/use-app-data';
import { cn } from '@/lib/cn';
import { formatRelativeTime } from '@/lib/format';

const navItems = [
  { href: '/app', label: 'Chat', icon: MessageSquare },
  { href: '/app/documents', label: 'Documents', icon: Files },
];
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const { user, signOutUser } = useAuth();
  const { 
    sessions, 
    activeSessionId, 
    setActiveSessionId, 
    documents, 
    chatQuota,
    readyStatus,
    loadingDocuments,
    loadingSessions
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
          <LogoMark href="/" />
        </div>

        <div className="mb-4 space-y-3">
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

        <nav className="mb-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onNavigate?.()}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mb-2 flex items-center justify-between px-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Recent Sessions</h3>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {filteredSessions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
              {searchQuery ? 'No matches found.' : 'No sessions yet.'}
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

        <div className="mt-4 border-t border-neutral-200 pt-4">
          <div className="group relative flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 transition-colors hover:bg-neutral-100">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                {initials}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-xs font-semibold text-neutral-800">{user?.email}</p>
                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-tight">Personal Workspace</p>
              </div>
            </div>

            <Dropdown
              items={[
                {
                  label: 'Settings',
                  onSelect: () => {
                    setIsSettingsOpen(true);
                  },
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

      {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end bg-black/20 backdrop-blur-sm">
            <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col border-l border-neutral-200">
              <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5">
                <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Settings size={20} className="text-neutral-500" />
                  Workspace Settings
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
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Account</h3>
                  <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{user?.email}</p>
                        <p className="text-xs text-neutral-500">Free Tier</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Workspace Health</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-neutral-500 mb-2">
                        <Database size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Documents</span>
                      </div>
                      <p className="text-2xl font-black text-neutral-900">{documents.length}</p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-neutral-500 mb-2">
                        <MessageSquare size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Sessions</span>
                      </div>
                      <p className="text-2xl font-black text-neutral-900">{sessions.length}</p>
                    </div>
                    <div className="col-span-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-neutral-500">
                          <Activity size={16} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Daily Quota</span>
                        </div>
                        <span className="text-xs font-medium text-neutral-500">
                          {chatQuota ? `${chatQuota.remaining} requests remaining` : '...'}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                        <div 
                          className="h-full bg-neutral-900 transition-all duration-500" 
                          style={{ width: chatQuota ? `${(chatQuota.used / chatQuota.limit) * 100}%` : '0%' }} 
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">System Status</h3>
                  <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-700">Database Connection</span>
                      <span className={cn("text-xs font-bold uppercase flex items-center gap-1.5", readyStatus.database ? "text-green-600" : "text-red-500")}>
                        <div className={cn("h-1.5 w-1.5 rounded-full", readyStatus.database ? "bg-green-500" : "bg-red-500")} />
                        {readyStatus.database ? 'Operational' : 'Offline'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-700">AI Service (Gemini)</span>
                      <span className={cn("text-xs font-bold uppercase flex items-center gap-1.5", readyStatus.ai ? "text-green-600" : "text-yellow-500")}>
                        <div className={cn("h-1.5 w-1.5 rounded-full", readyStatus.ai ? "bg-green-500" : "bg-yellow-500")} />
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
                    onNavigate?.();
                  }}
                >
                  <LogOut size={16} className="mr-2" />
                  Sign out of workspace
                </Button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}
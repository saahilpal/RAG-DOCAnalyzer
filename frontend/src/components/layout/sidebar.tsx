'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Files, MessageSquare, Plus, Settings, Search, LogOut } from 'lucide-react';
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
  { href: '/app/settings', label: 'Settings', icon: Settings },
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
    loadingDocuments,
    loadingSessions
  } = useAppData();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    return sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [sessions, searchQuery]);

  const initials = user?.email.slice(0, 2).toUpperCase() || 'DA';

  return (
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
                label: 'Health: Healthy',
                disabled: true,
              },
              {
                label: `${documents.length} Documents`,
                disabled: true,
              },
              {
                label: chatQuota ? `${chatQuota.remaining} Chats left` : 'Checking quota...',
                disabled: true,
              },
              {
                type: 'separator',
              },
              {
                label: 'Settings',
                onSelect: () => {
                  router.push('/app/settings');
                  onNavigate?.();
                },
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
  );
}

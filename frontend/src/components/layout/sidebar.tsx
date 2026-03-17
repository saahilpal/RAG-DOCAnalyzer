'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Files, MessageSquare, Plus, Settings } from 'lucide-react';
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
  const { sessions, activeSessionId, setActiveSessionId } = useAppData();

  const initials = user?.email.slice(0, 2).toUpperCase() || 'DA';

  return (
    <aside className="flex h-full w-[86vw] max-w-[320px] flex-col border-r border-neutral-200 bg-white/90 px-4 py-5 backdrop-blur lg:w-[300px] lg:max-w-none">
      <div className="mb-6">
        <LogoMark href="/" />
      </div>

      <Button
        variant="secondary"
        className="mb-4 w-full justify-start"
        onClick={() => {
          setActiveSessionId(null);
          router.push('/app');
          onNavigate?.();
        }}
      >
        <Plus size={16} />
        New Chat
      </Button>

      <nav className="mb-4 space-y-1">
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

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">Sessions</h3>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {sessions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-sm text-neutral-500">
            Start a new chat to create your first session.
          </p>
        ) : (
          sessions.map((session) => (
            <motion.button
              key={session.id}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.2 }}
              type="button"
              onClick={() => {
                setActiveSessionId(session.id);
                router.push('/app');
                onNavigate?.();
              }}
              className={cn(
                'w-full rounded-xl border px-3 py-2 text-left transition',
                session.id === activeSessionId
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100',
              )}
            >
              <p className="truncate text-sm font-medium">{session.title}</p>
              <p
                className={cn(
                  'mt-1 text-xs',
                  session.id === activeSessionId ? 'text-neutral-300' : 'text-neutral-500',
                )}
              >
                {formatRelativeTime(session.updated_at)}
              </p>
            </motion.button>
          ))
        )}
      </div>

      <div className="mt-4 border-t border-neutral-200 pt-4">
        <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
              {initials}
            </div>
            <div>
              <p className="max-w-[150px] truncate text-sm font-medium text-neutral-800">{user?.email}</p>
              <p className="text-xs text-neutral-500">Workspace</p>
            </div>
          </div>

          <Dropdown
            items={[
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

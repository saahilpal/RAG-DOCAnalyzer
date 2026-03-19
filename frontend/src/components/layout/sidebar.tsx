'use client';

import { motion } from 'framer-motion';
import { LogOut, MessageSquarePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/common/logo-mark';
import { useAuth } from '@/hooks/use-auth';
import { useChatWorkspace } from '@/hooks/use-chat-workspace';
import { cn } from '@/lib/cn';
import { formatRelativeTime } from '@/lib/format';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  const { chats, activeChatId, createNewChat, selectChat, loadingChats } = useChatWorkspace();

  const initials = user?.email.slice(0, 2).toUpperCase() || 'DA';

  return (
    <aside className="flex h-full w-[86vw] max-w-[320px] flex-col border-r border-neutral-200 bg-white/95 px-4 py-5 backdrop-blur lg:w-[300px] lg:max-w-none">
      <div className="mb-6">
        <LogoMark href="/app" />
      </div>

      <Button
        className="mb-5 w-full justify-start gap-2 rounded-2xl"
        onClick={async () => {
          const chatId = await createNewChat();
          router.push('/app');
          await selectChat(chatId);
          onNavigate?.();
        }}
      >
        <MessageSquarePlus size={16} />
        New chat
      </Button>

      <div className="mb-2 px-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">Recent chats</h3>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {loadingChats && chats.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
            Loading chats...
          </p>
        ) : chats.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 px-3 py-6 text-center text-xs text-neutral-400">
            Start a new chat to begin.
          </p>
        ) : (
          chats.map((chat) => (
            <motion.button
              key={chat.id}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.12 }}
              type="button"
              onClick={async () => {
                await selectChat(chat.id);
                router.push('/app');
                onNavigate?.();
              }}
              className={cn(
                'w-full rounded-2xl border px-3 py-3 text-left transition',
                chat.id === activeChatId
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-md'
                  : 'border-transparent bg-transparent text-neutral-700 hover:bg-neutral-100',
              )}
            >
              <p className="truncate text-sm font-semibold">{chat.title}</p>
              <p
                className={cn(
                  'mt-1 truncate text-xs',
                  chat.id === activeChatId ? 'text-neutral-300' : 'text-neutral-500',
                )}
              >
                {chat.last_message || 'Empty chat'}
              </p>
              <div
                className={cn(
                  'mt-2 flex items-center justify-between text-[11px]',
                  chat.id === activeChatId ? 'text-neutral-300' : 'text-neutral-400',
                )}
              >
                <span>{formatRelativeTime(chat.updated_at)}</span>
                <span>{chat.attachment_count} file{chat.attachment_count === 1 ? '' : 's'}</span>
              </div>
            </motion.button>
          ))
        )}
      </div>

      <div className="mt-4 border-t border-neutral-200 pt-4">
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-900">{user?.email}</p>
            <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-500">Workspace</p>
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full justify-start gap-2 rounded-2xl"
          onClick={async () => {
            await signOutUser();
            router.push('/login');
          }}
        >
          <LogOut size={16} />
          Log out
        </Button>
      </div>
    </aside>
  );
}

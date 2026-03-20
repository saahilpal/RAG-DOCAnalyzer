'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquarePlus, Pin, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { LogoMark } from '@/components/common/logo-mark';
import { useChatWorkspace, type WorkspaceChatRecord } from '@/hooks/use-chat-workspace';
import { cn } from '@/lib/cn';
import { formatRelativeTime } from '@/lib/format';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const {
    chats,
    activeChatId,
    createNewChat,
    selectChat,
    renameChat,
    deleteChat,
    togglePinnedChat,
    loadingChats,
  } = useChatWorkspace();

  const [renameTarget, setRenameTarget] = useState<WorkspaceChatRecord | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceChatRecord | null>(null);

  useEffect(() => {
    if (!renameTarget) {
      return;
    }

    setRenameValue(renameTarget.title);
  }, [renameTarget]);

  async function handleCreateChat() {
    const chatId = await createNewChat();
    router.push('/app');
    await selectChat(chatId);
    onNavigate?.();
  }

  return (
    <>
      <aside className="flex h-full w-[88vw] max-w-[352px] flex-col border-r border-[rgba(255,255,255,0.08)] bg-[var(--sidebar)] px-4 py-5 text-[var(--sidebar-foreground)] lg:w-[320px] lg:max-w-none">
        <div className="mb-6 flex items-center justify-between px-2">
          <LogoMark
            href="/app"
            className="[&_span:last-child]:text-[var(--sidebar-foreground)] [&_span:last-child]:opacity-95"
          />
        </div>

        <Button
          className="mb-5 h-12 w-full justify-start rounded-[22px] border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.08)] text-[var(--sidebar-foreground)] hover:bg-[rgba(255,255,255,0.14)]"
          onClick={() => {
            void handleCreateChat();
          }}
        >
          <MessageSquarePlus size={16} />
          New chat
        </Button>

        <div className="mb-3 flex items-center justify-between px-2 text-[11px] uppercase tracking-[0.22em] text-[var(--sidebar-muted)]">
          <span>Chats</span>
          <span>{chats.length}</span>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {loadingChats && chats.length === 0 ? (
            <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-8 text-center text-sm text-[var(--sidebar-muted)]">
              Loading your chats...
            </div>
          ) : chats.length === 0 ? (
            <div className="rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-8 text-center text-sm text-[var(--sidebar-muted)]">
              Start a new chat to begin.
            </div>
          ) : (
            chats.map((chat) => {
              const isActive = chat.id === activeChatId;

              return (
                <motion.div
                  key={chat.id}
                  whileHover={{ y: -1 }}
                  transition={{ duration: 0.16 }}
                  className={cn(
                    'group rounded-[24px] border px-3 py-3 transition',
                    isActive
                      ? 'border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.1)] shadow-[0_16px_36px_rgba(0,0,0,0.16)]'
                      : 'border-transparent bg-transparent hover:bg-[rgba(255,255,255,0.05)]',
                  )}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void selectChat(chat.id);
                        router.push('/app');
                        onNavigate?.();
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--sidebar-foreground)]">{chat.title}</p>
                        {chat.isPinned ? <Pin size={12} className="shrink-0 text-[#f1c48a]" /> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--sidebar-muted)]">
                        {chat.last_message || 'No messages yet'}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--sidebar-muted)]">
                        <span>{formatRelativeTime(chat.updated_at)}</span>
                        <span className="h-1 w-1 rounded-full bg-[rgba(255,255,255,0.22)]" />
                        <span>
                          {chat.attachment_count} file{chat.attachment_count === 1 ? '' : 's'}
                        </span>
                      </div>
                    </button>

                    <div className={cn('opacity-0 transition group-hover:opacity-100', isActive && 'opacity-100')}>
                      <Dropdown
                        align="right"
                        buttonClassName="border border-transparent text-[var(--sidebar-muted)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--sidebar-foreground)]"
                        items={[
                          {
                            label: 'Rename',
                            onSelect: () => setRenameTarget(chat),
                          },
                          {
                            label: chat.isPinned ? 'Unpin' : 'Pin',
                            onSelect: () => togglePinnedChat(chat.id),
                          },
                          {
                            type: 'separator',
                          },
                          {
                            label: 'Delete',
                            destructive: true,
                            onSelect: () => setDeleteTarget(chat),
                          },
                        ]}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </aside>

      <Modal
        open={Boolean(renameTarget)}
        title="Rename chat"
        description="Give this conversation a title that is easier to find later."
        confirmLabel="Save"
        cancelLabel="Cancel"
        onClose={() => setRenameTarget(null)}
        onConfirm={() => {
          if (!renameTarget) {
            return;
          }

          renameChat(renameTarget.id, renameValue);
          setRenameTarget(null);
        }}
      >
        <Input
          value={renameValue}
          maxLength={60}
          onChange={(event) => setRenameValue(event.target.value)}
          placeholder="Untitled conversation"
        />
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete chat"
        description="This removes the conversation from your sidebar on this device."
        confirmLabel="Delete"
        confirmVariant="danger"
        cancelLabel="Cancel"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }

          deleteChat(deleteTarget.id);
          setDeleteTarget(null);
          router.push('/app');
          onNavigate?.();
        }}
      >
        <div className="rounded-2xl border border-[color:var(--line)] bg-[rgba(23,20,17,0.03)] px-4 py-3 text-sm text-[var(--muted)]">
          <span className="font-medium text-[var(--foreground)]">{deleteTarget?.title}</span> will disappear from the
          chat list immediately.
        </div>
      </Modal>
    </>
  );
}

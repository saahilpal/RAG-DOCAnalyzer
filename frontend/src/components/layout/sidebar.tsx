'use client';

import { useState } from 'react';
import { MessageSquarePlus, Pin, Settings2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { LogoMark } from '@/components/common/logo-mark';
import { useChatWorkspace, type WorkspaceChatRecord } from '@/hooks/use-chat-workspace';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/cn';
import { formatRelativeTime } from '@/lib/format';

type SidebarProps = {
  onNavigate?: () => void;
  onOpenSettings?: () => void;
};

export function Sidebar({ onNavigate, onOpenSettings }: SidebarProps) {
  const router = useRouter();
  const { user } = useAuth();
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

  async function handleCreateChat() {
    const chatId = await createNewChat();
    router.push('/app');
    await selectChat(chatId);
    onNavigate?.();
  }

  const initials = user?.email.slice(0, 2).toUpperCase() || 'DA';

  return (
    <>
      <aside className="flex h-full w-[88vw] max-w-[352px] flex-col border-r border-[color:var(--line)] bg-[var(--sidebar)] px-3 py-4 text-[var(--sidebar-foreground)] lg:w-[296px] lg:max-w-none">
        <div className="mb-4 flex items-center justify-between px-1">
          <LogoMark
            href="/app"
            className="[&_span:last-child]:text-[var(--sidebar-foreground)] [&_span:last-child]:opacity-90"
          />
        </div>

        <Button
          className="mb-4 h-10 w-full justify-start rounded-md border-[color:var(--sidebar-line)] bg-[var(--sidebar-elevated)] text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)]"
          onClick={() => {
            void handleCreateChat();
          }}
        >
          <MessageSquarePlus size={16} />
          New chat
        </Button>

        <div className="mb-2 flex items-center justify-between px-1 text-[11px] uppercase tracking-[0.12em] text-[var(--sidebar-muted)]">
          <span>Chats</span>
          <span>{chats.length}</span>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto pr-1">
          {loadingChats && chats.length === 0 ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-md border border-[color:var(--sidebar-line)] bg-[var(--sidebar-elevated)]"
                />
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="rounded-md border border-[color:var(--sidebar-line)] bg-[var(--sidebar-elevated)] px-4 py-6 text-center text-sm text-[var(--sidebar-muted)]">
              Start a new chat to begin.
            </div>
          ) : (
            chats.map((chat) => {
              const isActive = chat.id === activeChatId;

              return (
                <div
                  key={chat.id}
                  className={cn(
                    'group rounded-md border px-2.5 py-2 transition-colors duration-150',
                    isActive
                      ? 'border-[color:var(--sidebar-line-strong)] bg-[var(--sidebar-elevated)]'
                      : 'border-transparent bg-transparent hover:bg-[var(--sidebar-hover)]',
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
                        <p className="truncate text-sm font-medium text-[var(--sidebar-foreground)]">{chat.title}</p>
                        {chat.isPinned ? (
                          <Pin size={12} className="shrink-0 text-[var(--sidebar-foreground)]" />
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[var(--sidebar-muted)]">
                        {chat.last_message || 'No messages yet'}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--sidebar-muted)]">
                        <span>{formatRelativeTime(chat.updated_at)}</span>
                        <span className="h-1 w-1 rounded-full bg-[var(--sidebar-line-strong)]" />
                        <span>
                          {chat.attachment_count} file{chat.attachment_count === 1 ? '' : 's'}
                        </span>
                      </div>
                    </button>

                    <div className={cn('opacity-0 transition group-hover:opacity-100', isActive && 'opacity-100')}>
                      <Dropdown
                        align="right"
                        buttonClassName="border border-transparent text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-foreground)]"
                        items={[
                          {
                            label: 'Rename',
                            onSelect: () => {
                              setRenameTarget(chat);
                              setRenameValue(chat.title);
                            },
                          },
                          {
                            label: chat.isPinned ? 'Unpin' : 'Pin',
                            onSelect: () => {
                              void togglePinnedChat(chat.id);
                            },
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
                </div>
              );
            })
          )}
        </div>

        <div className="mt-3 border-t border-[color:var(--sidebar-line)] pt-3">
          <button
            type="button"
            onClick={() => {
              onOpenSettings?.();
              onNavigate?.();
            }}
            className="flex w-full items-center gap-2 rounded-md border border-[color:var(--sidebar-line)] bg-[var(--sidebar-elevated)] px-2.5 py-2 text-left transition-colors duration-150 hover:bg-[var(--sidebar-hover)]"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--sidebar-line)] bg-[var(--sidebar)] text-xs font-semibold text-[var(--sidebar-foreground)]">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-[var(--sidebar-foreground)]">
                {user?.email || 'Account'}
              </span>
              <span className="block text-[11px] text-[var(--sidebar-muted)]">Workspace settings</span>
            </span>
            <Settings2 size={14} className="text-[var(--sidebar-muted)]" />
          </button>
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

          void renameChat(renameTarget.id, renameValue);
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
        description="This permanently deletes the conversation and all messages."
        confirmLabel="Delete"
        confirmVariant="danger"
        cancelLabel="Cancel"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }

          void deleteChat(deleteTarget.id);
          setDeleteTarget(null);
          router.push('/app');
          onNavigate?.();
        }}
      >
        <div className="rounded-md border border-[color:var(--line)] bg-[var(--panel-muted)] px-4 py-3 text-sm text-[var(--muted)]">
          <span className="font-medium text-[var(--foreground)]">{deleteTarget?.title}</span> and all related messages
          will be removed.
        </div>
      </Modal>
    </>
  );
}

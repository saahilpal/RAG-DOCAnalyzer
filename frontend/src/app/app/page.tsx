'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ChatBubble } from '@/components/chat/chat-bubble';
import { ChatComposer } from '@/components/chat/chat-composer';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { useChatWorkspace } from '@/hooks/use-chat-workspace';
import { PageTransition } from '@/components/common/page-transition';

export default function DashboardChatPage() {
  const {
    activeChat,
    serverMessages,
    streamingMessage,
    attachments,
    loadingThread,
    sending,
    composerError,
    chatQuota,
    workspaceLimits,
    retrievalMode,
    sendMessage,
    attachFile,
    removeAttachment,
  } = useChatWorkspace();

  const [query, setQuery] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const readyAttachments = useMemo(
    () => attachments.filter((attachment) => attachment.status === 'indexed').length,
    [attachments],
  );

  const pendingAttachments = useMemo(
    () =>
      attachments.filter(
        (attachment) => attachment.status === 'uploading' || attachment.status === 'processing',
      ).length,
    [attachments],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [serverMessages, streamingMessage]);

  const hasMessages = serverMessages.length > 0 || Boolean(streamingMessage);

  return (
    <PageTransition>
      <div className="mx-auto flex h-[calc(100vh-88px)] max-w-5xl flex-col rounded-[32px] border border-neutral-200 bg-white shadow-[0_8px_32px_rgba(16,16,16,0.06)] lg:h-[calc(100vh-56px)]">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">Workspace</p>
            <h1 className="truncate text-lg font-semibold text-neutral-950">
              {activeChat?.title || 'New chat'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge tone="muted">{retrievalMode === 'vector' ? 'Vector + FTS' : 'FTS-first'}</Badge>
            {chatQuota ? <Badge tone="muted">{chatQuota.remaining} left today</Badge> : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(248,248,248,0.85),rgba(255,255,255,1))] px-4 py-6 sm:px-6">
          {loadingThread ? (
            <div className="flex h-full items-center justify-center">
              <TypingIndicator />
            </div>
          ) : hasMessages ? (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-1">
              {serverMessages.map((message) => (
                <ChatBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.created_at}
                />
              ))}

              {streamingMessage ? (
                streamingMessage.content ? (
                  <ChatBubble role="assistant" content={streamingMessage.content} />
                ) : (
                  <div className="mb-4">
                    <TypingIndicator />
                  </div>
                )
              ) : null}

              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-neutral-200 bg-neutral-100 text-neutral-700">
                <Sparkles size={26} />
              </div>

              <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
                Upload documents or ask a question
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">
                This workspace behaves like a natural chat assistant. Attach up to{' '}
                {workspaceLimits?.maxDocsPerChat || 3} PDFs when you want grounded answers, or just start chatting.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-neutral-500">
                <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2">
                  <FileText size={14} />
                  <span>{readyAttachments} ready files</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2">
                  <span>{pendingAttachments} processing</span>
                </div>
                {chatQuota ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2">
                    <span>{chatQuota.remaining} replies left today</span>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <ChatComposer
              value={query}
              onChange={setQuery}
              onSubmit={async () => {
                const trimmed = query.trim();
                if (!trimmed) {
                  return;
                }
                setQuery('');
                await sendMessage(trimmed);
              }}
              onAttach={attachFile}
              onRemoveAttachment={removeAttachment}
              attachments={attachments}
              disabled={Boolean(chatQuota && chatQuota.remaining <= 0)}
              loading={sending}
              maxAttachments={workspaceLimits?.maxDocsPerChat || 3}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-neutral-500">
              <p>
                {pendingAttachments > 0 && readyAttachments === 0
                  ? 'Waiting for at least one attached document to finish processing.'
                  : 'Attached files act as context for this chat only.'}
              </p>
              <p>Shift + Enter for a new line</p>
            </div>

            {composerError ? (
              <Card className="mt-3 border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                {composerError}
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

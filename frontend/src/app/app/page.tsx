'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, RotateCcw } from 'lucide-react';
import { ChatBubble } from '@/components/chat/chat-bubble';
import { ChatComposer } from '@/components/chat/chat-composer';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { Modal } from '@/components/ui/modal';
import { useChatWorkspace } from '@/hooks/use-chat-workspace';
import { PageTransition } from '@/components/common/page-transition';

const SUGGESTED_PROMPTS = [
  'Summarize the main argument in my document',
  'Compare the attached files and highlight differences',
  'Find the exact section that answers this question',
];

export default function DashboardChatPage() {
  const {
    serverMessages,
    streamingMessage,
    attachments,
    loadingThread,
    sending,
    sendPhase,
    retryCount,
    composerError,
    canRetryLastMessage,
    chatQuota,
    runLocallyGuideUrl,
    sendMessage,
    retryLastMessage,
    clearComposerError,
    attachFile,
    removeAttachment,
  } = useChatWorkspace();

  const [query, setQuery] = useState('');
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

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
  const streamingLength = streamingMessage?.content.length || 0;

  useEffect(() => {
    const container = listRef.current;
    if (!container) {
      return;
    }

    const onScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setStickToBottom(distanceFromBottom < 96);
    };

    onScroll();
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!stickToBottom) {
      return;
    }

    const container = listRef.current;
    if (!container) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [serverMessages.length, streamingLength, stickToBottom]);

  const hasMessages = serverMessages.length > 0 || Boolean(streamingMessage);
  const quotaReached = Boolean(chatQuota && chatQuota.remaining <= 0);
  const isRetrying = sendPhase === 'retrying';
  const statusLabel =
    sendPhase === 'loading'
      ? 'Generating response'
      : isRetrying
        ? `Retrying connection${retryCount > 0 ? ` (attempt ${retryCount + 1})` : ''}`
        : null;

  return (
    <PageTransition>
      <div className="relative flex h-full min-h-0 flex-col">
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-36 pt-4 sm:px-5 lg:px-8">
          {loadingThread ? (
            <div className="mx-auto w-full max-w-[760px] space-y-3 pt-6">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-14 w-full animate-pulse rounded-md border border-[color:var(--line)] bg-[var(--panel-muted)]"
                />
              ))}
            </div>
          ) : hasMessages ? (
            <div className="mx-auto flex w-full max-w-[760px] flex-col">
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
                  <ChatBubble role="assistant" content={streamingMessage.content} streaming />
                ) : (
                  <div className="py-4">
                    <TypingIndicator label={isRetrying ? 'Retrying' : 'Thinking'} />
                  </div>
                )
              ) : null}
            </div>
          ) : (
            <div className="mx-auto flex h-full w-full max-w-[760px] flex-col items-center justify-center px-3 text-center">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
                Ask your documents anything.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
                Keep one focused thread with grounded responses and fast streaming output.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
                <div className="rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 text-[var(--muted)]">
                  {readyAttachments} ready
                </div>
                <div className="rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 text-[var(--muted)]">
                  {pendingAttachments} processing
                </div>
                {chatQuota ? (
                  <div className="rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 text-[var(--muted)]">
                    {chatQuota.remaining} remaining
                  </div>
                ) : null}
              </div>

              <div className="mt-8 flex w-full flex-col gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setQuery(prompt)}
                    className="mx-auto w-full max-w-[620px] rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-3 text-left text-sm text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--panel-muted)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 border-t border-[color:var(--line)] bg-[var(--panel)] px-4 py-3 sm:px-5 lg:px-8">
          <div className="pointer-events-auto mx-auto w-full max-w-[760px]">
            {statusLabel ? (
              <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 text-xs text-[var(--muted)]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--foreground)]" />
                {statusLabel}
              </div>
            ) : null}

            {composerError ? (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-md border border-[rgba(38,38,38,0.25)] bg-[rgba(38,38,38,0.06)] px-3 py-2 text-xs text-[var(--foreground)]">
                <span>{composerError}</span>
                <div className="flex items-center gap-2">
                  {canRetryLastMessage ? (
                    <button
                      type="button"
                      onClick={() => {
                        void retryLastMessage();
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-2 py-1 font-medium text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--panel-muted)]"
                    >
                      <RotateCcw size={12} />
                      Retry
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={clearComposerError}
                    className="rounded-md px-2 py-1 text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--panel-muted)] hover:text-[var(--foreground)]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : null}

            {pendingAttachments > 0 && readyAttachments === 0 ? (
              <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                <FileText size={12} />
                Processing attachments
              </div>
            ) : null}

            <ChatComposer
              value={query}
              onChange={setQuery}
              onSubmit={async () => {
                if (quotaReached) {
                  setQuotaModalOpen(true);
                  return;
                }

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
              disabled={quotaReached}
              loading={sending && sendPhase !== 'retrying'}
            />
          </div>
        </div>

        <Modal
          open={quotaModalOpen}
          title="Usage reached for today"
          description="You have used the available hosted usage for this workspace."
          confirmLabel="Run locally"
          cancelLabel="Close"
          onClose={() => setQuotaModalOpen(false)}
          onConfirm={() => window.open(runLocallyGuideUrl, '_blank', 'noopener,noreferrer')}
        >
          <div className="rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
            Run the project locally for uninterrupted usage with the same interface and full control.
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Lock, RotateCcw } from 'lucide-react';
import { ChatBubble } from '@/components/chat/chat-bubble';
import { ChatComposer } from '@/components/chat/chat-composer';
import { DocumentBubble } from '@/components/chat/document-bubble';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { Modal } from '@/components/ui/modal';
import { useChatWorkspace } from '@/hooks/use-chat-workspace';
import { PageTransition } from '@/components/common/page-transition';

const PROCESSING_MESSAGE = 'Processing your document... this will take a few seconds.';
const READY_MESSAGE = 'Your document is ready. Ask specific questions about it.';
const FAILED_MESSAGE = "I couldn't process that document. Remove it and upload another file.";

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

  const activeAttachments = useMemo(
    () => attachments.filter((attachment) => attachment.status !== 'failed'),
    [attachments],
  );

  const pendingAttachments = useMemo(
    () =>
      attachments.filter(
        (attachment) => attachment.status === 'uploading' || attachment.status === 'processing',
      ).length,
    [attachments],
  );
  const hasReadyDocument = activeAttachments.length === 1 && readyAttachments === 1 && pendingAttachments === 0;
  const hasMultipleActiveDocuments = activeAttachments.length > 1;
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

  const hasMessages = attachments.length > 0 || serverMessages.length > 0 || Boolean(streamingMessage);
  const quotaReached = Boolean(chatQuota && chatQuota.remaining <= 0);
  const isRetrying = sendPhase === 'retrying';
  const statusLabel =
    sendPhase === 'loading'
      ? 'Generating response'
      : isRetrying
        ? `Retrying connection${retryCount > 0 ? ` (attempt ${retryCount + 1})` : ''}`
        : null;
  const composerLockedMessage = quotaReached
    ? ''
    : hasMultipleActiveDocuments
      ? 'Keep one document attached to this chat to continue.'
      : pendingAttachments > 0
        ? 'Processing document...'
        : hasReadyDocument
          ? ''
          : 'Upload a document to begin.';
  const composerPlaceholder = hasReadyDocument
    ? 'Ask something about your document...'
    : pendingAttachments > 0
      ? 'Processing document...'
      : hasMultipleActiveDocuments
        ? 'Keep one document in this chat'
        : 'Upload a document to begin';
  const composerDisabled = quotaReached || !hasReadyDocument;
  const attachDisabled = quotaReached || activeAttachments.length >= 1;

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
              {attachments.map((attachment) => (
                <div key={attachment.id}>
                  <DocumentBubble
                    attachment={attachment}
                    onRemove={(documentId) => {
                      void removeAttachment(documentId);
                    }}
                  />

                  {(attachment.status === 'uploading' || attachment.status === 'processing') && (
                    <div>
                      <ChatBubble
                        role="assistant"
                        content={PROCESSING_MESSAGE}
                        timestamp={attachment.attached_at || attachment.created_at}
                      />
                      <div className="py-2">
                        <TypingIndicator label="Processing document" />
                      </div>
                    </div>
                  )}

                  {attachment.status === 'indexed' ? (
                    <ChatBubble
                      role="assistant"
                      content={READY_MESSAGE}
                      timestamp={attachment.indexed_at || attachment.attached_at || attachment.created_at}
                    />
                  ) : null}

                  {attachment.status === 'failed' ? (
                    <ChatBubble
                      role="assistant"
                      content={FAILED_MESSAGE}
                      timestamp={attachment.attached_at || attachment.created_at}
                    />
                  ) : null}
                </div>
              ))}

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
                Upload a document to begin.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
                Once it is ready, ask focused questions about a topic, section, or concept.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
                <div className="rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 text-[var(--muted)]">
                  One document per chat
                </div>
                <div className="rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 text-[var(--muted)]">
                  Ask specific follow-up questions
                </div>
                {chatQuota ? (
                  <div className="rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 text-[var(--muted)]">
                    {chatQuota.remaining} remaining
                  </div>
                ) : null}
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

            {composerLockedMessage ? (
              <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                <Lock size={12} />
                {composerLockedMessage}
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
              attachments={attachments}
              disabled={composerDisabled}
              attachDisabled={attachDisabled}
              loading={sending && sendPhase !== 'retrying'}
              placeholder={composerPlaceholder}
              maxAttachments={1}
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

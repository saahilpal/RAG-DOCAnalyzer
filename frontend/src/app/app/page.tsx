'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
          : 'Please upload a document to begin.';
  const composerPlaceholder = hasReadyDocument
    ? 'Ask something about your document...'
    : pendingAttachments > 0
      ? 'Processing document...'
      : hasMultipleActiveDocuments
        ? 'Keep one document in this chat'
        : 'Upload a document to begin';
  const composerDisabled = quotaReached || !hasReadyDocument;
  const attachDisabled = quotaReached || activeAttachments.length >= 1;
  const handleRemoveAttachment = useCallback(
    (documentId: string) => {
      void removeAttachment(documentId);
    },
    [removeAttachment],
  );

  const attachmentTimeline = useMemo(
    () =>
      attachments.map((attachment) => (
        <div key={attachment.id}>
          <DocumentBubble attachment={attachment} onRemove={handleRemoveAttachment} />

          {(attachment.status === 'uploading' || attachment.status === 'processing') && (
            <div>
              <ChatBubble
                role="assistant"
                content={PROCESSING_MESSAGE}
                timestamp={attachment.attached_at || attachment.created_at}
              />
              <div className="py-1.5">
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
      )),
    [attachments, handleRemoveAttachment],
  );

  const messageTimeline = useMemo(
    () =>
      serverMessages.map((message) => (
        <ChatBubble
          key={message.id}
          role={message.role}
          content={message.content}
          timestamp={message.created_at}
        />
      )),
    [serverMessages],
  );

  const streamingNode = useMemo(() => {
    if (!streamingMessage) {
      return null;
    }

    if (streamingMessage.content) {
      return <ChatBubble role="assistant" content={streamingMessage.content} streaming />;
    }

    return (
      <div className="py-2">
        <TypingIndicator label={isRetrying ? 'Retrying' : 'Thinking'} />
      </div>
    );
  }, [isRetrying, streamingMessage]);

  return (
    <PageTransition>
      <div className="relative flex h-full min-h-0 flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_24%)]">
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-36 pt-4 sm:px-6 lg:px-8">
          {loadingThread ? (
            <div className="mx-auto w-full max-w-[760px] space-y-3 pt-6">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-14 w-full animate-pulse rounded-[18px] bg-[rgba(255,255,255,0.48)]"
                />
              ))}
            </div>
          ) : hasMessages ? (
            <div className="mx-auto flex w-full max-w-[760px] flex-col gap-0.5">
              {attachmentTimeline}
              {messageTimeline}
              {streamingNode}
            </div>
          ) : (
            <div className="mx-auto flex h-full w-full max-w-[760px] flex-col items-center justify-center px-3 py-10 text-center">
              <div className="w-full rounded-[28px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.8)] px-6 py-8 shadow-[var(--shadow-soft)] sm:px-8 sm:py-10">
                <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  Document chat
                </div>
                <h1 className="font-display mt-5 text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl">
                  Upload a document to begin.
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                  The workspace is designed for one clear flow: upload a PDF, wait for processing, then ask focused
                  questions about the document.
                </p>

                <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
                  <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">1</p>
                    <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Upload a PDF</p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">2</p>
                    <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Let AI process it</p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">3</p>
                    <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Ask specific questions</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
                  <div className="rounded-full border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 text-[var(--muted)]">
                    One document per chat
                  </div>
                  <div className="rounded-full border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 text-[var(--muted)]">
                    Grounded follow-up answers
                  </div>
                  {chatQuota ? (
                    <div className="rounded-full border border-[color:var(--line)] bg-[var(--panel-strong)] px-3 py-1.5 text-[var(--muted)]">
                      {chatQuota.remaining} remaining today
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 border-t border-[rgba(24,24,27,0.08)] bg-[rgba(247,244,238,0.84)] px-4 py-2.5 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="pointer-events-auto mx-auto w-full max-w-[760px]">
            {statusLabel ? (
              <div className="mb-1.5 inline-flex items-center gap-2 rounded-[14px] bg-[rgba(255,255,255,0.66)] px-2.5 py-1 text-xs text-[var(--muted)]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--foreground)]" />
                {statusLabel}
              </div>
            ) : null}

            {composerError ? (
              <div className="mb-1.5 flex flex-col gap-2 rounded-[16px] bg-[rgba(255,255,255,0.66)] px-3 py-2.5 text-xs text-[var(--foreground)] sm:flex-row sm:items-center sm:justify-between">
                <span>{composerError}</span>
                <div className="flex items-center gap-2">
                  {canRetryLastMessage ? (
                    <button
                      type="button"
                      onClick={() => {
                        void retryLastMessage();
                      }}
                      className="inline-flex items-center gap-1 rounded-[12px] bg-[rgba(255,255,255,0.8)] px-2 py-1 font-medium text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--panel-muted)]"
                    >
                      <RotateCcw size={12} />
                      Retry
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={clearComposerError}
                    className="rounded-[12px] px-2 py-1 text-[var(--muted)] transition-colors duration-200 hover:bg-[var(--panel-muted)] hover:text-[var(--foreground)]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : null}

            {composerLockedMessage ? (
              <div className="mb-1.5 inline-flex flex-wrap items-center gap-2 rounded-[14px] bg-[rgba(255,255,255,0.64)] px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
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
          title="Daily usage limit reached"
          description="This hosted workspace has a small daily usage cap."
          cancelLabel="Close"
          onClose={() => setQuotaModalOpen(false)}
        >
          <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
            You have used the available messages for today. Please come back tomorrow to continue chatting with your
            document.
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}

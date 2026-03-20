'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Sparkles } from 'lucide-react';
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
    composerError,
    chatQuota,
    runLocallyGuideUrl,
    sendMessage,
    attachFile,
    removeAttachment,
  } = useChatWorkspace();

  const [query, setQuery] = useState('');
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
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

  useEffect(() => {
    if (chatQuota?.remaining === 0) {
      setQuotaModalOpen(true);
    }
  }, [chatQuota?.remaining]);

  const hasMessages = serverMessages.length > 0 || Boolean(streamingMessage);
  const quotaReached = Boolean(chatQuota && chatQuota.remaining <= 0);

  return (
    <PageTransition>
      <div className="relative flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-44 pt-6 sm:px-6 lg:px-10">
          {loadingThread ? (
            <div className="flex h-full items-center justify-center">
              <TypingIndicator />
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
                  <ChatBubble role="assistant" content={streamingMessage.content} />
                ) : (
                  <div className="flex justify-center px-4 py-6">
                    <div className="w-full max-w-[720px]">
                      <TypingIndicator />
                    </div>
                  </div>
                )
              ) : null}

              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="mx-auto flex h-full w-full max-w-[760px] flex-col items-center justify-center px-4 text-center">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="rounded-full border border-[color:var(--line)] bg-[var(--panel-strong)] p-4 shadow-[var(--shadow-panel)]"
              >
                <Sparkles size={24} className="text-[var(--accent)]" />
              </motion.div>

              <h1 className="font-display mt-8 text-4xl font-semibold tracking-tight text-[var(--foreground)] md:text-5xl">
                Ask your documents anything.
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-[var(--muted)]">
                Keep everything in one calm thread with grounded answers, attachments, and streaming responses.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
                <div className="rounded-full border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-2 text-[var(--muted)]">
                  {readyAttachments} ready
                </div>
                <div className="rounded-full border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-2 text-[var(--muted)]">
                  {pendingAttachments} processing
                </div>
                {chatQuota ? (
                  <div className="rounded-full border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-2 text-[var(--muted)]">
                    {chatQuota.remaining} remaining
                  </div>
                ) : null}
              </div>

              <div className="mt-10 flex w-full flex-col gap-3">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setQuery(prompt)}
                    className="mx-auto w-full max-w-[620px] rounded-[20px] border border-[color:var(--line)] bg-[var(--panel-strong)] px-5 py-4 text-left text-sm text-[var(--foreground)] shadow-[var(--shadow-panel)] transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-[linear-gradient(180deg,rgba(244,244,245,0),rgba(244,244,245,0.92)_24%,rgba(244,244,245,1)_100%)] px-4 pb-6 pt-16 sm:px-6 lg:px-10">
          <div className="pointer-events-auto mx-auto w-full max-w-[760px]">
            {composerError ? (
              <div className="mb-3 rounded-full border border-[rgba(153,27,27,0.2)] bg-[rgba(153,27,27,0.08)] px-4 py-2 text-sm text-[#7f1d1d]">
                {composerError}
              </div>
            ) : null}

            {pendingAttachments > 0 && readyAttachments === 0 ? (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
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
              loading={sending}
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
          <div className="rounded-[20px] border border-[color:var(--line)] bg-[var(--panel-strong)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
            Run the project locally for uninterrupted usage with the same interface and full control.
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}

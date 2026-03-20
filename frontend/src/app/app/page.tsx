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
  'Compare the attached PDFs and highlight differences',
  'Find the exact section that answers this question',
];

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
                className="rounded-full border border-[color:var(--line)] bg-[rgba(255,252,247,0.88)] p-4 shadow-[0_18px_40px_rgba(18,14,10,0.08)]"
              >
                <Sparkles size={24} className="text-[var(--accent)]" />
              </motion.div>

              <h1 className="font-display mt-8 text-4xl font-semibold tracking-tight text-[var(--foreground)] md:text-5xl">
                Chat with your documents.
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-[var(--muted)]">
                Ask follow-ups naturally, attach up to {workspaceLimits?.maxDocsPerChat || 3} PDFs, and get fast,
                streaming answers in one conversation.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
                <div className="rounded-full border border-[color:var(--line)] bg-[rgba(255,252,247,0.9)] px-4 py-2 text-[var(--muted)]">
                  {readyAttachments} ready
                </div>
                <div className="rounded-full border border-[color:var(--line)] bg-[rgba(255,252,247,0.9)] px-4 py-2 text-[var(--muted)]">
                  {pendingAttachments} processing
                </div>
                {chatQuota ? (
                  <div className="rounded-full border border-[color:var(--line)] bg-[rgba(255,252,247,0.9)] px-4 py-2 text-[var(--muted)]">
                    {chatQuota.remaining} replies left
                  </div>
                ) : null}
              </div>

              <div className="mt-10 flex w-full flex-col gap-3">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setQuery(prompt)}
                    className="mx-auto w-full max-w-[620px] rounded-[24px] border border-[color:var(--line)] bg-[rgba(255,252,247,0.84)] px-5 py-4 text-left text-sm text-[var(--foreground)] shadow-[0_10px_24px_rgba(18,14,10,0.06)] transition hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.96)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-[linear-gradient(180deg,rgba(243,237,226,0),rgba(243,237,226,0.92)_24%,rgba(243,237,226,1)_100%)] px-4 pb-6 pt-16 sm:px-6 lg:px-10">
          <div className="pointer-events-auto mx-auto w-full max-w-[760px]">
            {composerError ? (
              <div className="mb-3 rounded-full border border-[rgba(143,45,18,0.12)] bg-[rgba(143,45,18,0.06)] px-4 py-2 text-sm text-[#7d2a12]">
                {composerError}
              </div>
            ) : null}

            {pendingAttachments > 0 && readyAttachments === 0 ? (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[rgba(255,252,247,0.88)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
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
              maxAttachments={workspaceLimits?.maxDocsPerChat || 3}
            />
          </div>
        </div>

        <Modal
          open={quotaModalOpen}
          title="Daily quota reached"
          description="You have used all replies for this hosted workspace today."
          confirmLabel="Continue locally"
          cancelLabel="Close"
          onClose={() => setQuotaModalOpen(false)}
          onConfirm={() => window.open(runLocallyGuideUrl, '_blank', 'noopener,noreferrer')}
        >
          <div className="rounded-[24px] border border-[color:var(--line)] bg-[rgba(255,252,247,0.92)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
            Run the project locally for unlimited conversations with the same UI and your own API keys.
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}

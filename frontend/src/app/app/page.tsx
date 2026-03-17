'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, FileUp, Trash2 } from 'lucide-react';
import { listMessages, streamChat, type ChatStreamEvent, type MessageRecord } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ChatBubble } from '@/components/chat/chat-bubble';
import { ChatInput } from '@/components/chat/chat-input';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { useAppData } from '@/hooks/use-app-data';
import { formatDate } from '@/lib/format';
import { PageTransition } from '@/components/common/page-transition';

function statusFromDocument(indexingStatus: 'processing' | 'indexed' | 'error') {
  if (indexingStatus === 'error') {
    return 'Error';
  }

  if (indexingStatus === 'processing') {
    return 'Processing';
  }

  return 'Indexed';
}

function trimPreview(text: string) {
  if (text.length <= 340) {
    return text;
  }
  return `${text.slice(0, 337)}...`;
}

export default function DashboardChatPage() {
  const {
    documents,
    sessions,
    selectedDocumentId,
    activeSessionId,
    loadingDocuments,
    loadingSessions,
    demoLimits,
    demoMessage,
    retrievalMode,
    chatQuota,
    setSelectedDocumentId,
    setActiveSessionId,
    refreshSessions,
    refreshChatQuota,
    uploadDocumentFile,
    removeDocument,
  } = useAppData();

  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [query, setQuery] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [responseMeta, setResponseMeta] = useState<{
    fallbackUsed: boolean;
    cached: boolean;
    aiErrorCode: string | null;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesBottomRef = useRef<HTMLDivElement | null>(null);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) || null,
    [documents, selectedDocumentId],
  );

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [activeSessionId, sessions],
  );

  const previewText = useMemo(() => {
    if (selectedDocument?.text_preview) {
      return trimPreview(selectedDocument.text_preview);
    }

    const assistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');
    if (assistantMessage?.content) {
      return trimPreview(assistantMessage.content);
    }

    if (activeSession?.last_message) {
      return trimPreview(activeSession.last_message);
    }

    return 'Ask a question to generate a context-aware response preview.';
  }, [activeSession?.last_message, messages, selectedDocument?.text_preview]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    listMessages(activeSessionId)
      .then((data) => setMessages(data.messages))
      .catch((loadError) => {
        if (loadError instanceof Error) {
          setError(loadError.message);
        }
      });
  }, [activeSessionId]);

  useEffect(() => {
    messagesBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  async function onSendMessage() {
    if (!selectedDocumentId || !query.trim() || streaming) {
      return;
    }

    const currentQuery = query.trim();
    setQuery('');
    setError('');
    setStreaming(true);
    setResponseMeta(null);

    const userMessage: MessageRecord = {
      id: `temp-user-${Date.now()}`,
      session_id: activeSessionId || 'pending',
      role: 'user',
      content: currentQuery,
      created_at: new Date().toISOString(),
    };

    const assistantMessage: MessageRecord = {
      id: `temp-assistant-${Date.now()}`,
      session_id: activeSessionId || 'pending',
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      fallback_used: false,
    };

    setMessages((previous) => [...previous, userMessage, assistantMessage]);

    let resolvedSessionId = activeSessionId || undefined;

    try {
      await streamChat(
        {
          sessionId: resolvedSessionId,
          documentId: selectedDocumentId,
          query: currentQuery,
        },
        async (event: ChatStreamEvent) => {
          if (event.type === 'session') {
            resolvedSessionId = event.data.sessionId;
            setActiveSessionId(event.data.sessionId);
            return;
          }

          if (event.type === 'token') {
            setMessages((previous) =>
              previous.map((message) =>
                message.id === assistantMessage.id
                  ? {
                      ...message,
                      content: message.content + (event.data.text || ''),
                    }
                  : message,
              ),
            );
            return;
          }

          if (event.type === 'done') {
            setResponseMeta({
              fallbackUsed: Boolean(event.data.fallback_used),
              cached: Boolean(event.data.cached),
              aiErrorCode: event.data.ai_error_code || null,
            });

            await refreshSessions(selectedDocumentId);
            await refreshChatQuota();

            if (resolvedSessionId) {
              const finalMessages = await listMessages(resolvedSessionId);
              setMessages(finalMessages.messages);
            }
          }
        },
      );
    } catch (streamError) {
      if (streamError instanceof Error) {
        setError(streamError.message);
      } else {
        setError('Failed to stream response.');
      }
    } finally {
      setStreaming(false);
    }
  }

  async function handleUpload(file: File) {
    setError('');
    setUploading(true);
    setUploadProgress(0);

    try {
      await uploadDocumentFile(file, (progress) => setUploadProgress(progress));
    } catch (uploadError) {
      if (uploadError instanceof Error) {
        setError(uploadError.message);
      } else {
        setError('Upload failed.');
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <PageTransition>
      <div className="grid min-h-full gap-3 md:gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="border-b border-neutral-200 px-4 py-4 sm:px-5">
            <div className="mb-3 rounded-xl border border-neutral-200 bg-neutral-100 px-3 py-2 text-xs text-neutral-700">
              {demoMessage}{' '}
              {demoLimits ? (
                <span className="font-medium">
                  {demoLimits.maxFileSizeMb}MB max file • {demoLimits.maxChatRequestsPerDay} questions/day •{' '}
                  {demoLimits.maxDocsPerUser} docs/user
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Workspace Chat</h1>
                <p className="mt-1 text-sm text-neutral-600">Upload document → Ask AI questions → Get answers.</p>
              </div>

              <div className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[220px]">
                <select
                  value={selectedDocumentId || ''}
                  onChange={(event) => {
                    setSelectedDocumentId(event.target.value || null);
                    setActiveSessionId(null);
                    setMessages([]);
                  }}
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-800 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                >
                  {documents.length === 0 ? <option value="">No documents</option> : null}
                  {documents.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.file_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="muted">Mode: {retrievalMode || 'fts'}</Badge>
              {chatQuota ? (
                <Badge tone="muted">
                  Daily usage: {chatQuota.used}/{chatQuota.limit}
                </Badge>
              ) : null}
            </div>

            {responseMeta?.fallbackUsed ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
                <AlertCircle size={16} className="mt-0.5" />
                <div>
                  Fallback response used due to AI limits.
                  {responseMeta.aiErrorCode ? (
                    <span className="ml-1 font-medium">({responseMeta.aiErrorCode})</span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {error ? <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700">{error}</p> : null}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-neutral-50 px-4 py-5 sm:px-5">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-8 text-center text-sm text-neutral-500">
                Start a new conversation by asking a question about your selected document.
              </div>
            ) : (
              messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  fallbackUsed={Boolean(message.fallback_used)}
                  timestamp={message.created_at}
                />
              ))
            )}

            {streaming ? <TypingIndicator /> : null}
            <div ref={messagesBottomRef} />
          </div>

          <div className="border-t border-neutral-200 px-4 py-4 sm:px-5">
            <ChatInput
              value={query}
              disabled={!selectedDocument || streaming || Boolean(chatQuota && chatQuota.remaining <= 0)}
              loading={streaming}
              maxLength={4000}
              onChange={setQuery}
              onSubmit={onSendMessage}
            />
          </div>
        </Card>

        <motion.aside
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22 }}
          className="space-y-3 md:space-y-4"
        >
          <Card className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-neutral-500">Document Panel</h2>

            {selectedDocument ? (
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="font-medium text-neutral-900">{selectedDocument.file_name}</p>
                  <p className="mt-1 text-neutral-500">Uploaded {formatDate(selectedDocument.created_at)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      selectedDocument.indexing_status === 'indexed'
                        ? 'default'
                        : selectedDocument.indexing_status === 'error'
                          ? 'danger'
                          : 'muted'
                    }
                  >
                    {statusFromDocument(selectedDocument.indexing_status)}
                  </Badge>
                  <span className="text-neutral-500">
                    {selectedDocument.page_count} pages • {selectedDocument.chunk_count} chunks
                  </span>
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.08em] text-neutral-500">Extracted preview</p>
                  <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-neutral-600">
                    {previewText}
                  </p>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    className="w-full justify-center"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <FileUp size={16} />
                    {uploading ? `Uploading ${uploadProgress}%` : 'Upload new document'}
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-center text-neutral-700"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    <Trash2 size={16} />
                    Delete document
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-neutral-300 px-3 py-6 text-center text-sm text-neutral-500">
                No document selected.
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="application/pdf"
              onChange={async (event) => {
                const file = event.target.files?.[0] || null;
                if (file) {
                  const maxFileSizeMb = demoLimits?.maxFileSizeMb || 10;
                  const maxBytes = maxFileSizeMb * 1024 * 1024;

                  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                    setError('Only PDF files are supported.');
                  } else if (file.size > maxBytes) {
                    setError(`File exceeds ${maxFileSizeMb}MB demo limit.`);
                  } else {
                    await handleUpload(file);
                  }
                }
                event.target.value = '';
              }}
            />
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-neutral-500">Workspace Health</h3>
            <div className="mt-3 space-y-2 text-sm text-neutral-600">
              <p>{loadingDocuments ? 'Refreshing documents...' : `${documents.length} document(s) loaded`}</p>
              <p>{loadingSessions ? 'Refreshing sessions...' : `${sessions.length} session(s) available`}</p>
              {chatQuota ? <p>{chatQuota.remaining} chat request(s) remaining today</p> : null}
            </div>
          </Card>
        </motion.aside>
      </div>

      <Modal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Delete selected document?"
        description="This removes all indexed chunks and chat sessions linked to the document."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!selectedDocument) {
            return;
          }
          await removeDocument(selectedDocument.id);
          setConfirmDeleteOpen(false);
          setMessages([]);
        }}
      />
    </PageTransition>
  );
}

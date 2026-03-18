'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, FileUp, Trash2, MessageSquare } from 'lucide-react';
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
import { cn } from '@/lib/cn';
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
    if (activeSession) {
      if (activeSession.document_id !== selectedDocumentId) {
        setSelectedDocumentId(activeSession.document_id);
      }
    }
  }, [activeSession, selectedDocumentId, setSelectedDocumentId]);

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
    const currentQuery = query.trim();
    if (!currentQuery || streaming) {
      return;
    }

    // Step 2 & 3: Fix Chat Behavior & API Integration
    if (!selectedDocumentId) {
      const assistantGreeting: MessageRecord = {
        id: `temp-assistant-${Date.now()}`,
        session_id: 'no-doc',
        role: 'assistant',
        content: "Hey 👋 Please upload a document first so I can help you.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, {
        id: `temp-user-${Date.now()}`,
        session_id: 'no-doc',
        role: 'user',
        content: currentQuery,
        created_at: new Date().toISOString()
      }, assistantGreeting]);
      setQuery('');
      return;
    }

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
    let hasReceivedTokens = false;

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
            hasReceivedTokens = true;
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
            if (!hasReceivedTokens) {
               setMessages((previous) =>
                previous.map((message) =>
                  message.id === assistantMessage.id
                    ? {
                        ...message,
                        content: "No relevant content found in this document",
                      }
                    : message,
                ),
              );
            }

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
        setError(streamError.message || 'Something went wrong. Please try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      setMessages((prev) => prev.filter(m => m.id !== assistantMessage.id));
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
      
      const successMessage: MessageRecord = {
        id: `temp-assistant-${Date.now()}`,
        session_id: activeSessionId || 'pending',
        role: 'assistant',
        content: "✅ Document uploaded successfully. You can now ask questions.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, successMessage]);

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
      <div className="flex h-[calc(100vh-80px)] lg:h-[calc(100vh-48px)] flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-4">
        <div className="flex flex-col min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {/* Mobile Header / Quick Select */}
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="truncate text-sm font-bold tracking-tight text-neutral-900">
                {selectedDocument ? selectedDocument.file_name : 'Select Document'}
              </h1>
              {selectedDocument && (
                <Badge tone="muted" className="shrink-0 text-[10px]">
                  {selectedDocument.page_count}p • {selectedDocument.chunk_count}c
                </Badge>
              )}
            </div>

            <select
              value={selectedDocumentId || ''}
              onChange={(event) => {
                setSelectedDocumentId(event.target.value || null);
                setActiveSessionId(null);
                setMessages([]);
              }}
              className="h-8 w-40 rounded-lg border border-neutral-200 bg-white px-2 text-xs text-neutral-800 outline-none focus:border-neutral-400 sm:w-56"
            >
              <option value="">Choose document...</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.file_name}
                </option>
              ))}
            </select>
          </div>

          {/* Messages Area */}
          <div className={cn("flex-1 overflow-y-auto px-4 sm:px-8", messages.length === 0 ? "flex items-center justify-center bg-white" : "bg-neutral-50/50 py-6")}>
            <div className="mx-auto w-full max-w-3xl space-y-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto text-center">
                  <div className="mb-6 rounded-2xl bg-neutral-100 p-5">
                    <MessageSquare className="h-10 w-10 text-neutral-500" />
                  </div>
                  <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
                    Upload a document to start
                  </h2>
                  <p className="mb-8 text-sm text-neutral-500">
                    Get started by uploading a PDF document. Your sessions are securely bound to the document context.
                  </p>
                  
                  <div className="w-full relative shadow-sm rounded-2xl">
                    <ChatInput
                      value={query}
                      disabled={streaming || Boolean(chatQuota && chatQuota.remaining <= 0)}
                      loading={streaming}
                      maxLength={4000}
                      onChange={setQuery}
                      onSubmit={onSendMessage}
                      onUploadClick={() => fileInputRef.current?.click()}
                    />
                    {error && (
                      <p className="absolute -bottom-6 left-0 right-0 text-center text-xs font-medium text-red-500">
                        {error}
                      </p>
                    )}
                  </div>
                  
                  {uploading && (
                    <div className="mt-8 w-full max-w-md">
                      <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                        <div className="h-full bg-neutral-900 transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-neutral-500 font-medium">{uploadProgress}% uploading...</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <ChatBubble
                      key={message.id}
                      role={message.role}
                      content={message.content}
                      timestamp={message.created_at}
                    />
                  ))}
                  {streaming ? <TypingIndicator /> : null}
                  <div ref={messagesBottomRef} className="h-4" />
                </>
              )}
            </div>
          </div>

          {/* Input Area */}
          {messages.length > 0 && (
            <div className="border-t border-neutral-200 bg-white px-4 py-4 sm:px-8 md:pb-6">
              <div className="mx-auto max-w-3xl">
                <ChatInput
                  value={query}
                  disabled={streaming || Boolean(chatQuota && chatQuota.remaining <= 0)}
                  loading={streaming}
                  maxLength={4000}
                  onChange={setQuery}
                  onSubmit={onSendMessage}
                  onUploadClick={() => fileInputRef.current?.click()}
                />
                {error && (
                  <p className="mt-2 text-center text-xs font-medium text-red-500 animate-in fade-in slide-in-from-bottom-1">
                    {error}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info - Desktop (Removed for recovery cleanliness) */}
        {/* <motion.aside ... /> */}

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
              if (file.size > maxBytes) {
                setError(`File exceeds ${maxFileSizeMb}MB demo limit.`);
              } else {
                await handleUpload(file);
              }
            }
            event.target.value = '';
          }}
        />
      </div>

      <Modal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Delete context?"
        description="All indexed chunks and linked sessions will be removed."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!selectedDocument) return;
          await removeDocument(selectedDocument.id);
          setConfirmDeleteOpen(false);
          setMessages([]);
        }}
      />
    </PageTransition>
  );
}

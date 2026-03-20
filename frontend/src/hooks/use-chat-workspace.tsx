'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createChat,
  deleteChat as deleteChatRequest,
  getChatQuota,
  getReadyHealth,
  getWorkspaceLimits,
  isAbortError,
  listChatDocuments,
  listChats,
  listMessages,
  removeChatDocument,
  streamChatMessage,
  updateChat as updateChatRequest,
  uploadDocumentToChat,
  type ChatDocumentRecord,
  type ChatRecord,
  type MessageRecord,
  type WorkspaceLimits,
} from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

export type AttachmentChip = ChatDocumentRecord & {
  isTemp?: boolean;
  progress?: number;
};

export type WorkspaceChatRecord = ChatRecord & {
  originalTitle: string;
  isPinned: boolean;
};

type StreamingMessage = {
  role: 'assistant';
  content: string;
};

type ChatWorkspaceContextValue = {
  chats: WorkspaceChatRecord[];
  activeChatId: string | null;
  activeChat: WorkspaceChatRecord | null;
  serverMessages: MessageRecord[];
  streamingMessage: StreamingMessage | null;
  attachments: AttachmentChip[];
  loadingChats: boolean;
  loadingThread: boolean;
  sending: boolean;
  composerError: string;
  chatQuota: { used: number; remaining: number; limit: number } | null;
  workspaceLimits: WorkspaceLimits | null;
  workspaceMessage: string;
  retrievalMode: 'fts' | 'vector' | null;
  modelName: string | null;
  repositoryUrl: string;
  runLocallyGuideUrl: string;
  readyStatus: { database: boolean; ai: boolean; checked: boolean };
  createNewChat: () => Promise<string>;
  selectChat: (chatId: string) => Promise<void>;
  renameChat: (chatId: string, title: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  togglePinnedChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  attachFile: (file: File) => Promise<void>;
  removeAttachment: (documentId: string) => Promise<void>;
  refreshChats: () => Promise<void>;
};

const ChatWorkspaceContext = createContext<ChatWorkspaceContextValue | null>(null);

const DEFAULT_REPOSITORY_URL = 'https://github.com/saahilpal/RAG-DOCAnalyzer';

function createTempAttachment(file: File): AttachmentChip {
  const now = new Date().toISOString();

  return {
    id: `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    file_name: file.name,
    file_url: '',
    status: 'uploading',
    page_count: 0,
    chunk_count: 0,
    last_error: null,
    created_at: now,
    indexed_at: null,
    attached_at: now,
    isTemp: true,
    progress: 0,
  };
}

function randomClientMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ChatWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [serverChats, setServerChats] = useState<ChatRecord[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [serverMessages, setServerMessages] = useState<MessageRecord[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [attachments, setAttachments] = useState<AttachmentChip[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [composerError, setComposerError] = useState('');

  const [workspaceLimits, setWorkspaceLimits] = useState<WorkspaceLimits | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState(
    'Chat-first RAG workspace with lightweight attachments and predictable operating limits.',
  );
  const [retrievalMode, setRetrievalMode] = useState<'fts' | 'vector' | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
  const [repositoryUrl, setRepositoryUrl] = useState(DEFAULT_REPOSITORY_URL);
  const [runLocallyGuideUrl, setRunLocallyGuideUrl] = useState(`${DEFAULT_REPOSITORY_URL}#quick-start`);
  const [readyStatus, setReadyStatus] = useState({ database: false, ai: false, checked: false });
  const [chatQuota, setChatQuota] = useState<{ used: number; remaining: number; limit: number } | null>(null);

  const activeLoadTokenRef = useRef(0);
  const activeLoadAbortRef = useRef<AbortController | null>(null);
  const activeStreamAbortRef = useRef<AbortController | null>(null);
  const activeChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const refreshChats = useCallback(async () => {
    if (!user) {
      setServerChats([]);
      setActiveChatId(null);
      setServerMessages([]);
      setStreamingMessage(null);
      setAttachments([]);
      return;
    }

    setLoadingChats(true);

    try {
      const data = await listChats();
      setServerChats(data.chats);

      setActiveChatId((current) => {
        if (current && data.chats.some((chat) => chat.id === current)) {
          return current;
        }

        return data.chats[0]?.id || null;
      });
    } finally {
      setLoadingChats(false);
    }
  }, [user]);

  const refreshChatQuota = useCallback(async () => {
    if (!user) {
      setChatQuota(null);
      return;
    }

    try {
      const data = await getChatQuota();
      setChatQuota(data.quota);
    } catch {
      setChatQuota(null);
    }
  }, [user]);

  const refreshHealthAndLimits = useCallback(async () => {
    const [limitsResult, readyResult] = await Promise.allSettled([getWorkspaceLimits(), getReadyHealth()]);

    if (limitsResult.status === 'fulfilled') {
      setWorkspaceLimits(limitsResult.value.limits);
      setWorkspaceMessage(limitsResult.value.philosophy);
      setRetrievalMode(limitsResult.value.retrievalMode);
      setModelName(limitsResult.value.model || null);
      setRepositoryUrl(limitsResult.value.links.githubRepositoryUrl || DEFAULT_REPOSITORY_URL);
      setRunLocallyGuideUrl(
        limitsResult.value.links.runLocallyGuideUrl || `${DEFAULT_REPOSITORY_URL}#quick-start`,
      );
    }

    if (readyResult.status === 'fulfilled') {
      setReadyStatus({
        database: readyResult.value.database,
        ai: readyResult.value.ai,
        checked: true,
      });
    } else {
      setReadyStatus({
        database: false,
        ai: false,
        checked: true,
      });
    }
  }, []);

  const loadThread = useCallback(
    async (chatId: string) => {
      if (!user) {
        setServerMessages([]);
        setAttachments([]);
        return;
      }

      const token = activeLoadTokenRef.current + 1;
      activeLoadAbortRef.current?.abort();
      const controller = new AbortController();
      activeLoadAbortRef.current = controller;
      activeLoadTokenRef.current = token;
      setLoadingThread(true);
      setComposerError('');

      try {
        const [messageData, documentData] = await Promise.all([
          listMessages(chatId, 200, controller.signal),
          listChatDocuments(chatId, controller.signal),
        ]);

        if (token !== activeLoadTokenRef.current || activeChatIdRef.current !== chatId) {
          return;
        }

        setServerMessages(messageData.messages);
        setAttachments((current) => {
          const tempFailures = current.filter((document) => document.isTemp && document.status === 'failed');
          return [...documentData.documents, ...tempFailures];
        });
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        if (token !== activeLoadTokenRef.current || activeChatIdRef.current !== chatId) {
          return;
        }

        setServerMessages([]);
        setAttachments([]);
        setComposerError(error instanceof Error ? error.message : 'Failed to load chat.');
      } finally {
        if (activeLoadAbortRef.current === controller) {
          activeLoadAbortRef.current = null;
        }

        if (token === activeLoadTokenRef.current) {
          setLoadingThread(false);
        }
      }
    },
    [user],
  );

  const createNewChat = useCallback(async () => {
    const data = await createChat();
    setServerChats((current) => [data.chat, ...current.filter((chat) => chat.id !== data.chat.id)]);
    setActiveChatId(data.chat.id);
    setServerMessages([]);
    setStreamingMessage(null);
    setAttachments([]);
    setComposerError('');
    return data.chat.id;
  }, []);

  const selectChat = useCallback(async (chatId: string) => {
    if (activeStreamAbortRef.current) {
      activeStreamAbortRef.current.abort();
      activeStreamAbortRef.current = null;
    }
    if (activeLoadAbortRef.current) {
      activeLoadAbortRef.current.abort();
      activeLoadAbortRef.current = null;
    }

    setStreamingMessage(null);
    setSending(false);
    setComposerError('');
    setActiveChatId(chatId);
  }, []);

  const ensureActiveChat = useCallback(async () => {
    if (activeChatIdRef.current) {
      return activeChatIdRef.current;
    }

    return createNewChat();
  }, [createNewChat]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) {
        return;
      }

      const chatId = await ensureActiveChat();
      const clientMessageId = randomClientMessageId();
      const optimisticMessageId = `temp-${clientMessageId}`;
      let metaReceived = false;

      setComposerError('');
      setSending(true);
      setServerMessages((current) => [
        ...current,
        {
          id: optimisticMessageId,
          chat_id: chatId,
          role: 'user',
          content: trimmed,
          client_message_id: clientMessageId,
          created_at: new Date().toISOString(),
        },
      ]);
      setStreamingMessage({ role: 'assistant', content: '' });

      const controller = new AbortController();
      activeStreamAbortRef.current = controller;

      try {
        await streamChatMessage(
          chatId,
          { content: trimmed, clientMessageId },
          async (event) => {
            if (event.type === 'chat.meta') {
              metaReceived = true;
              setServerMessages((current) =>
                current.map((message) =>
                  message.id === optimisticMessageId
                    ? {
                        ...message,
                        id: event.data.userMessageId,
                        chat_id: event.data.chatId,
                      }
                    : message,
                ),
              );
              return;
            }

            if (event.type === 'assistant.delta') {
              setStreamingMessage((current) => ({
                role: 'assistant',
                content: `${current?.content || ''}${event.data.text || ''}`,
              }));
              return;
            }

            if (event.type === 'assistant.completed') {
              setStreamingMessage(null);
              setServerMessages((current) => [...current, event.data.assistantMessage]);
              setChatQuota(event.data.quota);
              await refreshChats();
            }
          },
          controller.signal,
        );
      } catch (error) {
        if (!isAbortError(error)) {
          setComposerError(error instanceof Error ? error.message : 'Failed to send message.');
        }

        setStreamingMessage(null);

        if (!metaReceived) {
          setServerMessages((current) => current.filter((message) => message.id !== optimisticMessageId));
        }
      } finally {
        if (activeStreamAbortRef.current === controller) {
          activeStreamAbortRef.current = null;
        }

        setSending(false);
      }
    },
    [ensureActiveChat, refreshChats],
  );

  const attachFile = useCallback(
    async (file: File) => {
      const chatId = await ensureActiveChat();
      const tempAttachment = createTempAttachment(file);

      setComposerError('');
      setAttachments((current) => [...current, tempAttachment]);

      try {
        const data = await uploadDocumentToChat(chatId, file, (progress) => {
          setAttachments((current) =>
            current.map((document) =>
              document.id === tempAttachment.id
                ? {
                    ...document,
                    progress,
                    status: 'uploading',
                  }
                : document,
            ),
          );
        });

        setAttachments((current) =>
          current.map((document) =>
            document.id === tempAttachment.id
              ? {
                  ...data.document,
                  isTemp: false,
                }
              : document,
          ),
        );

        await refreshChats();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed.';

        setComposerError(message);
        setAttachments((current) =>
          current.map((document) =>
            document.id === tempAttachment.id
              ? {
                  ...document,
                  status: 'failed',
                  last_error: message,
                  progress: undefined,
                }
              : document,
          ),
        );
      }
    },
    [ensureActiveChat, refreshChats],
  );

  const removeAttachment = useCallback(
    async (documentId: string) => {
      if (!activeChatIdRef.current) {
        return;
      }

      const target = attachments.find((document) => document.id === documentId);

      if (target?.isTemp) {
        setAttachments((current) => current.filter((document) => document.id !== documentId));
        return;
      }

      await removeChatDocument(activeChatIdRef.current, documentId);
      setAttachments((current) => current.filter((document) => document.id !== documentId));
      await refreshChats();
    },
    [attachments, refreshChats],
  );

  const renameChat = useCallback(async (chatId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    const data = await updateChatRequest(chatId, { title: trimmed });
    setServerChats((current) => current.map((chat) => (chat.id === chatId ? { ...chat, ...data.chat } : chat)));
  }, []);

  const togglePinnedChat = useCallback(
    async (chatId: string) => {
      const chat = serverChats.find((entry) => entry.id === chatId);
      if (!chat) {
        return;
      }

      const data = await updateChatRequest(chatId, { pinned: !chat.pinned });
      setServerChats((current) => current.map((entry) => (entry.id === chatId ? { ...entry, ...data.chat } : entry)));
    },
    [serverChats],
  );

  const deleteChat = useCallback(async (chatId: string) => {
    await deleteChatRequest(chatId);

    setServerChats((current) => current.filter((chat) => chat.id !== chatId));
    if (activeChatIdRef.current === chatId) {
      setActiveChatId((current) => (current === chatId ? null : current));
      setServerMessages([]);
      setStreamingMessage(null);
      setAttachments((current) => current.filter((document) => document.isTemp && document.status === 'failed'));
    }
  }, []);

  useEffect(() => {
    refreshChats().catch(() => {
      setServerChats([]);
      setActiveChatId(null);
      setServerMessages([]);
      setStreamingMessage(null);
      setAttachments([]);
    });
  }, [refreshChats]);

  useEffect(() => {
    refreshHealthAndLimits().catch(() => {
      setReadyStatus({ database: false, ai: false, checked: true });
    });
    refreshChatQuota().catch(() => {
      setChatQuota(null);
    });
  }, [refreshChatQuota, refreshHealthAndLimits]);

  useEffect(() => {
    if (!activeChatId) {
      setServerMessages([]);
      setStreamingMessage(null);
      setAttachments((current) => current.filter((document) => document.isTemp && document.status === 'failed'));
      return;
    }

    loadThread(activeChatId).catch(() => {
      setServerMessages([]);
      setAttachments([]);
    });
  }, [activeChatId, loadThread]);

  useEffect(() => {
    if (!activeChatId) {
      return;
    }

    const hasPendingDocuments = attachments.some(
      (document) => !document.isTemp && (document.status === 'uploading' || document.status === 'processing'),
    );

    if (!hasPendingDocuments) {
      return;
    }

    const interval = setInterval(() => {
      listChatDocuments(activeChatId)
        .then((data) => {
          if (activeChatIdRef.current !== activeChatId) {
            return;
          }

          setAttachments((current) => {
            const tempFailures = current.filter((document) => document.isTemp && document.status === 'failed');
            return [...data.documents, ...tempFailures];
          });
          refreshChats().catch(() => {});
        })
        .catch(() => {});
    }, 2_000);

    return () => {
      clearInterval(interval);
    };
  }, [activeChatId, attachments, refreshChats]);

  useEffect(() => {
    return () => {
      activeLoadAbortRef.current?.abort();
      activeStreamAbortRef.current?.abort();
    };
  }, []);

  const chats = useMemo<WorkspaceChatRecord[]>(() => {
    return serverChats
      .map((chat) => ({
        ...chat,
        originalTitle: chat.title,
        isPinned: Boolean(chat.pinned),
      }))
      .sort((left, right) => {
        if (left.isPinned !== right.isPinned) {
          return left.isPinned ? -1 : 1;
        }

        return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
      });
  }, [serverChats]);

  useEffect(() => {
    if (chats.length === 0) {
      if (activeChatId) {
        setActiveChatId(null);
      }
      return;
    }

    if (!activeChatId || !chats.some((chat) => chat.id === activeChatId)) {
      setActiveChatId(chats[0].id);
    }
  }, [activeChatId, chats]);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) || null,
    [activeChatId, chats],
  );

  const value = useMemo<ChatWorkspaceContextValue>(
    () => ({
      chats,
      activeChatId,
      activeChat,
      serverMessages,
      streamingMessage,
      attachments,
      loadingChats,
      loadingThread,
      sending,
      composerError,
      chatQuota,
      workspaceLimits,
      workspaceMessage,
      retrievalMode,
      modelName,
      repositoryUrl,
      runLocallyGuideUrl,
      readyStatus,
      createNewChat,
      selectChat,
      renameChat,
      deleteChat,
      togglePinnedChat,
      sendMessage,
      attachFile,
      removeAttachment,
      refreshChats,
    }),
    [
      activeChat,
      activeChatId,
      attachments,
      attachFile,
      chatQuota,
      chats,
      composerError,
      createNewChat,
      deleteChat,
      loadingChats,
      loadingThread,
      modelName,
      refreshChats,
      readyStatus,
      removeAttachment,
      renameChat,
      repositoryUrl,
      retrievalMode,
      runLocallyGuideUrl,
      selectChat,
      sendMessage,
      sending,
      serverMessages,
      streamingMessage,
      togglePinnedChat,
      workspaceLimits,
      workspaceMessage,
    ],
  );

  return <ChatWorkspaceContext.Provider value={value}>{children}</ChatWorkspaceContext.Provider>;
}

export function useChatWorkspace() {
  const context = useContext(ChatWorkspaceContext);

  if (!context) {
    throw new Error('useChatWorkspace must be used within ChatWorkspaceProvider.');
  }

  return context;
}

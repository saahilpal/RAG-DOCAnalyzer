import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatWorkspaceProvider, useChatWorkspace } from '@/hooks/use-chat-workspace';

const apiMocks = vi.hoisted(() => ({
  listChats: vi.fn(),
  createChat: vi.fn(),
  updateChat: vi.fn(),
  deleteChat: vi.fn(),
  listMessages: vi.fn(),
  listChatDocuments: vi.fn(),
  streamChatMessage: vi.fn(),
  uploadDocumentToChat: vi.fn(),
  removeChatDocument: vi.fn(),
  getChatQuota: vi.fn(),
  getWorkspaceLimits: vi.fn(),
  getReadyHealth: vi.fn(),
  isAbortError: vi.fn((error: unknown) => error instanceof DOMException && error.name === 'AbortError'),
}));

const authState = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'user@example.com', created_at: new Date().toISOString() },
  loading: false,
}));

vi.mock('@/lib/api', () => apiMocks);
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => authState,
}));

const defaultWorkspaceData = {
  philosophy: 'Chat-first workspace',
  retrievalMode: 'fts' as const,
  model: 'gemini-1.5-flash-latest',
  workerEnabled: true,
  limits: {
    maxFileSizeMb: 10,
    maxPagesPerDoc: 40,
    maxChunksPerDoc: 200,
    maxDocsPerChat: 3,
    maxChatRequestsPerDay: 20,
    chatHistoryLimit: 8,
    chatMessageListLimit: 200,
    ragTopK: 6,
    workerPollIntervalMs: 1000,
  },
  links: {
    githubRepositoryUrl: 'https://example.com/repo',
    runLocallyGuideUrl: 'https://example.com/run',
  },
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <ChatWorkspaceProvider>{children}</ChatWorkspaceProvider>;
}

describe('useChatWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getChatQuota.mockResolvedValue({
      quota: { used: 0, remaining: 20, limit: 20 },
    });
    apiMocks.getWorkspaceLimits.mockResolvedValue(defaultWorkspaceData);
    apiMocks.getReadyHealth.mockResolvedValue({
      status: 'ready',
      database: true,
      ai: true,
      timestamp: new Date().toISOString(),
    });
    apiMocks.uploadDocumentToChat.mockResolvedValue({
      document: {
        id: 'doc-1',
        file_name: 'notes.pdf',
        file_url: 'https://example.com/notes.pdf',
        status: 'processing',
        page_count: 0,
        chunk_count: 0,
        last_error: null,
        created_at: new Date().toISOString(),
        indexed_at: null,
      },
    });
    apiMocks.removeChatDocument.mockResolvedValue({ deleted: { id: 'doc-1' } });
  });

  it('accumulates streaming tokens and moves the final assistant reply into serverMessages', async () => {
    apiMocks.listChats.mockResolvedValue({
      chats: [
        {
          id: 'chat-1',
          title: 'New Chat',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_message: null,
          last_message_at: null,
          pinned: false,
          attachment_count: 0,
        },
      ],
    });
    apiMocks.listMessages.mockResolvedValue({ messages: [] });
    apiMocks.listChatDocuments.mockResolvedValue({ documents: [] });
    apiMocks.streamChatMessage.mockImplementation(
      async (_chatId: string, _payload: { content: string; clientMessageId: string }, onEvent: (event: unknown) => Promise<void>) => {
        await onEvent({
          type: 'chat.meta',
          data: { chatId: 'chat-1', userMessageId: 'user-msg-1' },
        });
        await onEvent({ type: 'assistant.delta', data: { text: 'Hello ' } });
        await onEvent({ type: 'assistant.delta', data: { text: 'world' } });
        await onEvent({
          type: 'assistant.completed',
          data: {
            assistantMessage: {
              id: 'assistant-msg-1',
              chat_id: 'chat-1',
              role: 'assistant',
              content: 'Hello world',
              created_at: new Date().toISOString(),
            },
            quota: { used: 1, remaining: 19, limit: 20 },
          },
        });
      },
    );

    const { result } = renderHook(() => useChatWorkspace(), { wrapper });

    await waitFor(() => {
      expect(result.current.activeChatId).toBe('chat-1');
    });

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.streamingMessage).toBeNull();
    expect(result.current.serverMessages).toHaveLength(2);
    expect(result.current.serverMessages[0]?.role).toBe('user');
    expect(result.current.serverMessages[0]?.content).toBe('Hello');
    expect(result.current.serverMessages[1]?.role).toBe('assistant');
    expect(result.current.serverMessages[1]?.content).toBe('Hello world');
    expect(result.current.chatQuota?.used).toBe(1);
  });

  it('ignores stale thread loads when the user switches chats quickly', async () => {
    let resolveMessagesOne!: (value: { messages: Array<{ id: string; chat_id: string; role: 'assistant'; content: string; created_at: string }> }) => void;
    let resolveDocsOne!: (value: { documents: [] }) => void;

    apiMocks.listChats.mockResolvedValue({
      chats: [
        {
          id: 'chat-1',
          title: 'Chat One',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_message: null,
          last_message_at: null,
          pinned: false,
          attachment_count: 0,
        },
        {
          id: 'chat-2',
          title: 'Chat Two',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_message: null,
          last_message_at: null,
          pinned: false,
          attachment_count: 0,
        },
      ],
    });

    apiMocks.listMessages.mockImplementation((chatId: string) => {
      if (chatId === 'chat-1') {
        return new Promise((resolve) => {
          resolveMessagesOne = resolve;
        });
      }

      return Promise.resolve({
        messages: [
          {
            id: 'chat-2-msg',
            chat_id: 'chat-2',
            role: 'assistant',
            content: 'Fresh chat content',
            created_at: new Date().toISOString(),
          },
        ],
      });
    });

    apiMocks.listChatDocuments.mockImplementation((chatId: string) => {
      if (chatId === 'chat-1') {
        return new Promise((resolve) => {
          resolveDocsOne = resolve;
        });
      }

      return Promise.resolve({ documents: [] });
    });

    const { result } = renderHook(() => useChatWorkspace(), { wrapper });

    await waitFor(() => {
      expect(result.current.activeChatId).toBe('chat-1');
    });

    await act(async () => {
      await result.current.selectChat('chat-2');
    });

    await waitFor(() => {
      expect(result.current.activeChatId).toBe('chat-2');
      expect(result.current.serverMessages[0]?.id).toBe('chat-2-msg');
    });

    await act(async () => {
      resolveMessagesOne({
        messages: [
          {
            id: 'stale-msg',
            chat_id: 'chat-1',
            role: 'assistant',
            content: 'Old chat content',
            created_at: new Date().toISOString(),
          },
        ],
      });
      resolveDocsOne({ documents: [] });
      await Promise.resolve();
    });

    expect(result.current.activeChatId).toBe('chat-2');
    expect(result.current.serverMessages[0]?.id).toBe('chat-2-msg');
    expect(result.current.serverMessages[0]?.content).toBe('Fresh chat content');
  });
});

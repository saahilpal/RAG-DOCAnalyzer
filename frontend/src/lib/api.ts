export type User = {
  id: string;
  email: string;
  created_at: string;
  email_verified_at?: string | null;
};

export type ChatRecord = {
  id: string;
  title: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  last_message?: string | null;
  last_message_at?: string | null;
  attachment_count: number;
};

export type MessageRecord = {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  client_message_id?: string | null;
  created_at: string;
};

export type ChatDocumentRecord = {
  id: string;
  file_name: string;
  file_url: string;
  status: 'uploading' | 'processing' | 'indexed' | 'failed';
  page_count: number;
  chunk_count: number;
  last_error?: string | null;
  created_at: string;
  indexed_at?: string | null;
  attached_at?: string;
};

export type WorkspaceLimits = {
  maxFileSizeMb: number;
  maxPagesPerDoc: number;
  maxChunksPerDoc: number;
  maxDocsPerChat: number;
  maxChatRequestsPerDay: number;
  chatHistoryLimit: number;
  chatMessageListLimit: number;
  ragTopK: number;
  workerPollIntervalMs: number;
  otpExpiresInSeconds?: number;
  otpResendCooldownSeconds?: number;
  otpMaxAttempts?: number;
  otpMaxRequestsPerHour?: number;
  otpRequestIpRateLimitMax?: number;
  otpVerifyIpRateLimitMax?: number;
};

export type OtpDeliveryMeta = {
  message: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
};

type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, options?: { status?: number; code?: string; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status || 500;
    this.code = options?.code;
    this.details = options?.details;
  }
}

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_BASE_URL = RAW_API_URL.replace(/\/+$/, '');

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function dispatchAuthStateEvent(code: string | undefined, message: string) {
  if (typeof window === 'undefined') {
    return;
  }

  if (code !== 'AUTH_EXPIRED' && code !== 'AUTH_INVALID_TOKEN') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('auth:expired', {
      detail: {
        code,
        message,
      },
    }),
  );
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});

  if (!isFormData(init.body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new ApiError('We could not reach the server. Please check your connection and try again.', {
      status: 0,
      code: 'NETWORK_ERROR',
    });
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? ((await response.json()) as ApiResponse<T>)
    : null;

  if (!response.ok || !payload || payload.ok === false) {
    const fallback = `Request failed (${response.status})`;
    const message = payload && payload.ok === false ? payload.error.message : fallback;
    const code = payload && payload.ok === false ? payload.error.code : undefined;
    const details = payload && payload.ok === false ? payload.error.details : undefined;

    dispatchAuthStateEvent(code, message);

    throw new ApiError(message, {
      status: response.status,
      code,
      details,
    });
  }

  return payload.data;
}

export function getMe() {
  return request<{ user: User }>('/api/v1/auth/me');
}

export function signUp(email: string, password: string) {
  return request<OtpDeliveryMeta>('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function resendVerification(email: string) {
  return request<OtpDeliveryMeta>('/api/v1/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifySignup(email: string, otp: string) {
  return request<{ user: User; token: string }>('/api/v1/auth/verify-signup', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

export function signIn(email: string, password: string) {
  return request<{ user: User; token: string }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function requestPasswordReset(email: string) {
  return request<OtpDeliveryMeta>('/api/v1/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(email: string, otp: string, newPassword: string) {
  return request<{ passwordReset: boolean }>('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword }),
  });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return request<{ passwordUpdated: boolean }>('/api/v1/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function signOut() {
  return request<{ loggedOut: boolean }>('/api/v1/auth/logout', {
    method: 'POST',
  });
}

export function listChats(limit = 50) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  return request<{ chats: ChatRecord[] }>(`/api/v1/chats?${params.toString()}`);
}

export function createChat(title?: string) {
  return request<{ chat: ChatRecord }>('/api/v1/chats', {
    method: 'POST',
    body: JSON.stringify(title ? { title } : {}),
  });
}

export function getChat(chatId: string) {
  return request<{ chat: ChatRecord }>(`/api/v1/chats/${chatId}`);
}

export function updateChat(chatId: string, payload: { title?: string; pinned?: boolean }) {
  return request<{ chat: ChatRecord }>(`/api/v1/chats/${chatId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteChat(chatId: string) {
  return request<{ deleted: { id: string } }>(`/api/v1/chats/${chatId}`, {
    method: 'DELETE',
  });
}

export function listMessages(chatId: string, limit = 200, signal?: AbortSignal) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  return request<{ messages: MessageRecord[] }>(`/api/v1/chats/${chatId}/messages?${params.toString()}`, {
    signal,
  });
}

export function listChatDocuments(chatId: string, signal?: AbortSignal) {
  return request<{ documents: ChatDocumentRecord[] }>(`/api/v1/chats/${chatId}/documents`, {
    signal,
  });
}

export function removeChatDocument(chatId: string, documentId: string) {
  return request<{ deleted: { id: string } }>(`/api/v1/chats/${chatId}/documents/${documentId}`, {
    method: 'DELETE',
  });
}

export function uploadDocumentToChat(
  chatId: string,
  file: File,
  onProgress?: (progress: number) => void,
) {
  return new Promise<{ document: ChatDocumentRecord }>((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/v1/chats/${chatId}/documents`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }
      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress?.(progress);
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading document.'));
    };

    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText) as ApiResponse<{
          document: ChatDocumentRecord;
        }>;

        if (xhr.status >= 200 && xhr.status < 300 && payload.ok) {
          resolve(payload.data);
          return;
        }

        reject(new Error(payload.ok ? 'Upload failed.' : payload.error.message));
      } catch {
        reject(new Error('Upload failed.'));
      }
    };

    xhr.send(formData);
  });
}

export function getChatQuota() {
  return request<{ quota: { used: number; remaining: number; limit: number } }>('/api/v1/quota');
}

export function getWorkspaceLimits() {
  return request<{
    philosophy: string;
    retrievalMode: 'fts' | 'vector';
    model: string;
    workerEnabled: boolean;
    limits: WorkspaceLimits;
    links: {
      githubRepositoryUrl: string;
      runLocallyGuideUrl: string;
    };
  }>('/api/v1/limits');
}

export function getReadyHealth() {
  return fetch(`${API_BASE_URL}/api/v1/health/ready`, {
    credentials: 'include',
  }).then(async (response) => {
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      throw new Error(`Health check failed (${response.status}).`);
    }

    const payload = (await response.json()) as ApiResponse<{
      status: 'ready' | 'ready_degraded';
      mode?: 'full' | 'chat_only';
      database: boolean;
      ai: boolean;
      timestamp: string;
    }>;

    if (payload.ok) {
      return {
        status: payload.data.status,
        database: payload.data.database,
        ai: payload.data.ai,
        timestamp: payload.data.timestamp,
      };
    }

    const details = payload.error.details as
      | {
          database?: boolean;
          ai?: boolean;
          timestamp?: string;
        }
      | null
      | undefined;

    if (details && (typeof details.database === 'boolean' || typeof details.ai === 'boolean')) {
      return {
        status: 'not_ready' as const,
        database: Boolean(details.database),
        ai: Boolean(details.ai),
        timestamp: details.timestamp || new Date().toISOString(),
      };
    }

    throw new Error(payload.error.message || `Health check failed (${response.status}).`);
  });
}

export type ChatStreamEvent =
  | {
      type: 'chat.meta';
      data: {
        chatId: string;
        userMessageId: string;
      };
    }
  | {
      type: 'assistant.delta';
      data: {
        text: string;
      };
    }
  | {
      type: 'assistant.completed';
      data: {
        assistantMessage: MessageRecord;
        quota: {
          used: number;
          remaining: number;
          limit: number;
        };
      };
    }
  | { type: 'error'; data: { code?: string; message: string } };

function parseSseEvent(rawEvent: string): ChatStreamEvent | null {
  const lines = rawEvent.replace(/\r/g, '').split('\n');
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  const dataText = dataLines.join('\n');

  if (!dataText) {
    return null;
  }

  let parsedData: unknown = dataText;

  try {
    parsedData = JSON.parse(dataText);
  } catch {
    parsedData = { message: dataText };
  }

  if (event === 'chat.meta') {
    return {
      type: 'chat.meta',
      data: parsedData as {
        chatId: string;
        userMessageId: string;
      },
    };
  }

  if (event === 'assistant.delta') {
    return { type: 'assistant.delta', data: parsedData as { text: string } };
  }

  if (event === 'assistant.completed') {
    return {
      type: 'assistant.completed',
      data: parsedData as {
        assistantMessage: MessageRecord;
        quota: {
          used: number;
          remaining: number;
          limit: number;
        };
      },
    };
  }

  if (event === 'error') {
    return { type: 'error', data: parsedData as { code?: string; message: string } };
  }

  return null;
}

export async function streamChatMessage(
  chatId: string,
  payload: { content: string; clientMessageId: string },
  onEvent: (event: ChatStreamEvent) => void | Promise<void>,
  signal?: AbortSignal,
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/chats/${chatId}/messages/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorPayload = (await response.json()) as ApiResponse<unknown>;
      if (errorPayload.ok === false) {
        throw new Error(errorPayload.error.message);
      }
    }

    throw new Error(`Stream failed (${response.status}).`);
  }

  if (!response.body) {
    throw new Error('Streaming body is unavailable.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const markerIndex = buffer.indexOf('\n\n');
      if (markerIndex === -1) {
        break;
      }

      const rawEvent = buffer.slice(0, markerIndex);
      buffer = buffer.slice(markerIndex + 2);

      if (!rawEvent.trim()) {
        continue;
      }

      const parsedEvent = parseSseEvent(rawEvent);
      if (!parsedEvent) {
        continue;
      }

      await onEvent(parsedEvent);

      if (parsedEvent.type === 'error') {
        throw new Error(parsedEvent.data.message || 'Streaming failed.');
      }
    }
  }
}

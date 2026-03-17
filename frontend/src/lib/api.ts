export type User = {
  id: string;
  email: string;
  created_at: string;
};

export type DocumentRecord = {
  id: string;
  file_name: string;
  file_url: string;
  page_count: number;
  chunk_count: number;
  indexing_status: 'processing' | 'indexed' | 'error';
  text_preview: string | null;
  is_sample: boolean;
  created_at: string;
};

export type SessionRecord = {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_role?: 'user' | 'assistant';
  last_message?: string;
};

export type MessageRecord = {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  fallback_used?: boolean;
  created_at: string;
};

export type DemoLimits = {
  maxFileSizeMb: number;
  maxPagesPerDoc: number;
  maxChunksPerDoc: number;
  maxContextChunks: number;
  maxChatRequestsPerDay: number;
  maxDocsPerUser: number;
  cacheTtlSeconds: number;
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});

  if (!isFormData(init.body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? ((await response.json()) as ApiResponse<T>)
    : null;

  if (!response.ok || !payload || payload.ok === false) {
    const fallback = `Request failed (${response.status})`;
    const message = payload && payload.ok === false ? payload.error.message : fallback;
    throw new Error(message);
  }

  return payload.data;
}

export function getMe() {
  return request<{ user: User }>('/api/auth/me');
}

export function signIn(email: string, password: string) {
  return request<{ user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function signUp(email: string, password: string) {
  return request<{ user: User }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function forgotPassword(email: string) {
  return request<{ message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(payload: { email: string; otp: string; newPassword: string }) {
  return request<{ message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function signOut() {
  return request<{ loggedOut: boolean }>('/api/auth/logout', {
    method: 'POST',
  });
}

export function listDocuments() {
  return request<{ documents: DocumentRecord[] }>('/api/documents');
}

export function deleteDocument(documentId: string) {
  return request<{ deleted: { id: string } }>(`/api/documents/${documentId}`, {
    method: 'DELETE',
  });
}

export function uploadDocument(file: File, onProgress?: (progress: number) => void) {
  return new Promise<{
    document: DocumentRecord;
    chunkCount: number;
    deduplicated: boolean;
    reusedChunks: boolean;
  }>((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/documents/upload`);
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
          document: DocumentRecord;
          chunkCount: number;
          deduplicated: boolean;
          reusedChunks: boolean;
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

export function listSessions(documentId?: string) {
  const params = new URLSearchParams();
  if (documentId) {
    params.set('documentId', documentId);
  }

  return request<{ sessions: SessionRecord[] }>(
    `/api/chat/sessions${params.toString() ? `?${params.toString()}` : ''}`,
  );
}

export function listMessages(sessionId: string) {
  return request<{ messages: MessageRecord[] }>(`/api/chat/sessions/${sessionId}/messages`);
}

export function getChatQuota() {
  return request<{ quota: { used: number; remaining: number; limit: number } }>('/api/chat/quota');
}

export function getDemoLimits() {
  return request<{
    philosophy: string;
    retrievalMode: 'fts' | 'vector';
    limits: DemoLimits;
    links: {
      githubRepositoryUrl: string;
      runLocallyGuideUrl: string;
    };
  }>('/api/limits');
}

export function getReadyHealth() {
  return fetch(`${API_BASE_URL}/api/health/ready`, {
    credentials: 'include',
  }).then(async (response) => {
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      throw new Error(`Health check failed (${response.status}).`);
    }

    const payload = (await response.json()) as ApiResponse<{
      status: 'ready' | 'ready_degraded';
      mode?: 'full' | 'fallback';
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
      type: 'session';
      data: {
        sessionId: string;
        documentId?: string;
        daily_limit?: number;
        daily_remaining?: number;
      };
    }
  | { type: 'token'; data: { text: string } }
  | {
      type: 'done';
      data: {
        sessionId: string;
        messageId?: string;
        retrievedChunks?: number;
        fallback_used?: boolean;
        cached?: boolean;
        ai_error_code?: string | null;
        daily_limit?: number;
        daily_remaining?: number;
      };
    }
  | { type: 'error'; data: { code?: string; message: string; details?: unknown } }
  | { type: 'end'; data: Record<string, never> };

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

  if (event === 'session') {
    return { type: 'session', data: parsedData as ChatStreamEvent['data'] & { sessionId: string } };
  }

  if (event === 'token') {
    return { type: 'token', data: parsedData as { text: string } };
  }

  if (event === 'done') {
    return { type: 'done', data: parsedData as ChatStreamEvent['data'] & { sessionId: string } };
  }

  if (event === 'error') {
    return { type: 'error', data: parsedData as { code?: string; message: string; details?: unknown } };
  }

  if (event === 'end') {
    return { type: 'end', data: {} };
  }

  return null;
}

export async function streamChat(
  payload: { sessionId?: string; documentId: string; query: string },
  onEvent: (event: ChatStreamEvent) => void | Promise<void>,
) {
  const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
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

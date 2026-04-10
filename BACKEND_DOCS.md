# Backend API Reference

Base path: `/api/v1`

This document is generated from the current route/controller/service structure in `src/`.

## Response Envelope

Successful JSON responses:

```json
{
  "ok": true,
  "data": {}
}
```

Failed JSON responses:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": []
  }
}
```

`details` is optional.

## Authentication

### Session model

- Client authenticates with Firebase in the browser.
- Backend verifies the Firebase ID token.
- Backend signs its own JWT and sets an `httpOnly` cookie.
- Protected routes also accept a Bearer token through `Authorization: Bearer <token>`.

### Cookie behavior

- cookie name: `AUTH_COOKIE_NAME`
- `httpOnly: true`
- `sameSite: none`
- `secure: true`

## Global Controls

Applied across the API:

- Helmet
- CORS allowlist
- mutation origin guard
- global rate limiter
- route-specific auth/chat/upload limiters
- request validation with Zod

## System Endpoints

### `GET /health`

Alias of live health.

Response:

```json
{
  "ok": true,
  "data": {
    "status": "live",
    "service": "document-analyzer-rag-backend",
    "timestamp": "2026-01-01T00:00:00.000Z"
  }
}
```

### `GET /health/live`

Same as `/health`.

### `GET /health/ready`

Checks database readiness and cached Gemini readiness.

Possible successful response:

```json
{
  "ok": true,
  "data": {
    "status": "ready",
    "mode": "full",
    "database": true,
    "ai": true,
    "timestamp": "2026-01-01T00:00:00.000Z"
  }
}
```

Possible degraded response:

```json
{
  "ok": true,
  "data": {
    "status": "ready_degraded",
    "mode": "chat_only",
    "database": true,
    "ai": false,
    "timestamp": "2026-01-01T00:00:00.000Z"
  }
}
```

Possible failure response:

```json
{
  "ok": false,
  "error": {
    "code": "NOT_READY_DATABASE",
    "message": "Database readiness check failed.",
    "details": {
      "database": false,
      "ai": true,
      "timestamp": "2026-01-01T00:00:00.000Z"
    }
  }
}
```

### `GET /limits`

Public limits/config summary for the frontend.

Returns:

- product philosophy string
- retrieval mode
- configured Gemini model
- worker enabled flag
- workspace limits
- repository and quick-start links

### `GET /quota`

Auth required.

Response:

```json
{
  "ok": true,
  "data": {
    "quota": {
      "used": 3,
      "remaining": 17,
      "limit": 20
    }
  }
}
```

## Auth Endpoints

### `POST /auth/google`

Exchanges a Firebase ID token for a backend session.

This route name is historical. It also accepts GitHub sign-ins when Firebase reports `github.com` as the provider.

Request body:

```json
{
  "idToken": "firebase_id_token"
}
```

Successful response:

```json
{
  "ok": true,
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Example",
      "avatar_url": "https://example.com/avatar.png",
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  }
}
```

Common errors:

- `AUTH_INVALID_GOOGLE_TOKEN`
- `AUTH_EMAIL_REQUIRED`
- `FIREBASE_NOT_CONFIGURED`
- `BAD_REQUEST`
- `AUTH_RATE_LIMITED`

### `POST /auth/logout`

Clears the auth cookie.

Response:

```json
{
  "ok": true,
  "data": {
    "loggedOut": true
  }
}
```

### `GET /auth/me`

Auth required.

Returns the current user:

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Example",
      "avatar_url": "https://example.com/avatar.png",
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  }
}
```

Common errors:

- `AUTH_REQUIRED`
- `AUTH_EXPIRED`
- `AUTH_INVALID_TOKEN`

## Chat Endpoints

All `/chats` endpoints require authentication.

### `GET /chats?limit=50`

Lists chats ordered by:

1. pinned first
2. newest `updated_at`

Each row includes:

- chat id/title/pinned
- timestamps
- `last_message`
- `last_message_at`
- `attachment_count`

### `POST /chats`

Creates a chat.

Request body:

```json
{
  "title": "Optional title"
}
```

If the title is omitted, the default is `New Chat`.

### `GET /chats/:chatId`

Returns a single owned chat.

Common errors:

- `CHAT_NOT_FOUND`

### `PATCH /chats/:chatId`

Updates one or both of:

- `title`
- `pinned`

Request body:

```json
{
  "title": "Renamed chat",
  "pinned": true
}
```

Validation requires at least one field.

### `DELETE /chats/:chatId`

Deletes the chat and all related messages/attachments through cascading foreign keys.

Response:

```json
{
  "ok": true,
  "data": {
    "deleted": {
      "id": "chat_uuid"
    }
  }
}
```

### `GET /chats/:chatId/messages?limit=200`

Returns persisted messages in ascending chronological order.

### `POST /chats/:chatId/messages/stream`

Streams a reply over Server-Sent Events.

Request body:

```json
{
  "content": "What changed in the document?",
  "clientMessageId": "client-generated-unique-id"
}
```

Processing steps:

1. verify chat ownership
2. enforce daily quota
3. load attached documents
4. load recent history
5. insert the user message
6. retrieve relevant chunks
7. generate answer with Gemini
8. persist assistant message and quota

SSE event types:

- `chat.meta`
- `assistant.delta`
- `assistant.completed`
- `error`
- final transport terminator: `end`

Example event stream:

```text
event: chat.meta
data: {"chatId":"...","userMessageId":"..."}

event: assistant.delta
data: {"text":"The pricing section changes annual minimums..."}

event: assistant.completed
data: {"assistantMessage":{"id":"..."},"quota":{"used":1,"remaining":19,"limit":20}}

event: end
data: {}
```

Important notes:

- the endpoint responds with `text/event-stream`
- the backend deletes the inserted user message if generation fails before assistant persistence
- duplicate user sends are rejected by `clientMessageId` uniqueness per chat

Common errors before streaming starts:

- `AUTH_REQUIRED`
- `CHAT_NOT_FOUND`
- `CHAT_DAILY_LIMIT_REACHED`
- `DUPLICATE_MESSAGE`
- `RETRIEVAL_FAILED`
- `AI_TEMPORARILY_UNAVAILABLE`

## Document Endpoints

### `GET /chats/:chatId/documents`

Returns documents attached to the chat, ordered by attachment time.

Fields include:

- `id`
- `file_name`
- `file_url`
- `status`
- `page_count`
- `chunk_count`
- `last_error`
- `created_at`
- `indexed_at`
- `attached_at`

Implementation detail:

- `file_url` is intentionally sanitized to an empty string in service responses
- files are stored privately in Supabase Storage and are not exposed directly through this API

### `POST /chats/:chatId/documents`

Uploads and attaches one PDF file.

Request:

- `Content-Type: multipart/form-data`
- field name: `file`

Validation rules:

- must be a PDF by extension and MIME type
- must contain a valid `%PDF-` signature
- must fit within `MAX_UPLOAD_FILE_SIZE_BYTES`

Behavior:

- deduplicates by SHA-256 per user
- uploads new files to Supabase Storage
- inserts `documents` row and `chat_documents` row
- returns the document in `processing` state

Common errors:

- `BAD_REQUEST`
- `FILE_TOO_LARGE`
- `ATTACHMENT_LIMIT_REACHED`
- `UPLOAD_RATE_LIMITED`
- `STORAGE_UPLOAD_FAILED`

### `DELETE /chats/:chatId/documents/:documentId`

Detaches a document from the chat.

If no other chats still reference that document:

- the document row is deleted
- the Supabase Storage object is removed

Common errors:

- `CHAT_NOT_FOUND`
- `DOCUMENT_NOT_FOUND`
- `DOCUMENT_NOT_ATTACHED`
- `STORAGE_DELETE_FAILED`

## Retrieval Behavior

Retrieval is chat-scoped. Only documents attached to the target chat are searched.

### Full-text mode

- query operator: `websearch_to_tsquery('english', query)`
- ranking: `ts_rank_cd`

### Vector mode

- query embedding generated with Gemini
- rows ordered by vector distance
- falls back to FTS if embeddings are unavailable

## Worker Behavior

The worker is not exposed as an API route, but it is part of backend behavior.

### Claiming

- scans `documents.status = 'processing'`
- respects retry timing via `processing_started_at`
- uses `FOR UPDATE SKIP LOCKED`

### Processing

- downloads PDF from Supabase
- parses text with `pdf-parse`
- enforces page limit
- chunks text
- optionally embeds chunks
- inserts rows into `chunks`
- marks document as `indexed`

### Failure and retries

- retryable failures are rescheduled
- permanent failures set `status = 'failed'`
- final reason is stored in `documents.last_error`

# Backend API Documentation

This document is for frontend/mobile clients integrating with the backend.

## Base URL

- Production: `https://api.docanalyzer.app`
- API prefix: `/api/v1`

Example full endpoint:

- `https://api.docanalyzer.app/api/v1/auth/google`

## Auth Model

Authentication is cookie-based after Firebase token exchange.

Flow:

1. Client signs in with Firebase (Google or GitHub)
2. Client obtains Firebase `idToken`
3. Client calls `POST /api/v1/auth/google` with `{ idToken }`
4. Backend verifies token via Firebase Admin SDK
5. Backend finds/creates user and issues JWT
6. Backend sets `httpOnly` auth cookie
7. Subsequent authenticated calls use cookie + `credentials: include`

## Response Format

All JSON endpoints follow one envelope:

Success:

```json
{
  "ok": true,
  "data": {}
}
```

Error:

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

## Rate Limiting

Layered rate limiting is active:

- Global request limiter for all endpoints
- Auth limiter on social sign-in route
- Chat limiter on chat routes
- Upload limiter on file upload route

When exceeded, API returns `429` with `{ ok: false, error: ... }`.

## Auth Endpoints

## POST `/api/v1/auth/google`

Exchange Firebase ID token for backend session.

Request:

```json
{
  "idToken": "firebase_id_token"
}
```

Response `200`:

```json
{
  "ok": true,
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User",
      "avatar_url": "https://...",
      "created_at": "ISO8601"
    }
  }
}
```

Possible errors:

- `401 AUTH_INVALID_GOOGLE_TOKEN`
- `400 AUTH_EMAIL_REQUIRED`
- `400 VALIDATION_ERROR`
- `429 AUTH_RATE_LIMITED`

## GET `/api/v1/auth/me`

Returns current authenticated user from cookie session.

Response `200`:

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User",
      "avatar_url": "https://...",
      "created_at": "ISO8601"
    }
  }
}
```

Possible errors:

- `401 AUTH_REQUIRED`
- `401 AUTH_INVALID_TOKEN`
- `401 AUTH_EXPIRED`

## POST `/api/v1/auth/logout`

Clears auth cookie.

Response `200`:

```json
{
  "ok": true,
  "data": {
    "loggedOut": true
  }
}
```

## Chat Endpoints

All chat endpoints require auth cookie (`credentials: include`).

## GET `/api/v1/chats?limit=50`

List chats for current user.

## POST `/api/v1/chats`

Create chat.

Request:

```json
{
  "title": "Optional title"
}
```

Response `201`: `{ ok: true, data: { chat } }`

## GET `/api/v1/chats/:chatId`

Get single chat.

## PATCH `/api/v1/chats/:chatId`

Update title/pinned.

Request:

```json
{
  "title": "New title",
  "pinned": true
}
```

Response `200`: `{ ok: true, data: { chat } }`

## DELETE `/api/v1/chats/:chatId`

Delete chat.

Response `200`:

```json
{
  "ok": true,
  "data": {
    "deleted": {
      "id": "uuid"
    }
  }
}
```

## GET `/api/v1/chats/:chatId/messages?limit=200`

List chat messages.

## POST `/api/v1/chats/:chatId/messages/stream`

Stream assistant response with Server-Sent Events (SSE).

Request:

```json
{
  "content": "User prompt",
  "clientMessageId": "client_unique_id"
}
```

SSE event stream:

- `chat.meta`
- `assistant.delta`
- `assistant.completed`
- `error`

Important:

- This endpoint returns `text/event-stream`
- Keep connection open until completion event
- On errors during stream, `error` SSE event is emitted

## Upload / Document Endpoints

## GET `/api/v1/chats/:chatId/documents`

List documents attached to chat.

## POST `/api/v1/chats/:chatId/documents`

Attach and upload a PDF document to chat.

Request:

- Content-Type: `multipart/form-data`
- Field: `file`

Response `201`: `{ ok: true, data: { document } }`

Possible errors:

- `400 VALIDATION_ERROR`
- `400 FILE_TOO_LARGE`
- `409 ATTACHMENT_LIMIT_REACHED`
- `409 DUPLICATE_DOCUMENT`
- `429 UPLOAD_RATE_LIMITED`

## DELETE `/api/v1/chats/:chatId/documents/:documentId`

Remove attachment/document association (with ownership checks).

Response `200`: `{ ok: true, data: { deleted: { id } } }`

## Utility Endpoints

## GET `/api/v1/quota`

Returns current daily usage.

## GET `/api/v1/limits`

Returns configured product limits and model metadata.

## GET `/api/v1/health/live`

Liveness check.

## GET `/api/v1/health/ready`

Readiness check (full or degraded mode).

## Common Error Codes

- `AUTH_REQUIRED`
- `AUTH_INVALID_TOKEN`
- `AUTH_EXPIRED`
- `AUTH_INVALID_GOOGLE_TOKEN`
- `VALIDATION_ERROR`
- `RATE_LIMITED`
- `AUTH_RATE_LIMITED`
- `CHAT_RATE_LIMITED`
- `UPLOAD_RATE_LIMITED`
- `INTERNAL_ERROR`

## Client Integration Notes

- Always send requests with credentials:
  - `fetch(..., { credentials: "include" })`
- Do not store backend JWT manually if cookie flow is used
- Handle both HTTP error responses and SSE `error` events

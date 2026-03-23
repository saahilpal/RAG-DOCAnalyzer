# System Architecture

Document Analyzer is a split deployment:

- Frontend: Next.js app on Vercel
- Backend: Express API on Render
- Data: PostgreSQL + Supabase Storage
- AI: Gemini API

## High-Level Components

- **Client (Web):** Authentication UI, chat workspace, upload flow, SSE stream handling
- **Firebase Auth (Client):** Google/GitHub provider login and ID token issuance
- **Backend API (Express):** Auth exchange, chat orchestration, upload handling, quota/rate limit guardrails
- **Firebase Admin SDK (Backend):** ID token verification
- **PostgreSQL (Supabase):** Users, chats, messages, documents, chunks, usage counters
- **Supabase Storage:** Private document binary storage
- **RAG Services:** Retrieval + grounding + response generation

## Request Flow (Auth)

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend (Next.js)
  participant FA as Firebase Auth
  participant BE as Backend API
  participant FBA as Firebase Admin
  participant DB as PostgreSQL

  U->>FE: Click Google/GitHub sign-in
  FE->>FA: signInWithPopup(provider)
  FA-->>FE: Firebase idToken
  FE->>BE: POST /api/v1/auth/google { idToken }
  BE->>FBA: verifyIdToken(idToken)
  FBA-->>BE: decoded token (email, name, uid, provider)
  BE->>DB: upsert user by email/provider fields
  DB-->>BE: user row
  BE-->>FE: set httpOnly JWT cookie + user payload
  FE->>BE: GET /api/v1/auth/me (cookie)
  BE-->>FE: authenticated user
```

## Request Flow (Chat + RAG)

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant BE as Backend API
  participant DB as PostgreSQL
  participant ST as Supabase Storage
  participant AI as Gemini

  FE->>BE: POST /api/v1/chats/:id/messages/stream
  BE->>BE: auth + rate limit + quota checks
  BE->>DB: load chat/history/docs
  BE->>DB: retrieve chunks (vector/fts)
  BE->>AI: stream generation with grounded context
  AI-->>BE: token deltas
  BE-->>FE: SSE events (chat.meta, assistant.delta, assistant.completed)
  BE->>DB: persist assistant message + consume quota
```

## Request Flow (Upload + Indexing)

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant BE as Backend API
  participant ST as Supabase Storage
  participant DB as PostgreSQL
  participant WK as Document Worker
  participant AI as Gemini Embeddings

  FE->>BE: POST /api/v1/chats/:id/documents (multipart file)
  BE->>BE: validate file + auth + upload rate limits
  BE->>ST: upload private file
  BE->>DB: create document row (processing)
  WK->>DB: claim processing job
  WK->>ST: fetch file
  WK->>WK: parse PDF + chunk text
  WK->>AI: embedding generation (optional mode)
  WK->>DB: write chunks + mark indexed
```

## Security Model

- Strict CORS allowlist for production domains
- JWT auth cookie is `httpOnly`; user identity derived server-side
- Firebase Admin verifies provider identity tokens
- Per-route validation with Zod
- Rate limiting:
  - global
  - auth route
  - chat routes
  - upload routes
- Private object storage for uploaded files

## Reliability & Failure Behavior

- Standardized API envelope for errors/success
- Streaming endpoint emits structured SSE error events
- Worker retry controls for document processing failures
- Readiness endpoint supports degraded mode when AI is unavailable

## Data Model (Auth-Relevant)

Primary user fields:

- `id`
- `email`
- `name`
- `avatar_url`
- `provider`
- `provider_id`

Legacy email/OTP auth flows are not part of active production behavior.

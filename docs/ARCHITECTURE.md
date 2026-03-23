# Architecture Notes

This system is intentionally designed for free-tier reliability.

## Principles

- Stateless API instances
- Managed persistence only (Supabase)
- Strict quotas and guardrails
- Private document storage
- Graceful degradation in readiness reporting

## Request Lifecycle (Chat)

1. Authenticate the user via JWT cookie or bearer token.
2. Acquire a per-user quota lock before checking daily usage.
3. Load attached documents and recent chat history.
4. Block chat if documents are still processing.
5. Persist the user message only for the active attempt.
6. If no document is ready, return upload guidance.
7. If the query is vague or overly broad, return guidance without retrieval or model generation.
8. Retrieve relevant chunks with vector search or PostgreSQL FTS fallback.
9. If retrieval returns no relevant context, return a document-specific refinement message.
10. Stream Gemini output over SSE only when grounded context exists.
11. Persist the assistant reply and consume quota only after successful completion.
12. Remove interrupted or failed user messages so chats do not keep half-saved turns.

## Upload Lifecycle

1. Validate MIME/signature and enforce file size/page/chunk limits.
2. Store the file in a private Supabase Storage bucket.
3. Attach the document to the chat immediately and mark it `processing`.
4. The in-process worker claims work with row locking.
5. Parse PDF content, chunk it, and optionally create embeddings.
6. Persist chunks and metadata in Postgres.
7. Retry transient failures with capped attempts and backoff.
8. Mark the document `failed` once retry limits are exhausted.

## Health Semantics

- `/api/v1/health/live`: process liveness.
- `/api/v1/health/ready`:
  - `503` when database unavailable
  - `200 ready_degraded` when database is healthy and AI is unavailable
  - `200 ready` when both database and AI checks pass

## Security and Product Guardrails

- Uploaded files are stored privately and accessed server-side with the Supabase service role.
- The public limits endpoint exposes product-level limits without leaking internal auth or quota implementation details.
- Chat responses are document-grounded only; the assistant does not fall back to general knowledge when no relevant context is found.
- The default UI keeps one active document per chat for clarity, even though the backend limit remains configurable.

# Architecture Notes

This system is intentionally designed for free-tier reliability.

## Principles

- Stateless API instances
- Managed persistence only (Supabase)
- Strict quotas and guardrails
- Graceful fallback when AI is unavailable

## Request Lifecycle (Chat)

1. Authenticate user via HTTP-only JWT cookie.
2. Consume daily user quota atomically.
3. Retrieve document context via PostgreSQL FTS.
4. Attempt Gemini streaming generation.
5. On AI error/timeout/quota, return extractive fallback answer.
6. Cache response by `(document_id + normalized_query)` with TTL.

## Upload Lifecycle

1. Validate MIME/signature and enforce file size/page/chunk limits.
2. Deduplicate via SHA-256 hash.
3. Store file in Supabase Storage.
4. Parse PDF and chunk content.
5. Persist chunks and metadata in Postgres.

## Health Semantics

- `/api/health/live`: process liveness.
- `/api/health/ready`:
  - `503` when database unavailable
  - `200 ready_degraded` when database healthy and AI unavailable (fallback mode)

# RAG DOCAnalyzer

Production-style, stateless Document RAG system built for reliable free-tier demos.

![Node.js](https://img.shields.io/badge/Node.js-Express-black?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Storage-black?style=flat-square)
![Gemini](https://img.shields.io/badge/Google-Gemini%201.5%20Flash-black?style=flat-square)

## Architecture

### Full Project Architecture

![Document Analyzer RAG Architecture](./docs/architecture.svg)

### RAG Core Architecture

![RAG Core Architecture](./docs/rag-architecture.svg)

## End-to-End RAG Flow

### 1) Upload and Index

1. User uploads PDF to `POST /api/documents/upload`.
2. API validates file type, size, and PDF signature.
3. PDF text is extracted with `pdf-parse`.
4. Text is chunked with overlap.
5. Chunks are stored in Postgres with `search_vector`.
6. Optional vector embeddings are generated only in `RETRIEVAL_MODE=vector`.
7. File is stored in Supabase Storage (`documents` bucket).

### 2) Chat and Retrieval

1. User sends query to `POST /api/chat/stream`.
2. Auth, per-IP rate limit, and per-user daily quota are checked.
3. Query cache is checked with key `(document_id + normalized_query)`.
4. Retrieval runs in default FTS mode (`websearch_to_tsquery` + `ts_rank_cd`).
5. Top chunks are injected into the RAG prompt.
6. Gemini streams tokens via SSE.
7. If AI fails (`AI_QUOTA_EXCEEDED`, `AI_TIMEOUT`, `AI_TEMPORARILY_UNAVAILABLE`), extractive fallback is returned.
8. Response is persisted to session history and cached with TTL.

## Demo Guardrails (Intentional)

This public deployment is a trial/demo environment. Limits are strict by design for reliability and cost control.

| Control | Env key | Default |
|---|---|---|
| Max file size | `MAX_FILE_SIZE_MB` | `10` |
| Max pages per document | `MAX_PAGES_PER_DOC` | `40` |
| Max chunks per document | `MAX_CHUNKS_PER_DOC` | `200` |
| Max context chunks to AI | `RAG_TOP_K` | `5` |
| Max documents per user | `MAX_DOCS_PER_USER` | `3` |
| Max chat requests per day | `MAX_CHAT_REQUESTS_PER_DAY` | `20` |
| Query cache TTL (seconds) | `CACHE_TTL_SECONDS` | `600` |

## RAG Tuning Variables

Added and wired in backend config/runtime:

| Variable | Default | Purpose |
|---|---|---|
| `RAG_TOP_K` | `5` | Final chunks sent to the model |
| `RAG_CANDIDATE_PAGE_SIZE` | `400` | Candidate rows considered before top-k slice |
| `RAG_HISTORY_LIMIT` | `50` | Max messages returned for a session history call |
| `RAG_TOKEN_TO_CHAR_RATIO` | `4` | Approx token-to-char ratio used for prompt/fallback clipping |
| `RAG_CHUNK_TOKENS` | `1000` | Chunk size for ingestion |
| `RAG_CHUNK_OVERLAP_TOKENS` | `200` | Chunk overlap for ingestion |

## Tech Stack

- Frontend: Next.js App Router, TypeScript, TailwindCSS, Framer Motion
- Backend: Node.js, Express, SSE streaming
- Database: Supabase Postgres (`pg`)
- Retrieval: Postgres FTS (default), pgvector (optional)
- Storage: Supabase Storage
- AI: Gemini (`gemini-1.5-flash`, optional `text-embedding-004`)
- Auth: JWT + HTTP-only cookie + bcrypt

## Recent Optimizations & Enhancements

- **High-Performance Indexing**: PDF chunk insertion now uses **multi-row batch processing**, significantly reducing database round-trips and speeding up the indexing of large documents.
- **Password Recovery**: Integrated `nodemailer` to support secure password reset flows via **SMTP and 6-digit OTP codes**.
- **Enhanced Security**: 
  - JWT verification now explicitly enforces the `HS256` algorithm to prevent algorithm-switching attacks.
  - Added **Quota Refund Logic**: Daily chat usage is automatically refunded if a streaming request fails before the AI starts generating, ensuring fair usage for users.
- **Improved Retrieval**: Refined the Full-Text Search (FTS) retrieval path for more precise context extraction.

## Monorepo Structure

```text
.
├── src/                       # Backend source (Express, RAG logic, Services)
├── database/schema.sql        # Unified Supabase Postgres schema
├── sample_docs/               # Preloaded sample PDF for demo seeding
├── frontend/                  # Next.js frontend (App Router, Framer Motion)
├── docs/architecture.svg      # System-wide architectural diagram
├── docs/rag-architecture.svg  # Detailed RAG pipeline visualization
├── render.yaml                # Render blueprint for backend deployment
└── DEPLOYMENT_CHECKLIST.md    # Production deployment and config guide
```

## API Endpoints

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Documents:
- `POST /api/documents/upload`
- `GET /api/documents`
- `DELETE /api/documents/:id`

Chat:
- `POST /api/chat/stream`
- `GET /api/chat/sessions`
- `GET /api/chat/sessions/:sessionId/messages`
- `GET /api/chat/quota`

System:
- `GET /api/health`
- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/limits`

## Environment Variables

Backend env template: [`.env.example`](./.env.example)

Required backend keys:
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `JWT_SECRET`
- `CORS_ORIGIN`

Frontend env template: [`frontend/.env.example`](./frontend/.env.example)

Required frontend key:
- `NEXT_PUBLIC_API_URL`

## Quick Start (Local)

### 1) Backend

```bash
npm install
cp .env.example .env
npm run db:schema
npm run dev
```

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Validation

From repo root:

```bash
npm test
npm run frontend:lint
npm run frontend:build
```

## Deployment

- Backend on Render: [render.yaml](./render.yaml)
- Frontend on Vercel: [frontend/vercel.json](./frontend/vercel.json)
- Step-by-step checklist: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

## Developer

**Sahil Pal**

- GitHub: https://github.com/saahilpal
- LinkedIn: https://www.linkedin.com/in/sahiilpal
- LeetCode: https://leetcode.com/u/saahiilpal/

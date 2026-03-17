# Document Analyzer RAG

Production-style **stateless RAG system** designed to run reliably on free-tier infrastructure.

![Node.js](https://img.shields.io/badge/Node.js-Express-black?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Storage-black?style=flat-square)
![Gemini](https://img.shields.io/badge/Google-Gemini%201.5%20Flash-black?style=flat-square)

## Why This Project

This repo is intentionally built as a **public demo environment**:

- strict limits are intentional
- cost protection is required
- abuse prevention is required
- reliability under free-tier constraints is required

For unlimited usage, run locally with your own API key and adjust limits.

## Architecture

![Document Analyzer RAG Architecture](./docs/architecture.svg)

## Tech Stack

- Frontend: Next.js (App Router), TypeScript, TailwindCSS, Framer Motion
- Backend: Node.js, Express, SSE streaming
- Database: Supabase PostgreSQL (`pg`, optional `pgvector`)
- Retrieval: PostgreSQL Full-Text Search by default
- Storage: Supabase Storage (`documents` bucket)
- AI: Gemini (`gemini-1.5-flash`, optional `text-embedding-004`)
- Auth: JWT + HTTP-only cookie + bcrypt

## Monorepo Structure

```text
.
├── src/                     # Backend source
├── database/schema.sql      # Supabase schema
├── sample_docs/             # Preloaded sample PDF
├── frontend/                # Next.js frontend app
├── docs/architecture.svg    # Architecture image
├── render.yaml              # Render deployment blueprint
└── DEPLOYMENT_CHECKLIST.md  # End-to-end live deploy guide
```

## Key Features

- Stateless architecture (no local DB, no local file storage)
- Hard upload and usage limits for free-tier safety
- Atomic per-user daily chat quota
- FTS-first retrieval pipeline (no mandatory embedding cost)
- Optional vector mode (`RETRIEVAL_MODE=vector`)
- Gemini generation with explicit fallback response path
- Query cache with TTL
- Strict security middleware (`helmet`, `cors`, rate limit, origin guard)
- Health endpoints (`/api/health/live`, `/api/health/ready`)

## Demo Limits (Default)

- `10MB` max file size
- `40` max pages per document
- `200` max chunks per document
- `4` max context chunks sent to model
- `20` max chat requests per user per day
- `3` max documents per user
- `10 min` query cache TTL

## Quick Start

### 1) Backend

```bash
npm install
cp .env.example .env
```

Run schema on Supabase:

```bash
npm run db:schema
```

Start backend:

```bash
npm run dev
```

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend env:

- `NEXT_PUBLIC_API_URL=http://localhost:4000`

## Validation

From repo root:

```bash
npm test
```

From `frontend/`:

```bash
npm run lint
npm run build
```

## Backend Environment Variables

See [`.env.example`](./.env.example).

Required minimum:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `JWT_SECRET`
- `CORS_ORIGIN`

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/documents/upload`
- `GET /api/documents`
- `DELETE /api/documents/:id`
- `POST /api/chat/stream`
- `GET /api/chat/sessions`
- `GET /api/chat/sessions/:sessionId/messages`
- `GET /api/chat/quota`
- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/limits`

## Deployment

- Backend (Render): [render.yaml](./render.yaml)
- Frontend (Vercel): [frontend/vercel.json](./frontend/vercel.json)
- Full guide: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

## Developer

**Sahil Pal**

- GitHub: https://github.com/saahilpal
- LinkedIn: https://www.linkedin.com/in/sahiilpal
- LeetCode: https://leetcode.com/u/saahiilpal/

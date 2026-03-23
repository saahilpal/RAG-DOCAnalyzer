# Document Analyzer RAG

Production-ready chat-first RAG application for document Q&A.

## Overview

Document Analyzer lets users:

1. Sign in with Firebase social auth (Google or GitHub)
2. Upload PDF documents
3. Wait for indexing to complete
4. Chat with grounded, document-based answers

Frontend and backend are deployed separately:

- Frontend: `https://docanalyzer.app`
- Backend API: `https://api.docanalyzer.app`

## Core Features

- Firebase social login (Google + GitHub)
- Backend-owned JWT cookie sessions
- Chat-first workflow with streaming responses (SSE)
- Document upload, processing, indexing, and chat attachment flow
- RAG pipeline with retrieval safeguards and graceful fallback behavior
- Daily usage quota and infrastructure limits endpoint
- Strict CORS policy and layered rate limiting

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Framer Motion, Firebase Web SDK
- Backend: Node.js, Express, Firebase Admin SDK
- Database: PostgreSQL (Supabase)
- Storage: Supabase Storage
- AI: Google Gemini
- Deploy: Vercel (frontend), Render (backend)

## Repo Structure

```text
.
├── frontend/              # Next.js app
├── src/                   # Express API
├── database/schema.sql    # Database schema bootstrap
├── render.yaml            # Render blueprint
├── BACKEND_DOCS.md        # API contract documentation
└── ARCHITECTURE.md        # System architecture and flows
```

## Screenshots

Architecture visuals currently included:

- System architecture: [`docs/architecture.svg`](./docs/architecture.svg)
- RAG flow: [`docs/rag-architecture.svg`](./docs/rag-architecture.svg)

## Authentication Model (Final)

- Only Firebase social providers are supported:
  - Google
  - GitHub
- Backend auth exchange endpoint remains:
  - `POST /api/v1/auth/google`
- Legacy email/password/OTP auth is removed from active flows.

## Local Setup

### 1) Install dependencies

```bash
npm install
cd frontend && npm install
```

### 2) Configure Firebase

In Firebase Console:

1. Create/select project
2. Enable Auth providers:
   - Google
   - GitHub
3. Create a Web App and copy client config values
4. Create a Service Account for backend and copy:
   - project ID
   - client email
   - private key

### 3) Configure environment variables

Backend:

```bash
cp .env.example .env
```

Frontend:

```bash
cd frontend
cp .env.example .env.local
```

### Backend required env vars

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `JWT_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Frontend required env vars

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 4) Initialize database (fresh/disposable DB only)

```bash
npm run db:schema
```

For existing production databases, run the non-destructive auth migration instead of `db:schema`:

```bash
psql "$DATABASE_URL" -f database/migrations/20260323_social_auth_provider_migration.sql
```

### 5) Run locally

Backend:

```bash
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

## Production Deployment

## Backend on Render

1. Connect repository to Render
2. Use blueprint file: [`render.yaml`](./render.yaml)
3. Set `sync: false` secrets in Render dashboard
4. Confirm health endpoint:
   - `GET https://api.docanalyzer.app/api/v1/health/live`

## Frontend on Vercel

1. Import `frontend/` as project root
2. Set production env vars (`NEXT_PUBLIC_*`)
3. Set `NEXT_PUBLIC_API_URL=https://api.docanalyzer.app`
4. Deploy and validate auth + chat flows

## Security & Stability Checks

- Strict CORS allowlist for `docanalyzer.app` domains
- Global rate limit + route-specific auth/chat/upload limiters
- Standard API response envelope:
  - success: `{ ok: true, data: ... }`
  - error: `{ ok: false, error: { code, message, details? } }`
- Firebase Admin env validation at boot
- No JSON service account file dependency in backend runtime

## Verification Commands

```bash
npm test
npm run frontend:test
npm run frontend:lint
npm run frontend:build
```

## Additional Documentation

- Backend contract: [`BACKEND_DOCS.md`](./BACKEND_DOCS.md)
- System architecture: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- Deployment checklist: [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md)

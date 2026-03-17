# Deployment Checklist (Render + Vercel + Supabase)

Use this checklist to deploy a production-style demo safely.

Repository:
- https://github.com/saahilpal/RAG-DOCAnalyzer

Architecture references:
- Full project: [`docs/architecture.svg`](./docs/architecture.svg)
- RAG core: [`docs/rag-architecture.svg`](./docs/rag-architecture.svg)

## 1) Supabase

1. Create a new Supabase project.
2. Run schema:

```bash
npm run db:schema
```

3. Create storage bucket:
- `documents` (public bucket)

4. Copy credentials:
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## 2) Backend (Render)

Deploy from repo root using:
- [`render.yaml`](./render.yaml)

Set required secret env vars in Render:
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `JWT_SECRET`
- `CORS_ORIGIN` (your Vercel domain)
- `GITHUB_REPOSITORY_URL`
- `RUN_LOCALLY_GUIDE_URL`

Recommended RAG tuning env vars:
- `RAG_TOP_K=5`
- `RAG_CANDIDATE_PAGE_SIZE=400`
- `RAG_HISTORY_LIMIT=50`
- `RAG_TOKEN_TO_CHAR_RATIO=4`
- `RAG_CHUNK_TOKENS=1000`
- `RAG_CHUNK_OVERLAP_TOKENS=200`

Health endpoint:
- `/api/health/live`

## 3) Frontend (Vercel)

Project root in Vercel:
- `frontend`

Config:
- [`frontend/vercel.json`](./frontend/vercel.json)

Required env var:
- `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com`

## 4) Post-Deploy Validation

1. `GET /api/health/live` returns `ok: true`.
2. `GET /api/limits` returns demo limits.
3. Signup/Login works and sets HTTP-only cookie.
4. Upload rejects invalid type/oversized file.
5. Chat enforces daily quota and streams via SSE.
6. If AI is down, fallback response still returns.
7. Unknown origin POST requests are blocked.

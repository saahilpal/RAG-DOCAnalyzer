# Document Analyzer RAG

Chat with your documents in a premium, chat-first AI workspace.

## Overview

Document Analyzer RAG is built for conversational document understanding. Instead of navigating a dashboard-heavy interface, users stay in one clean chat flow: attach files, ask questions, and get grounded responses with streaming output.

The platform combines a polished Next.js frontend with an Express backend, Supabase storage, PostgreSQL retrieval, and Gemini generation.

## Product Highlights

- Chat-first RAG with multi-turn memory
- Multi-document context per conversation
- Streaming assistant responses (SSE)
- Email + password auth with verification and password reset
- Persistent chat controls: rename, pin, delete
- Usage quota and account settings panel
- Vector retrieval with automatic FTS fallback

## Architecture

### System View

<p align="center">
  <img src="./docs/architecture.svg" alt="System architecture diagram" width="960" />
</p>

### RAG Flow

<p align="center">
  <img src="./docs/rag-architecture.svg" alt="RAG retrieval and generation flow diagram" width="960" />
</p>

For additional architecture notes, see [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Tech Stack

- Frontend: Next.js, React, Tailwind CSS, Framer Motion
- Backend: Node.js, Express
- Database: PostgreSQL (Supabase)
- Storage: Supabase Storage
- AI: Google Gemini
- Email: Resend
- Deployment: Vercel (frontend), Render (backend)

## Run Locally

### 1. Install dependencies

```bash
npm install
cd frontend && npm install
```

### 2. Configure environment variables

Backend:

```bash
cp .env.example .env
```

Frontend:

```bash
cd frontend
cp .env.example .env.local
```

Required backend variables:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `RESEND_API_KEY`
- `RESEND_FROM`

Required frontend variable:

- `NEXT_PUBLIC_API_URL`

### 3. Initialize and run

From the repo root:

```bash
npm run db:schema
npm run dev
```

In a second terminal:

```bash
cd frontend
npm run dev
```

## Deployment

Deployment references:

- Backend blueprint: [`render.yaml`](./render.yaml)
- Frontend config: [`frontend/vercel.json`](./frontend/vercel.json)
- Checklist: [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md)

## Verification

From the repo root:

```bash
npm test
npm run frontend:test
npm run frontend:lint
npm run frontend:build
```

## About

Built by Sahil Pal.

- GitHub: [`saahilpal`](https://github.com/saahilpal)
- LinkedIn: [`sahiilpal`](https://www.linkedin.com/in/sahiilpal)

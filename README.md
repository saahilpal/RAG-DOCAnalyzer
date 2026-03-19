# Document Analyzer RAG

Chat with your documents. Like ChatGPT, but context-aware.

## Overview

Document Analyzer RAG is a chat-first application for asking questions, exploring PDFs, and carrying context forward across follow-up messages. Instead of treating uploaded files like a dashboard or document management system, the product keeps the experience centered on conversation. Documents become lightweight attachments to a chat, so the assistant can answer naturally while staying grounded in the right sources.

This makes the workflow useful for research, internal notes, product planning, hiring packets, policies, and any other documents that need explanation, synthesis, or comparison through a conversational interface.

## Features

- Conversational RAG with multi-turn context
- Multi-document retrieval scoped to the active chat
- Streaming responses over Server-Sent Events
- Async PDF processing with clear document states
- OTP-based authentication with session restore
- Chat history sidebar with isolated per-chat context
- Vector retrieval with PostgreSQL FTS fallback

## How It Works

1. Start a chat and optionally attach up to three PDFs.
2. The backend stores and indexes documents asynchronously while the UI reflects upload and processing state.
3. Each message uses recent chat history plus retrieved chunks from attached documents to generate a streamed response.

## Tech Stack

- Frontend: Next.js, React, Tailwind CSS, Framer Motion
- Backend: Node.js, Express
- Database: PostgreSQL on Supabase
- File Storage: Supabase Storage
- AI: Google Gemini for generation and optional embeddings
- Deployment: Vercel for frontend, Render for backend

## Preview

The interface is a minimal chat workspace with:

- a sidebar for chat history
- a streaming conversation thread
- lightweight document attachment chips
- OTP sign-in and session restore

Technical architecture artwork is available at [`docs/architecture.svg`](./docs/architecture.svg).

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

Required backend variables include:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `JWT_SECRET`
- `CORS_ORIGIN`
- SMTP credentials for OTP email delivery

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

The project is structured for:

- Vercel for the Next.js frontend
- Render for the Express backend
- Supabase for PostgreSQL and file storage

Deployment references:

- Backend blueprint: [`render.yaml`](./render.yaml)
- Frontend config: [`frontend/vercel.json`](./frontend/vercel.json)
- Step-by-step deployment guide: [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md)

## Verification

From the repo root:

```bash
npm test
npm run frontend:test
npm run frontend:lint
npm run frontend:build
```

## Future Improvements

- Dedicated worker service for higher indexing throughput
- Richer retrieval reranking and citation UX
- Chat export and workspace sharing

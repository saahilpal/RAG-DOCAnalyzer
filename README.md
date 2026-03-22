# Document Analyzer RAG

Chat with your documents using AI.

Document Analyzer RAG is a chat-first document analysis product built around one clear flow:

1. Upload a PDF
2. Let the system process it
3. Ask focused questions about the document

The product is intentionally strict about staying grounded in uploaded document context. It avoids pretending to understand an entire file when retrieval is weak, and it guides users toward specific follow-up questions instead.

## What The Product Does

- Uploads PDF documents into a chat workspace
- Processes them asynchronously into searchable chunks
- Retrieves relevant context for each user question
- Streams grounded answers back into the conversation
- Handles signup, email verification, login, and password reset with SMTP email delivery

## Why It Exists

Most document chat demos either look like generic chatbots or overloaded file dashboards. This project keeps the experience simpler and more honest:

- The conversation is the primary interface
- Upload, processing, and ready states are visible in the thread
- The assistant stays document-grounded
- Broad prompts are redirected instead of answered misleadingly

## Product Flow

```text
Sign up / Sign in
  -> Upload PDF in chat
  -> Document indexes in the background
  -> Ask a specific question
  -> Backend retrieves relevant context
  -> Gemini streams a grounded answer
```

## Core Features

- Chat-first document workflow with upload, processing, and ready states
- Strict document-grounded answers with vague-query and no-match guidance
- Streaming assistant responses over SSE
- Email + password auth with verification and password reset codes
- Persistent chat controls: create, rename, pin, and delete
- Private Supabase Storage for uploaded files
- Configurable retrieval with vector search and PostgreSQL FTS fallback
- Daily chat quota and workspace diagnostics

## Tech Stack

- Frontend: Next.js, React, Tailwind CSS, Framer Motion
- Backend: Node.js, Express
- Database: PostgreSQL (Supabase)
- Storage: Supabase Storage
- AI: Google Gemini
- Email: Nodemailer over Gmail SMTP
- Deployment: Vercel for the frontend, Render for the backend

## Architecture

### System View

<p align="center">
  <img src="./docs/architecture.svg" alt="System architecture diagram" width="960" />
</p>

### RAG Flow

<p align="center">
  <img src="./docs/rag-architecture.svg" alt="RAG retrieval and generation flow diagram" width="960" />
</p>

Supporting docs:

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- [`docs/rag.md`](./docs/rag.md)
- [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md)

## Quick Start

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

Minimum backend variables:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

Frontend variable:

- `NEXT_PUBLIC_API_URL`

### 3. Initialize the database

Use `npm run db:schema` only against a fresh or disposable database. The schema file recreates core tables.

```bash
npm run db:schema
```

### 4. Start the app

Backend:

```bash
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

### 5. Use the product locally

1. Create an account with email and password.
2. Verify the emailed code.
3. Open the workspace and upload a PDF.
4. Wait until the assistant says the document is ready.
5. Ask focused questions about the uploaded document.

## Scripts

From the repository root:

```bash
npm run dev
npm run test
npm run frontend:lint
npm run frontend:test
npm run frontend:build
```

## Deployment

Deployment references:

- Backend blueprint: [`render.yaml`](./render.yaml)
- Frontend config: [`frontend/vercel.json`](./frontend/vercel.json)
- Checklist: [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md)

Production notes:

- Keep the Supabase `documents` bucket private.
- Set `NODE_OPTIONS=--dns-result-order=ipv4first` on Render.
- Use a Gmail App Password for `EMAIL_PASS`.
- Set `CORS_ORIGIN` to the exact frontend origin.

## Verification

Automated checks:

```bash
npm test
npm run frontend:test
npm run frontend:lint
npm run frontend:build
```

Recommended manual checks:

1. Sign up, verify email, and log in.
2. Upload a PDF and confirm the chat shows processing, then ready.
3. Ask a specific document question and confirm the answer streams.
4. Try a vague prompt such as `what is this` and confirm the app asks for a more specific question.
5. Try a question with no matching context and confirm the assistant asks for a narrower query instead of inventing an answer.

## About

Built by Sahil Pal.

- GitHub: [`saahilpal`](https://github.com/saahilpal)
- LinkedIn: [`sahiilpal`](https://www.linkedin.com/in/sahiilpal)

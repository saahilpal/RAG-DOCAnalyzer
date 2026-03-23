# Document Analyzer RAG

Chat with your documents using AI.

Document Analyzer RAG is a chat-first document analysis product built around one flow:

1. Sign in with Google
2. Upload a PDF
3. Let the system process it
4. Ask focused questions about the document

The product stays grounded in uploaded document context. It avoids pretending to understand an entire file when retrieval is weak, and it pushes users toward specific follow-up questions instead of vague summaries.

## Core Features

- Chat-first document workflow with upload, processing, and ready states
- Strict document-grounded answers with vague-query and no-match guidance
- Streaming assistant responses over SSE
- Firebase Google Authentication on the frontend
- Backend-owned JWT session cookie after Google sign-in
- Persistent chat controls: create, rename, pin, and delete
- Private Supabase Storage for uploaded files
- Configurable retrieval with vector search and PostgreSQL FTS fallback
- Daily chat quota and workspace diagnostics

## Tech Stack

- Frontend: Next.js, React, Tailwind CSS, Framer Motion, Firebase Web SDK
- Backend: Node.js, Express, Firebase Admin SDK
- Database: PostgreSQL (Supabase)
- Storage: Supabase Storage
- AI: Google Gemini
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

### 2. Create a Firebase project

1. Open the Firebase console.
2. Create or select your project.
3. Enable `Authentication -> Sign-in method -> Google`.
4. Add a web app and copy the Firebase web config.
5. Create a service account for the backend and copy:
   - project ID
   - client email
   - private key

### 3. Configure environment variables

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
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Minimum frontend variables:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 4. Initialize the database

Use `npm run db:schema` only against a fresh or disposable database. The schema file recreates core tables.

```bash
npm run db:schema
```

### 5. Start the app

Backend:

```bash
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

### 6. Use the product locally

1. Sign in with Google.
2. Open the workspace and upload a PDF.
3. Wait until the assistant says the document is ready.
4. Ask focused questions about the uploaded document.

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
- Use the Firebase Admin service account values on the backend.
- Set the Firebase web app config as `NEXT_PUBLIC_FIREBASE_*` variables on the frontend host.

## Verification

Automated checks:

```bash
npm test
npm run frontend:test
npm run frontend:lint
npm run frontend:build
```

Recommended manual checks:

1. Sign in with Google and confirm a user is created automatically.
2. Refresh the app and confirm `/api/v1/auth/me` restores the session.
3. Upload a PDF and confirm the chat shows processing, then ready.
4. Ask a specific document question and confirm the answer streams.
5. Try a vague prompt such as `what is this` and confirm the app asks for a more specific question.

## About

Built by Sahil Pal.

- GitHub: [`saahilpal`](https://github.com/saahilpal)
- LinkedIn: [`sahiilpal`](https://www.linkedin.com/in/sahiilpal)

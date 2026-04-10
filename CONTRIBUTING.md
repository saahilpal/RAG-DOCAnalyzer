# Contributing

Thanks for contributing to Document Analyzer.

This repository is split into:

- a root Express backend
- a `frontend/` Next.js app
- a shared PostgreSQL schema in `database/schema.sql`

## Principles

- Keep documentation accurate to the code.
- Prefer small, reviewable pull requests.
- Do not introduce undocumented product behavior.
- Preserve the existing chat-first user flow unless the change explicitly expands it.

## Local Setup

### Install dependencies

```bash
npm install
npm --prefix frontend install
```

### Configure environment variables

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```

### Initialize the database

```bash
npm run db:schema
```

### Run the apps

Backend:

```bash
npm run dev
```

Frontend:

```bash
npm run frontend:dev
```

## Checks Before Opening A PR

Backend:

```bash
npm test
```

Frontend:

```bash
npm run frontend:test
npm run frontend:lint
npm run frontend:build
```

## Pull Request Guidelines

- Explain the user-visible change.
- Call out backend, frontend, schema, or deployment impact explicitly.
- Mention new environment variables if any are introduced.
- Update `README.md`, `ARCHITECTURE.md`, or `BACKEND_DOCS.md` when behavior changes.
- Include screenshots or short recordings for meaningful UI changes.

## Coding Notes

- Backend code uses CommonJS.
- Frontend code uses App Router, TypeScript, and client-side React context.
- The current hosted UX expects one active document in the chat workspace, even though backend limits allow more.
- SSE behavior and retry logic live in the frontend workspace hook and backend chat controller; keep those in sync.

## Documentation Policy

If you change any of the following, update the docs in the same pull request:

- route names or payloads
- environment variables
- indexing limits
- retrieval behavior
- authentication flow
- deployment steps

## Areas That Need Extra Care

- auth cookie behavior in local development
- worker retry semantics
- RAG prompt construction and fallback logic
- mismatch between frontend one-document UX and backend three-document schema limit

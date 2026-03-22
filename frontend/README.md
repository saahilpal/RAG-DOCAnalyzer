# Document Analyzer RAG Frontend

Next.js frontend for the chat-first RAG product.

## Pages

- `/` Marketing and product overview
- `/login` Email + password sign-in
- `/signup` Registration and email verification
- `/forgot-password` Password reset flow
- `/app` Main chat workspace
- `/app/documents` Placeholder documents screen
- `/app/settings` Workspace diagnostics and links

## UX Notes

- The main workspace is chat-only: no predefined summarize or compare buttons.
- Uploads appear inside the chat timeline with progress, processing, and ready states.
- The composer stays locked until one document is ready.
- The assistant guides users toward specific document questions instead of whole-document requests.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React

## Environment

```bash
cp .env.example .env.local
```

Required:

- `NEXT_PUBLIC_API_URL`

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run test
npm run lint
npm run build
```

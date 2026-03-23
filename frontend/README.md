# Document Analyzer RAG Frontend

Next.js frontend for the chat-first RAG product.

## Pages

- `/` Marketing and product overview
- `/login` Google sign-in
- `/signup` Google onboarding entry
- `/forgot-password` Google-auth guidance screen
- `/app` Main chat workspace
- `/app/documents` Placeholder documents screen
- `/app/settings` Workspace diagnostics and links

## UX Notes

- The main workspace is chat-only: no predefined summarize or compare buttons.
- Uploads appear inside the chat timeline with progress, processing, and ready states.
- The composer stays locked until one document is ready.
- The assistant guides users toward specific document questions instead of whole-document requests.
- Authentication is handled by Firebase Google sign-in, then exchanged for the backend session cookie.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Firebase Web SDK
- Lucide React

## Environment

```bash
cp .env.example .env.local
```

Required:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

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

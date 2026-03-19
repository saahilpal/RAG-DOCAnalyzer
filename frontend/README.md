# Document Analyzer RAG Frontend

Next.js frontend for the chat-first RAG product.

## Pages

- `/` Marketing and product overview
- `/login` OTP sign-in
- `/app` Main chat workspace
- `/app/settings` Workspace diagnostics and links

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

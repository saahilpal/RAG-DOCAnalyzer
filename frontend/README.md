# Document Analyzer RAG Frontend

Premium monochrome Next.js UI for a free-tier-safe RAG demo.

## Pages

- `/` Landing page with transparency notice, source links, and run-local guide
- `/login` Login
- `/signup` Signup
- `/app` Three-panel chat dashboard
- `/app/documents` Document manager
- `/app/settings` Limits + health + source links

## UI Stack

- Next.js App Router
- TypeScript
- TailwindCSS
- Framer Motion
- Lucide React

## Environment

```bash
cp .env.example .env.local
```

Required:

- `NEXT_PUBLIC_API_URL` (example: `http://localhost:4000`)

Vercel config:

- [`vercel.json`](./vercel.json)

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run build
```

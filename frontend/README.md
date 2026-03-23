# Frontend Documentation

Next.js client for Document Analyzer RAG.

## Purpose

The frontend handles:

- Firebase social login (Google + GitHub)
- Backend session bootstrap via `/api/v1/auth/google`
- Chat workspace (messages, upload, streaming responses)
- User quota and workspace settings UI

## Routes

- `/` Landing page
- `/login` Auth entry (Google + GitHub buttons)
- `/signup` Redirects to `/login`
- `/forgot-password` Redirects to `/login`
- `/app` Main workspace
- `/app/documents` Documents view
- `/app/settings` Settings helper page

## Authentication Flow

1. User signs in via Firebase popup provider
2. Frontend gets Firebase `idToken`
3. Frontend exchanges token with backend (`POST /api/v1/auth/google`)
4. Backend sets secure auth cookie
5. Frontend restores session with `GET /api/v1/auth/me`

## Environment Variables

Copy template:

```bash
cp .env.example .env.local
```

Required:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Production recommendation:

- `NEXT_PUBLIC_API_URL=https://api.docanalyzer.app`

## Development

```bash
npm install
npm run dev
```

## Quality Checks

```bash
npm run test
npm run lint
npm run build
```

## Integration Notes

- All API requests include credentials
- API calls use centralized base URL from `NEXT_PUBLIC_API_URL`
- Error handling maps API/Firebase errors to user-friendly messages
- Chat streaming is handled via SSE-compatible flow in the workspace hooks/components

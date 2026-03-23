# Deployment Checklist

Use this checklist before deploying the Google-auth version of Document Analyzer RAG.

## 1. Accounts and Services

- Supabase project is created and reachable.
- Gemini API key is available.
- Firebase project exists.
- Google sign-in is enabled in Firebase Authentication.
- A Firebase web app exists for the frontend.
- A Firebase service account exists for the backend.

## 2. Backend Environment

Set these on Render:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `JWT_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Recommended defaults are already captured in [`render.yaml`](./render.yaml) for non-secret values.

## 3. Frontend Environment

Set these on the frontend host:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## 4. Database

- Run `npm run db:schema` only on a fresh or disposable database.
- Confirm the `users` table includes:
  - `id`
  - `email`
  - `name`
  - `google_id`
  - `avatar_url`
- Confirm the `otp_codes` table is not recreated by the schema.

## 5. Auth Verification

- Sign in through Google from the frontend.
- Confirm the backend creates or updates the user row.
- Confirm the backend sets the JWT cookie.
- Confirm `GET /api/v1/auth/me` returns the signed-in user.
- Confirm protected chat routes still work with the existing cookie/JWT middleware.

## 6. Production Checks

- `https://api.docanalyzer.app/api/v1/health/live` returns success.
- The frontend calls `https://api.docanalyzer.app`.
- CORS is limited to the production frontend origins.
- Google popup sign-in works on the deployed frontend domain.
- Upload, processing, and streaming chat all still work after login.

## 7. Troubleshooting

- `401 AUTH_REQUIRED`: the backend cookie was not set or not sent with credentials.
- `401 AUTH_INVALID_TOKEN`: the JWT secret changed or the cookie is stale.
- `400 AUTH_EMAIL_REQUIRED`: the verified Google token did not include an email.
- `500 FIREBASE_CONFIG_MISSING`: the frontend Firebase web config is missing.
- Firebase Admin verification failures: check `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.

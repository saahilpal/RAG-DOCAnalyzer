# Comprehensive Deployment Guide (Supabase + Render + Vercel)

Follow these exact steps to deploy a production-ready instance of **RAG-DOCAnalyzer**.

---

## Prerequisites

1.  **GitHub Repository**: Ensure your code is pushed to your GitHub account.
2.  **Supabase Account**: For Postgres Database and PDF Storage.
3.  **Google AI Studio API Key**: For Gemini generation and embeddings.
4.  **Render Account**: To host the Node.js Express Backend.
5.  **Vercel Account**: To host the Next.js Frontend.
6.  **Gmail Account with App Password**: Required for SMTP-based verification and password reset emails.

---

## Step 1: Database & Storage (Supabase)

1.  **Create Project**: Log in to [Supabase](https://supabase.com/) and create a new project.
2.  **Run SQL Schema**:
    *   Navigate to the **SQL Editor** in your Supabase dashboard.
    *   Open `database/schema.sql` from this repository.
    *   Copy and paste the entire content into a new query and click **Run**.
    *   Use this only for a fresh or disposable database because the schema recreates core tables.
3.  **Enable Vector Extension**: (Included in schema.sql, but ensure it's active in **Database > Extensions**).
4.  **Configure Storage**:
    *   Go to **Storage > Buckets**.
    *   Create a new bucket named `documents`.
    *   Keep the bucket **Private**. The backend reads files with the service role and does not need public URLs.
5.  **Gather Credentials**:
    *   Go to **Project Settings > Database** to get your **Transaction Connection String** (`DATABASE_URL`).
    *   Go to **Project Settings > API** to get your **Project URL** (`SUPABASE_URL`) and **service_role key** (`SUPABASE_SERVICE_KEY`).

---

## Step 2: Backend Deployment (Render)

1.  **Create Web Service**:
    *   Log in to [Render](https://render.com/).
    *   Click **New > Web Service**.
    *   Connect your GitHub repository.
2.  **Configure Environment**:
    *   **Name**: `document-analyzer-backend`
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
3.  **Set Environment Variables**: Click **Advanced > Add Environment Variable** and add:
    *   `NODE_ENV`: `production`
    *   `NODE_OPTIONS`: `--dns-result-order=ipv4first`
    *   `DATABASE_URL`: (Your Supabase connection string)
    *   `SUPABASE_URL`: (Your Supabase Project URL)
    *   `SUPABASE_SERVICE_KEY`: (Your Supabase service_role key)
    *   `GEMINI_API_KEY`: (Your Google Gemini API Key)
    *   `JWT_SECRET`: (A long, random string for auth security)
    *   `CORS_ORIGIN`: (Your Vercel frontend URL)
    *   `EMAIL_USER`: (Your Gmail address)
    *   `EMAIL_PASS`: (A Gmail App Password, not your main account password)
    *   `EMAIL_FROM`: (A sender string such as `DocAnalyzer <your_gmail_address@gmail.com>`)
    *   Optional: import the remaining defaults from [`render.yaml`](./render.yaml)
4.  **Wait for Deployment**: Render will build and deploy your backend. Note your service URL (e.g., `https://backend.onrender.com`).

---

## Step 3: Frontend Deployment (Vercel)

1.  **Create Project**:
    *   Log in to [Vercel](https://vercel.com/).
    *   Click **Add New > Project**.
    *   Import your GitHub repository.
2.  **Configure Project Settings**:
    *   **Root Directory**: Set this to `frontend`.
    *   **Framework Preset**: `Next.js`.
3.  **Set Environment Variables**:
    *   `NEXT_PUBLIC_API_URL`: (The URL of your **Render Backend** from Step 2).
4.  **Deploy**: Click **Deploy**. Vercel will provide your frontend URL (e.g., `https://rag-docanalyzer.vercel.app`).

---

## Step 4: Final Linkage (CORS)

1.  **Update Backend CORS**:
    *   Go back to **Render > Environment Variables**.
    *   Update `CORS_ORIGIN` to your **Vercel Frontend URL** (e.g., `https://rag-docanalyzer.vercel.app`).
    *   Render will automatically redeploy with the restricted CORS policy.

---

## Step 5: Post-Deployment Verification

1.  **Health Check**: Visit `https://your-backend.onrender.com/api/v1/health/live` (should see `{ "ok": true }`).
2.  **Ready Check**: Visit `https://your-backend.onrender.com/api/v1/health/ready` (should see `status: ready`).
3.  **Sign Up**: Create an account, request a verification code, and confirm the code arrives by email.
4.  **Login**: Sign in with the verified account.
5.  **Upload**: Upload a PDF and wait for the assistant to show the ready message.
6.  **Chat**: Ask a specific question and ensure tokens stream back via SSE.
7.  **Guardrails**: Try a vague prompt such as `what is this` and confirm the app asks for a more specific question.

---

## Troubleshooting

*   **Database Errors**: Ensure you used the `service_role` key, not the `anon` key.
*   **Upload Fails**: Check if the `documents` bucket exists, is private, and your backend is using the service role key.
*   **Email Fails**: Confirm `EMAIL_USER`, `EMAIL_PASS`, and `EMAIL_FROM` are set correctly and that `EMAIL_PASS` is a Gmail App Password.
*   **Render SMTP IPv6 Errors**: Keep `NODE_OPTIONS=--dns-result-order=ipv4first` in the backend environment.
*   **CORS Issues**: Double-check `CORS_ORIGIN` in Render matches your Vercel URL exactly (no trailing slash).
*   **AI Timeouts**: Review your Gemini quota and timeout settings if generation or embedding requests start failing under load.

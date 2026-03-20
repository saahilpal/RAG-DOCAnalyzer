# Comprehensive Deployment Guide (Supabase + Render + Vercel)

Follow these exact steps to deploy a production-ready instance of **RAG-DOCAnalyzer**.

---

## Prerequisites

1.  **GitHub Repository**: Ensure your code is pushed to your GitHub account.
2.  **Supabase Account**: For Postgres Database and PDF Storage.
3.  **Google AI Studio API Key**: For Gemini generation and embeddings.
4.  **Render Account**: To host the Node.js Express Backend.
5.  **Vercel Account**: To host the Next.js Frontend.
6.  **Resend Account** (Required for OTP delivery): Create an API key and verify your sending domain.

---

## Step 1: Database & Storage (Supabase)

1.  **Create Project**: Log in to [Supabase](https://supabase.com/) and create a new project.
2.  **Run SQL Schema**:
    *   Navigate to the **SQL Editor** in your Supabase dashboard.
    *   Open `database/schema.sql` from this repository.
    *   Copy and paste the entire content into a new query and click **Run**.
3.  **Enable Vector Extension**: (Included in schema.sql, but ensure it's active in **Database > Extensions**).
4.  **Configure Storage**:
    *   Go to **Storage > Buckets**.
    *   Create a new bucket named `documents`.
    *   Set the bucket to **Public** (required for easy retrieval via Public URLs).
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
    *   `DATABASE_URL`: (Your Supabase connection string)
    *   `SUPABASE_URL`: (Your Supabase Project URL)
    *   `SUPABASE_SERVICE_KEY`: (Your Supabase service_role key)
    *   `GEMINI_API_KEY`: (Your Google Gemini API Key)
    *   `JWT_SECRET`: (A long, random string for auth security)
    *   `CORS_ORIGIN`: (Initially `*` or your Vercel URL once deployed)
    *   `RESEND_API_KEY`: (Your Resend API key)
    *   `RESEND_FROM`: (A verified sender, for example `"DocAnalyzer" <noreply@yourdomain.com>`)
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
3.  **OTP Sign-In**: Request a verification code from the deployed frontend and verify that the code arrives by email.
4.  **Upload**: Upload a PDF and wait for indexing.
5.  **Chat**: Ask a question and ensure tokens stream back via SSE.

---

## Troubleshooting

*   **Database Errors**: Ensure you used the `service_role` key, not the `anon` key.
*   **Upload Fails**: Check if the `documents` bucket exists and is public in Supabase Storage.
*   **CORS Issues**: Double-check `CORS_ORIGIN` in Render matches your Vercel URL exactly (no trailing slash).
*   **AI Timeouts**: Review your Gemini quota and timeout settings if generation or embedding requests start failing under load.

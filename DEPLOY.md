# Deployment Guide: Mewzy

This guide explains how to deploy the "Mewzy" app using **Vercel** (Frontend), **Render** (Backend), and **Supabase** (Database).

## 1. Database (Supabase)
*You mentioned this is already connected.*
- **Required Info**: Get your `Connection String` from Supabase Settings -> Database -> Connection String -> URI.
- **Format**: `postgresql://postgres:[PASSWORD]@db.supabase.co:5432/postgres`

## 2. Backend (Render)
1.  **Create New Web Service**: Connect your GitHub repo.
2.  **Root Directory**: `.` (or leave empty if it handles root).
3.  **Build Command**: `pip install -r requirements.txt`
4.  **Start Command**: `gunicorn server.wsgi:app`
5.  **Environment Variables**:
    - `PYTHON_VERSION`: `3.10.0` (or similar)
    - `DATABASE_URL`: (Paste your Supabase connection string here)
    - `JWT_SECRET_KEY`: (Generate a secure random string)
    - `FRONTEND_URL`: `https://your-vercel-app-name.vercel.app` (You will get this after Step 3, come back and update it).

## 3. Frontend (Vercel)
1.  **Add New Project**: Import the same GitHub repo.
2.  **Framework Preset**: Vite
3.  **Root Directory**: `client` (Important! Usage `Select` to pick the client folder).
4.  **Environment Variables**:
    - `VITE_API_URL`: `https://your-render-app-name.onrender.com` (Get this from the Render dashboard).
5.  **Deploy**: Click Deploy.

## 4. Final Connection
- Once Vercel deploys, copy the *actual* domain (e.g., `https://mewzy.vercel.app`).
- Go back to **Render** -> Environment Variables.
- Update `FRONTEND_URL` with this value.
- **Redeploy** Render if needed (usually auto-redeploys on env change).

## Troubleshooting
- **CORS Errors**: Check `FRONTEND_URL` in Render matches your Vercel URL exactly (no trailing slash usually).
- **Database Errors**: Ensure Supabase allows connections.
- **Password Issues**: If your database password has special characters (like `/`, `#`, or `@`), you MUST URL-encode them in the connection string (e.g., replace `/` with `%2F`). Check your `DATABASE_URL`.

# Mewsic - Advanced Music Streaming App

A full-stack music streaming application built with React and Flask, featuring YouTube Music integration, local user uploads, and smart playback features.

## Features

-   **Discovery**: Search and stream songs, albums, and playlists from YouTube Music.
-   **Podcasts**: Dedicated section for podcasts and episodes.
-   **User Uploads**: Upload your own MP3 files to your personal library.
-   **Smart Resume**: Automatically remembers playback position for all tracks.
-   **Playlists**: Create, edit, and import playlists (including from YouTube).
-   **Admin Dashboard**: Manage tracks and platform content.
-   **Responsive Design**: Mobile-first UI with a premium dark mode aesthetic.

## Tech Stack

-   **Frontend**: React, Vite, TailwindCSS, Framer Motion.
-   **Backend**: Flask, SQLAlchemy, JWT Extended.
-   **Database**: SQLite (Development).
-   **Integrations**: `ytmusicapi`, `yt-dlp`.

## Installation

### Prerequisites
-   Python 3.8+
-   Node.js 16+

### 1. Backend Setup
Navigate to the root directory:
```bash
# Install Python dependencies
pip install -r server/requirements.txt
```

Create a `.env` file in the `server` directory (optional for dev, required for prod):
```env
JWT_SECRET_KEY=your-super-secret-key-change-this
DATABASE_URL=sqlite:///mewsic.db
```

Start the Server:
```bash
# Run from the project root (NOT inside server/)
python run.py
```
The API will run at `http://127.0.0.1:5000`.

### 2. Frontend Setup
Navigate to the client directory:
```bash
cd client
npm install
```

Start the Development Server:
```bash
npm run dev
```
The app will open at `http://localhost:5173`.

## API Documentation

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **Auth** | | | |
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Login and get JWT token | No |
| **Content** | | | |
| `GET` | `/api/search?q=...` | Search songs/podcasts (YT Music) | No |
| `GET` | `/api/feed` | Get homepage global hits | No |
| `GET` | `/api/recommendations`| Personal recommendations | Yes (Optional) |
| `GET` | `/api/flow` | Infinite radio mix (My Flow) | Yes (Optional) |
| `GET` | `/api/stream/<id>` | Stream audio by ID | No |
| **Playlists** | | | |
| `GET` | `/api/playlists` | Get user playlists | Yes |
| `POST` | `/api/playlists` | Create playlist | Yes |
| `POST` | `/api/playlists/:id/tracks` | Add song to playlist | Yes |

## Deployment Guide

### 1. Database (Neon/Supabase)
1.  Create a PostgreSQL project on [Supabase](https://supabase.com) or [Neon.tech](https://neon.tech).
2.  Copy the connection string (e.g., `postgresql://user:pass@host:5432/db`).

### 2. Backend (Render)
1.  Create a **Web Service** on [Render](https://render.com).
2.  Connect your GitHub repo.
3.  **Root Directory**: `.` (Leave empty)
4.  **Build Command**: `pip install -r requirements.txt`
5.  **Start Command**: `gunicorn server.app:app`
6.  **Environment Variables**:
    *   `DATABASE_URL`: (Paste your Postgres URL)
    *   `JWT_SECRET_KEY`: (Generate a random string)

### 3. Frontend (Vercel)
1.  Import project on [Vercel](https://vercel.com).
2.  **Root Directory**: Select `client`.
3.  **Build Command**: `vite build` (Default)
4.  **Output Directory**: `dist` (Default)
5.  **Environment Variables**:
    *   `VITE_API_URL`: (Your Render Backend URL, e.g., `https://mewsic-api.onrender.com`)

## Directory Structure

-   `run.py`: Entry point for the backend.
-   `server/`: Flask backend source code.
    -   `routes/`: API Blueprints (Auth, Player, Content, etc.).
    -   `models.py`: Database schemas.
-   `client/`: React frontend.
    -   `src/components/`: Reusable UI components.
    -   `src/context/`: State management (PlayerContext).

## License
MIT

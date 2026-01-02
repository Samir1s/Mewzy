# 🎵 Melo - AI-Powered Music Streaming App

A full-stack music and podcast streaming application built with Python (Flask) and React.

## 🚀 Features
- **Smart Search:** Search millions of songs and podcasts via YouTube Music API.
- **Admin Upload:** Secure admin panel to upload custom tracks (MP3/WAV).
- **User Library:** Create playlists, like songs, and resume playback.
- **Premium UI:** Glassmorphism design with dynamic color extraction.
- **Audio Visualizer:** Real-time audio visualization using HTML5 Audio Context.

## 🛠 Tech Stack
- **Backend:** Python, Flask, SQLAlchemy, JWT, FFmpeg (yt-dlp)
- **Frontend:** React.js, Tailwind CSS, Framer Motion, Lucide Icons
- **Database:** PostgreSQL (Production) / SQLite (Dev)

## 📦 Installation

### Backend
1. `cd backend`
2. `pip install -r requirements.txt`
3. `python app.py`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## 🔑 Admin Access
The **first user** registered in the system is automatically granted **Admin** privileges. 
Admins can access the "Upload" tab to add custom tracks to the global library.

## 📝 Documentation
See `music player documentation.pdf` for the detailed 2-week development plan followed for this project.
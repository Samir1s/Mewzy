import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import API_URL from '../config';
import API_URL from '../config';
import { getImageUrl, fixUrl } from '../utils/urlUtils';

const PlayerContext = createContext();
export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
    // --- PERSISTENCE: HYDRATE STATE FROM LOCALSTORAGE ---
    // HELPER: Sanitize a song object (fix stale localhost URLs)
    const sanitizeSong = (song) => {
        if (!song) return null;
        return {
            ...song,
            cover: fixUrl(song.cover),
            stream_url: fixUrl(song.stream_url)
        };
    };

    const [currentSong, setCurrentSong] = useState(() => {
        const saved = localStorage.getItem('last_played_song');
        if (!saved) return null;
        try {
            const parsed = JSON.parse(saved);
            return sanitizeSong(parsed);
        } catch (e) { return null; }
    });
    const [isPlaying, setIsPlaying] = useState(false);
    const [playlists, setPlaylists] = useState([]);
    const [likedSongs, setLikedSongs] = useState(new Set());

    // --- QUEUE SYSTEM ---
    const [queue, setQueue] = useState(() => {
        const saved = localStorage.getItem('last_queue');
        if (!saved) return [];
        try {
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed.map(sanitizeSong) : [];
        } catch (e) { return []; }
    });
    const [currentIndex, setCurrentIndex] = useState(() => {
        const saved = localStorage.getItem('last_index');
        return saved ? parseInt(saved) : -1;
    });

    const audioRef = useRef(new Audio());
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    // --- STATE: VOLUME, SHUFFLE, REPEAT ---
    const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('player_volume') || '1'));
    const [isMuted, setIsMuted] = useState(false);
    const [prevVolume, setPrevVolume] = useState(1);
    const [repeatMode, setRepeatMode] = useState(0); // 0: None, 1: All, 2: One
    const [isShuffle, setIsShuffle] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Sync Volume
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
            localStorage.setItem('player_volume', volume);
        }
    }, [volume, isMuted]);

    const toggleMute = useCallback(() => {
        if (isMuted) {
            setIsMuted(false);
        } else {
            setPrevVolume(volume);
            setIsMuted(true);
        }
    }, [isMuted, volume]);


    // --- PERSISTENCE: SAVE STATE ON CHANGE ---
    useEffect(() => {
        if (currentSong) {
            localStorage.setItem('last_played_song', JSON.stringify(currentSong));
            localStorage.setItem('last_queue', JSON.stringify(queue));
            localStorage.setItem('last_index', currentIndex.toString());
        }
    }, [currentSong, queue, currentIndex]);

    // Save progress globally for simple resume
    useEffect(() => {
        const interval = setInterval(() => {
            if (currentSong && audioRef.current && !audioRef.current.paused) {
                localStorage.setItem('last_active_time', audioRef.current.currentTime.toString());
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [currentSong]);

    // --- AUTO-RESUME ENGINE ON RELOAD ---
    useEffect(() => {
        if (currentSong && !audioRef.current.src) {
            const savedPos = localStorage.getItem('last_active_time');
            audioRef.current.src = currentSong.stream_url;
            audioRef.current.crossOrigin = "anonymous";
            // Do NOT auto-play, just prepare the state
            if (savedPos) {
                const startT = parseFloat(savedPos);
                if (!isNaN(startT)) audioRef.current.currentTime = startT;
            }
        }
    }, []);

    // ... (getToken, logoutIfUnauthorized, apiFetch, notify - Unchanged) ...
    const getToken = useCallback(() => {
        const t = localStorage.getItem('token');
        if (!t || t === 'undefined' || t === 'null') return null;
        return t.replace(/^"|"$/g, '');
    }, []);

    const logoutIfUnauthorized = useCallback((res) => {
        if (!res) return false;
        if (res.status === 401 || res.status === 403) {
            // Only reload if we actually THOUGHT we were logged in (had a token)
            if (getToken()) {
                localStorage.removeItem('token');
                alert('Session expired. Please login again.');
                window.location.reload();
                return true;
            }
            // For guests, just return true so calling function knows it failed, but don't reload
            return true;
        }
        return false;
    }, [getToken]);

    const apiFetch = useCallback(async (url, options = {}) => {
        const token = getToken();
        const headers = { ...(options.headers || {}) };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (!headers['Content-Type'] && options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
        try {
            const res = await fetch(url, { ...options, headers });
            logoutIfUnauthorized(res);
            return res;
        } catch (e) {
            console.error('apiFetch error', e);
            throw e;
        }
    }, [getToken, logoutIfUnauthorized]);

    const [notification, setNotification] = useState(null);
    const notify = useCallback((message, type = 'info', timeout = 3500) => {
        setNotification({ message, type });
        if (timeout) setTimeout(() => setNotification(null), timeout);
    }, []);

    const saveProgress = useCallback((song, time) => {
        if (!song) return;
        apiFetch(`${API_URL}/api/history/update`, {
            method: 'POST',
            body: JSON.stringify({ id: song.id, title: song.title, artist: song.artist, cover: song.cover, duration: song.duration, timestamp: time })
        }).catch(() => { });
    }, [apiFetch]);

    useEffect(() => {
        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 512;
            const enableAudio = () => {
                if (audioRef.current && !sourceRef.current) {
                    try {
                        sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
                        sourceRef.current.connect(analyserRef.current);
                        analyserRef.current.connect(audioContextRef.current.destination);
                    } catch (e) { console.log("Audio Init"); }
                }
            };
            document.addEventListener('click', enableAudio, { once: true });
        }
    }, []);

    const togglePlay = useCallback(() => {
        if (!audioRef.current.src) return;
        if (audioRef.current.paused) {
            audioRef.current.play().catch(e => console.error(e));
            setIsPlaying(true);
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }, []);

    // Force Play param added to bypass toggle logic (Prevent 'Previous' button pause bug)
    const playSong = async (song, sourceList = null, forcePlay = false) => {
        if (!song) return;

        // HARDENING: Sanitize song immediately upon entry
        const cleanSong = sanitizeSong(song);

        if (currentSong?.id === cleanSong.id && audioRef.current.src && !forcePlay) return togglePlay();

        if (sourceList && Array.isArray(sourceList)) {
            // Sanitize list too
            const cleanList = sourceList.map(sanitizeSong);
            setQueue(cleanList);
            const idx = cleanList.findIndex(s => s.id === cleanSong.id);
            setCurrentIndex(idx !== -1 ? idx : 0);
        } else if (queue.length > 0) {
            const idx = queue.findIndex(s => s.id === cleanSong.id);
            if (idx !== -1) setCurrentIndex(idx);
        }

        if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();

        // New song always starts at 0 unless we are resuming (which is handled by initial effect, not playSong)
        let startPosition = 0;

        setCurrentSong(cleanSong);
        setIsPlaying(true);

        audioRef.current.crossOrigin = "anonymous";
        audioRef.current.src = cleanSong.stream_url;

        // History Update
        try {
            const localKey = 'local_recent_history_v1';
            const raw = localStorage.getItem(localKey);
            const list = raw ? JSON.parse(raw) : [];
            const item = { id: song.id, title: song.title, artist: song.artist, cover: song.cover, duration: song.duration, stream_url: song.stream_url, ts: Date.now() };
            const filtered = list.filter(i => i.id !== item.id);
            filtered.unshift(item);
            const truncated = filtered.slice(0, 50);
            localStorage.setItem(localKey, JSON.stringify(truncated));
            try { window.dispatchEvent(new CustomEvent('localRecentUpdated', { detail: item })); } catch (e) { }
        } catch (e) { }

        if (audioRef.current.readyState >= 1) {
            // Check for resume time
            const token = getToken();
            let startAt = 0;
            if (token) {
                try {
                    const res = await fetch(`${API_URL}/api/history/${song.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                    const data = await res.json();
                    if (data && data.timestamp > 5) { // Only resume if > 5 seconds in
                        // If song is almost over (<10s left), restart
                        const duration = audioRef.current.duration;
                        if (!duration || (duration - data.timestamp > 10)) {
                            startAt = data.timestamp;
                            notify(`Resumed at ${Math.floor(startAt / 60)}:${Math.floor(startAt % 60).toString().padStart(2, '0')}`);
                        }
                    }
                } catch (e) { console.log("Resume fetch failed", e); }
            }

            audioRef.current.currentTime = startAt;
            audioRef.current.play().catch(e => console.error("Play failed", e));
        } else {
            audioRef.current.addEventListener('loadedmetadata', async () => {
                // Check for resume time (Duplicate logic for async load)
                const token = getToken();
                let startAt = 0;
                if (token) {
                    try {
                        const res = await fetch(`${API_URL}/api/history/${song.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                        const data = await res.json();
                        if (data && data.timestamp > 5) {
                            const duration = audioRef.current.duration;
                            if (!duration || (duration - data.timestamp > 10)) {
                                startAt = data.timestamp;
                                notify(`Resumed at ${Math.floor(startAt / 60)}:${Math.floor(startAt % 60).toString().padStart(2, '0')}`);
                            }
                        }
                    } catch (e) { console.log("Resume fetch failed", e); }
                }
                audioRef.current.currentTime = startAt;
                audioRef.current.play().catch(e => console.error("Play failed", e));
            }, { once: true });
        }
    };

    // --- REFINED NEXT SONG (TASTE-BASED AUTOPLAY) ---
    const nextSong = useCallback(async () => {
        if (queue.length === 0 || currentIndex === -1) return;

        // If at the end of manual queue, fetch recommendations
        if (currentIndex === queue.length - 1 && currentSong) {
            notify("Queue ended. Finding more you'll like...", 'info');
            try {
                const token = getToken();
                const res = await fetch(`${API_URL}/api/radio/${currentSong.id}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                const recommended = await res.json();

                if (recommended && recommended.length > 0) {
                    const filtered = recommended.filter(s => s.id !== currentSong.id);
                    const newQueue = [...queue, ...filtered];
                    setQueue(newQueue);
                    setCurrentIndex(currentIndex + 1);
                    playSong(filtered[0], newQueue);
                    return;
                }
            } catch (e) {
                console.error("Autoplay recommendation failed", e);
            }
        }

        const nextIndex = (currentIndex + 1) % queue.length;
        playSong(queue[nextIndex], null, true); // Force play next
    }, [queue, currentIndex, currentSong, getToken, notify]);

    // --- PREVIOUS SONG (YOUTUBE LOGIC) ---
    const prevSong = useCallback(() => {
        if (queue.length === 0 || currentIndex === -1) return;

        // 1. If song played > 3s, just restart it
        if (audioRef.current.currentTime > 3) {
            audioRef.current.currentTime = 0;
            // Ensure it's playing
            if (audioRef.current.paused) audioRef.current.play();
            setIsPlaying(true);
            return;
        }

        // 2. Go to previous index
        const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
        playSong(queue[prevIndex], null, true); // Force play prevents toggle-pause bug
    }, [queue, currentIndex]);

    // --- QUEUE MANAGEMENT ---
    const addToQueue = useCallback((song) => {
        setQueue(prev => {
            const exists = prev.some(s => s.id === song.id);
            if (exists) {
                notify("Song already in queue", 'info');
                return prev;
            }
            notify("Added to queue", 'success');
            return [...prev, song];
        });
    }, [notify]);

    // --- AUTO-SAVE HISTORY (10s) ---
    useEffect(() => {
        if (!currentSong || !isPlaying) return;

        // Save history after 10 seconds to update recommendations
        const timer = setTimeout(() => {
            if (audioRef.current && !audioRef.current.paused) {
                saveProgress(currentSong, audioRef.current.currentTime);
                // Also trigger a local event to update UI immediately if needed
                try {
                    const item = { id: currentSong.id, title: currentSong.title, artist: currentSong.artist, cover: currentSong.cover, duration: currentSong.duration, stream_url: currentSong.stream_url, ts: Date.now() };
                    window.dispatchEvent(new CustomEvent('localRecentUpdated', { detail: item }));
                } catch (e) { }
            }
        }, 10000);

        return () => clearTimeout(timer);
    }, [currentSong, isPlaying, saveProgress]);

    // --- AUTO-ADVANCE ON END ---
    useEffect(() => {
        const audio = audioRef.current;
        const handleEnded = () => {
            saveProgress(currentSong, 0);
            nextSong();
        };
        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    }, [currentSong, nextSong, saveProgress]);




    useEffect(() => {
        const handleKey = (e) => {
            // Ignore if typing in an input
            const activeTag = document.activeElement ? document.activeElement.tagName : '';
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement.isContentEditable) return;

            const code = e.code;
            const key = e.key.toLowerCase();
            const shift = e.shiftKey;

            // 1. Play/Pause (Space, K)
            if (code === 'Space' || key === 'k') {
                e.preventDefault();
                togglePlay();
            }

            // 2. Navigation (Shift+N, Shift+P)
            else if (shift && key === 'n') {
                nextSong();
            }
            else if (shift && key === 'p') {
                prevSong();
            }

            // 3. Seek (J, L, Arrows)
            else if (key === 'j') {
                if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
            }
            else if (key === 'l') {
                if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 10);
            }
            else if (key === 'arrowleft') {
                e.preventDefault();
                if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
            }
            else if (key === 'arrowright') {
                e.preventDefault();
                if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 5);
            }

            // 4. Volume (Up/Down)
            else if (key === 'arrowup') {
                e.preventDefault();
                setVolume(v => Math.min(v + 0.1, 1));
                setIsMuted(false);
            }
            else if (key === 'arrowdown') {
                e.preventDefault();
                setVolume(v => Math.max(v - 0.1, 0));
            }
            else if (key === 'm') {
                toggleMute();
            }

            // 6. Fullscreen (F)
            else if (key === 'f') {
                e.preventDefault();
                setIsExpanded(prev => !prev);
            }

            // 7. Escape (Close)
            else if (code === 'Escape') {
                e.preventDefault();
                setIsExpanded(false);
            }

            // 5. Seek % (0-9)
            else if (key >= '0' && key <= '9') {
                const pct = parseInt(key) / 10;
                if (audioRef.current && audioRef.current.duration) audioRef.current.currentTime = audioRef.current.duration * pct;
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [togglePlay, nextSong, prevSong, toggleMute, setIsExpanded]);

    const fetchLibrary = async () => {
        if (!getToken()) return; // Don't fetch for guests
        try {
            const [pRes, lRes] = await Promise.all([
                apiFetch(`${API_URL}/api/playlists`),
                apiFetch(`${API_URL}/api/likes`)
            ]);

            if (pRes && pRes.ok) setPlaylists(await pRes.json());
            if (lRes && lRes.ok) {
                const data = await lRes.json();
                setLikedSongs(new Set(data.map(s => s.id)));
            }
        } catch (e) { console.error("Library Fetch Error:", e); }
    };

    useEffect(() => { fetchLibrary(); }, []);

    const createPlaylist = async (name) => {
        const token = getToken();
        if (!token) return notify("Please login to create playlists", 'error');
        try {
            const res = await apiFetch(`${API_URL}/api/playlists`, {
                method: 'POST',
                body: JSON.stringify({ name })
            });
            if (!res.ok) {
                if (res.status === 422 || res.status === 401) {
                    notify("Session invalid. Please logout and login again.", 'error');
                    return;
                }
                notify('Failed to create playlist', 'error');
                throw new Error("Failed to create");
            }
            notify('Playlist created', 'success');
            fetchLibrary();
        } catch (e) { console.error(e); }
    };

    const addToPlaylist = async (pId, song) => {
        const token = getToken();
        if (!token) return notify('Login required', 'error');
        try {
            const res = await apiFetch(`${API_URL}/api/playlists/${pId}/tracks`, {
                method: 'POST',
                body: JSON.stringify({ id: song.id, title: song.title, artist: song.artist, cover: song.cover, duration: song.duration })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                notify(err.error || 'Failed to add to playlist', 'error');
                return;
            }
            notify('Added to playlist', 'success');
            fetchLibrary();
        } catch (e) {
            console.error('Add to playlist failed', e);
            notify('Add failed', 'error');
        }
    };

    const deletePlaylist = async (pId) => {
        const token = getToken();
        if (!token) return notify('Login required', 'error');
        try {
            const res = await apiFetch(`${API_URL}/api/playlists/${pId}`, { method: 'DELETE' });
            if (res.ok) {
                notify('Playlist deleted', 'success');
                fetchLibrary();
                return true;
            } else {
                const err = await res.json().catch(() => ({}));
                notify(err.error || 'Failed to delete playlist', 'error');
            }
        } catch (e) {
            console.error('Delete playlist failed', e);
            notify('Delete failed', 'error');
        }
        return false;
    };

    const removeFromPlaylist = async (pId, videoId) => {
        const token = getToken();
        if (!token) return notify('Login required', 'error');
        try {
            const res = await apiFetch(`${API_URL}/api/playlists/${pId}/tracks/${videoId}`, { method: 'DELETE' });
            if (res.ok) {
                notify('Track removed', 'success');
                return true;
            } else {
                const err = await res.json().catch(() => ({}));
                notify(err.error || 'Failed to remove track', 'error');
            }
        } catch (e) {
            console.error('Remove track failed', e);
            notify('Remove failed', 'error');
        }
        return false;
    };

    const fetchPlaylistTracks = async (pId) => {
        try {
            const res = await apiFetch(`${API_URL}/api/playlists/${pId}`);
            if (!res || !res.ok) return [];
            const data = await res.json();
            return data.tracks || [];
        } catch (e) {
            console.error('Fetch playlist failed', e);
            return [];
        }
    };

    // --- MEDIA SESSION API (Hardware Media Keys) ---
    useEffect(() => {
        if ('mediaSession' in navigator && currentSong) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentSong.title,
                artist: currentSong.artist,
                artwork: [
                    { src: getImageUrl(currentSong.cover) || 'https://via.placeholder.com/96', sizes: '96x96', type: 'image/png' },
                    { src: getImageUrl(currentSong.cover) || 'https://via.placeholder.com/128', sizes: '128x128', type: 'image/png' },
                    { src: getImageUrl(currentSong.cover) || 'https://via.placeholder.com/512', sizes: '512x512', type: 'image/png' },
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => {
                if (audioRef.current) { audioRef.current.play(); setIsPlaying(true); }
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
            });
            navigator.mediaSession.setActionHandler('previoustrack', prevSong);
            navigator.mediaSession.setActionHandler('nexttrack', nextSong);
        }
    }, [currentSong, prevSong, nextSong, setIsPlaying]);

    const playPlaylist = async (pId) => {
        const tracks = await fetchPlaylistTracks(pId);
        if (!tracks || tracks.length === 0) return notify('Playlist empty', 'info');
        setQueue(tracks);
        setCurrentIndex(0);
        playSong(tracks[0], tracks);
    };

    const toggleLike = async (song) => {
        if (!getToken()) return notify("Login needed", 'error');
        const newSet = new Set(likedSongs);
        if (newSet.has(song.id)) newSet.delete(song.id); else newSet.add(song.id);
        setLikedSongs(newSet);
        await apiFetch(`${API_URL}/api/likes`, {
            method: 'POST',
            body: JSON.stringify(song)
        });
    };

    return (
        <PlayerContext.Provider value={{
            currentSong, isPlaying, playSong, togglePlay, nextSong, prevSong, audioRef, analyserRef,
            playlists, createPlaylist, addToPlaylist, deletePlaylist, removeFromPlaylist, fetchPlaylistTracks, playPlaylist, likedSongs, toggleLike, saveProgress,
            queue, addToQueue, currentIndex, notification, notify, apiFetch,
            volume, setVolume, isMuted, toggleMute, repeatMode, setRepeatMode, isShuffle, setIsShuffle,
            volume, setVolume, isMuted, toggleMute, repeatMode, setRepeatMode, isShuffle, setIsShuffle,
            isExpanded, setIsExpanded
        }}>
            {children}
            {notification && (
                <div className={`fixed right-6 bottom-6 z-50 px-4 py-3 rounded-lg shadow-xl text-sm ${notification.type === 'error' ? 'bg-red-600 text-white' : notification.type === 'success' ? 'bg-green-500 text-black' : 'bg-gray-800 text-white'}`}>
                    {notification.message}
                </div>
            )}
        </PlayerContext.Provider>
    );
};
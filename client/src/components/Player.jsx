import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronDown, Volume2, VolumeX, MoreHorizontal, Loader2, Shuffle, Repeat, Repeat1, Heart } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import API_URL from '../config';
import { getImageUrl } from '../utils/urlUtils';

// --- HELPERS (Unchanged) ---
const getHighResCover = (rawUrl) => {
    const url = getImageUrl(rawUrl);
    if (!url) return "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80";
    try {
        // Handle googleusercontent (standard yt music host)
        if (url.includes('googleusercontent.com')) {
            // w800 or w544 is safer than w1200 for many YT Music assets
            return url.split('=')[0] + '=w544-h544-l90-rj';
        }
        // Handle direct ytimg URLs
        if (url.includes('ytimg.com')) {
            return url.replace('mqdefault', 'maxresdefault').replace('hqdefault', 'maxresdefault');
        }
        return url;
    } catch (e) { return url; }
};


// ... (getLowResCover stays same) ...

// ... (inside Player component return) ...



const getLowResCover = (rawUrl) => {
    const url = getImageUrl(rawUrl);
    if (!url) return null;
    try {
        if (url.includes('googleusercontent.com')) {
            return url.split('=')[0] + '=w120-h120-l90-rj';
        }
        if (url.includes('ytimg.com')) {
            return url.replace('maxresdefault', 'mqdefault').replace('hqdefault', 'mqdefault');
        }
        return url;
    } catch (e) { return url; }
};

// --- COLOR ENGINE (Unchanged) ---
const rgbToHex = (r, g, b) => "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
const boostColorVibrance = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    if (s < 0.15) return { r: 200, g: 200, b: 200 };
    if (l < 0.55) l = 0.55 + (0.55 - l) * 0.2;
    if (s < 0.70) s = 0.85;
    let r1, g1, b1;
    if (s === 0) { r1 = g1 = b1 = l; } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r1 = hue2rgb(p, q, h + 1 / 3); g1 = hue2rgb(p, q, h); b1 = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.round(r1 * 255), g: Math.round(g1 * 255), b: Math.round(b1 * 255) };
};



const extractColor = (imgSrc) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";

        console.log("🎨 Player.extractColor:", { API_URL, imgSrc, convertedUrl: getImageUrl(imgSrc) });

        // Use proxy to avoid CORS/Tainted Canvas issues
        // We use getImageUrl to ensure imgSrc itself is safe, but proxy_image endpoint needs a full URL.
        // Actually, let's just use API_URL directly but verify it.
        const proxyUrl = `${API_URL}/api/proxy_image?url=${encodeURIComponent(getImageUrl(imgSrc))}`;
        console.log("🎨 Player.extractColor request:", proxyUrl);
        img.src = proxyUrl;

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 1; canvas.height = 1;
                ctx.drawImage(img, 0, 0, 1, 1);
                const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                const neon = boostColorVibrance(r, g, b);
                resolve(rgbToHex(neon.r, neon.g, neon.b));
            } catch (e) { console.warn("Color extract failed", e); resolve('#22c55e'); }
        };
        img.onerror = () => {
            console.warn("Proxy image load failed for color extraction");
            resolve('#22c55e');
        };
    });
};

const hexToRgb = (hex) => {
    if (!hex) return { r: 34, g: 197, b: 94 };
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};

// --- LRC PARSER (Unchanged) ---
const parseLrc = (lrcString) => {
    const lines = [];
    const regex = /^\[(\d{1,2}):(\d{1,2})[.:](\d{1,3})\](.*)/;
    lrcString.split('\n').forEach(line => {
        const match = line.match(regex);
        if (match) {
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            const ms = match[3].length === 3 ? parseInt(match[3]) : parseInt(match[3]) * 10;
            const time = min * 60 + sec + (ms / 1000);
            lines.push({ time, text: match[4].trim() });
        }
    });
    return lines;
};

export default function Player() {
    const {
        currentSong, isPlaying, togglePlay, audioRef, analyserRef, nextSong, prevSong, queue, currentIndex,
        volume, setVolume, isMuted, toggleMute, repeatMode, setRepeatMode, isShuffle, setIsShuffle,
        isExpanded, setIsExpanded, likedSongs, toggleLike, playlists, addToPlaylist
    } = usePlayer();

    // --- STATE ---
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);


    // Visuals
    const [accentColor, setAccentColor] = useState('#22c55e');
    const [isBuffering, setIsBuffering] = useState(false);

    // Lyrics
    const [showLyrics, setShowLyrics] = useState(false);
    const [lyricsData, setLyricsData] = useState([]);
    const [isSynced, setIsSynced] = useState(false);
    const [activeLine, setActiveLine] = useState(0);
    const [loadingLyrics, setLoadingLyrics] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // Interactive UI
    const [hoverTime, setHoverTime] = useState(null);

    // Refs
    const canvasRef = useRef(null);
    const visualsRef = useRef([]);
    const lyricsContainerRef = useRef(null);
    const progressBarRef = useRef(null);
    const isDraggingRef = useRef(false);

    // Swipe Logic
    const y = useMotionValue(0);

    // --- LOGIC ---

    const handleDragEnd = (_, info) => {
        if (info.offset.y > 100 && info.velocity.y > 100) {
            setIsExpanded(false);
        } else if (info.offset.y > 200) {
            setIsExpanded(false);
        }
    };

    const handleToggleRepeat = (e) => {
        e?.stopPropagation();
        setRepeatMode((repeatMode + 1) % 3);
    };

    // --- EFFECTS ---

    useEffect(() => {
        document.body.style.overflow = isExpanded ? 'hidden' : 'unset';
    }, [isExpanded]);

    useEffect(() => {
        if (currentSong?.cover) {
            const lowRes = getLowResCover(currentSong.cover);
            if (lowRes) extractColor(lowRes).then(setAccentColor);
        } else { setAccentColor('#22c55e'); }
    }, [currentSong]);

    // --- MEDIA SESSION & KEYBOARD INTEGRATION ---
    useEffect(() => {
        if ('mediaSession' in navigator && currentSong) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentSong.title,
                artist: currentSong.artist,
                artwork: [
                    { src: getHighResCover(currentSong.cover), sizes: '512x512', type: 'image/jpeg' },
                    { src: getLowResCover(currentSong.cover), sizes: '96x96', type: 'image/jpeg' }
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => { if (!isPlaying) togglePlay(); });
            navigator.mediaSession.setActionHandler('pause', () => { if (isPlaying) togglePlay(); });
            navigator.mediaSession.setActionHandler('previoustrack', prevSong);
            navigator.mediaSession.setActionHandler('nexttrack', nextSong);
        }
    }, [currentSong, isPlaying, togglePlay, prevSong, nextSong]);

    // --- KEYBOARD HANDLING MOVED TO CONTEXT ---
    // The global listener in PlayerContext now handles all shortcuts including Volume and Seek.




    // Audio Logic
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => {
            if (!isNaN(audio.duration)) {
                setDuration(audio.duration);
                setCurrentTime(audio.currentTime);
                if (!isDraggingRef.current) setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        const handleWaiting = () => setIsBuffering(true);
        const handlePlaying = () => {
            setIsBuffering(false);
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        };
        const handlePause = () => {
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        };

        const handleEnded = () => {
            setIsBuffering(false);
            if (repeatMode === 2) {
                audio.currentTime = 0;
                audio.play();
            } else {
                nextSong();
            }
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('playing', handlePlaying);
        audio.addEventListener('pause', handlePause); // Added pause listener
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('waiting', handleWaiting);
            audio.removeEventListener('playing', handlePlaying);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [audioRef, nextSong, repeatMode]);

    // Lyrics Logic
    useEffect(() => {
        if (showLyrics && currentSong) {
            setLoadingLyrics(true);
            setLyricsData([]); setIsSynced(false);
            fetch(`${API_URL}/api/lyrics/${currentSong.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.type === 'synced' || (data.lyrics && data.lyrics.match(/^\[\d{2}/m))) {
                        const parsed = parseLrc(data.lyrics);
                        if (parsed.length > 0) { setLyricsData(parsed); setIsSynced(true); }
                        else { setLyricsData(data.lyrics.split('\n').filter(l => l.trim())); setIsSynced(false); }
                    } else if (data.lyrics) {
                        setLyricsData(data.lyrics.split('\n').filter(l => l.trim())); setIsSynced(false);
                    } else { setLyricsData(["Lyrics not available."]); }
                    setLoadingLyrics(false);
                })
                .catch(() => { setLyricsData(["Lyrics not available."]); setLoadingLyrics(false); });
        }
    }, [showLyrics, currentSong]);

    // Auto-scroll Lyrics
    useEffect(() => {
        if (!showLyrics || lyricsData.length === 0) return;
        let index = 0;
        if (isSynced) {
            for (let i = lyricsData.length - 1; i >= 0; i--) {
                if (currentTime >= lyricsData[i].time) { index = i; break; }
            }
        } else { if (duration > 0) index = Math.floor((currentTime / duration) * lyricsData.length); }

        if (index !== activeLine) {
            setActiveLine(index);
            const el = document.getElementById(`line-${index}`);
            if (el && lyricsContainerRef.current) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        }
    }, [currentTime, duration, lyricsData, isSynced, showLyrics]);

    // Visualizer Logic
    useEffect(() => {
        if (!analyserRef.current || !canvasRef.current || !isExpanded) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Robust Resize Observer
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const dpr = window.devicePixelRatio || 1;
                const { width, height } = entry.contentRect;

                if (width === 0 || height === 0) return;

                canvas.width = width * dpr;
                canvas.height = height * dpr;

                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.scale(dpr, dpr);
            }
        });

        if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        if (visualsRef.current.length !== bufferLength) visualsRef.current = new Array(bufferLength).fill(0);

        let animationId;
        const render = () => {
            animationId = requestAnimationFrame(render);
            const dpr = window.devicePixelRatio || 1;

            // Get logical size
            let w = canvas.width / dpr;
            const h = canvas.height / dpr;

            // Fallback if canvas width is reported incorrectly (e.g. 0 or huge)
            if (w < 1) w = canvas.parentElement?.clientWidth || window.innerWidth;

            if (w < 1 || h < 1) return;

            analyserRef.current.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, w, h);
            // Mobile-specific adjustments for "smaller" look
            const isMobile = window.innerWidth < 768;

            const barWidth = isMobile ? 3 : 4;
            const gap = isMobile ? 4 : 6;

            // Dynamic Bars Calculation
            const effectiveWidth = Math.min(w, window.innerWidth);
            const availableSlots = Math.floor((effectiveWidth / 2) / (barWidth + gap));
            // Reduce max bars on mobile to 32 for a less dense/crowded look
            const maxBars = isMobile ? 32 : 64;
            const bars = Math.max(5, Math.min(maxBars, availableSlots));

            const centerX = w / 2;
            const maxBarHeight = h * 0.8;

            const rgb = hexToRgb(accentColor);
            const gradient = ctx.createLinearGradient(0, h, 0, h / 2 - 20);
            gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
            gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`);
            ctx.fillStyle = gradient;

            ctx.shadowBlur = 15;
            ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;

            for (let i = 0; i < bars; i++) {
                const dataIndex = Math.floor(i * (bufferLength / bars) * 0.7);
                const rawValue = dataArray[dataIndex] || 0;

                let prev = visualsRef.current[i] || 0;
                if (rawValue > prev) visualsRef.current[i] = prev + (rawValue - prev) * 0.5;
                else visualsRef.current[i] = Math.max(0, prev - 4);

                const val = visualsRef.current[i];
                const barHeight = Math.max(4, Math.pow(val / 255, 3) * maxBarHeight);
                const yPos = (h - barHeight) / 2;

                // Right
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(centerX + i * (barWidth + gap), yPos, barWidth, barHeight, 4);
                else ctx.rect(centerX + i * (barWidth + gap), yPos, barWidth, barHeight);
                ctx.fill();

                // Left
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(centerX - (i + 1) * (barWidth + gap), yPos, barWidth, barHeight, 4);
                else ctx.rect(centerX - (i + 1) * (barWidth + gap), yPos, barWidth, barHeight);
                ctx.fill();
            }
        };

        if (isPlaying && !showLyrics) render();
        else {
            const dpr = window.devicePixelRatio || 1;
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            cancelAnimationFrame(animationId);
        }

        return () => {
            cancelAnimationFrame(animationId);
            resizeObserver.disconnect();
        };
    }, [isPlaying, isExpanded, analyserRef, showLyrics, accentColor]);

    // Seek Helpers
    const calculateTime = (e) => {
        if (!progressBarRef.current || !duration) return 0;
        const rect = progressBarRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const width = rect.width;
        const offsetX = Math.max(0, Math.min(clientX - rect.left, width));
        return (offsetX / width) * duration;
    };

    const handleSeekStart = (e) => {
        isDraggingRef.current = true;
        const newTime = calculateTime(e);
        setProgress((newTime / duration) * 100);
    };

    const handleSeekMove = (e) => {
        const newTime = calculateTime(e);
        if (isDraggingRef.current) {
            setProgress((newTime / duration) * 100);
        }
        setHoverTime(newTime);
    };

    const handleSeekEnd = (e) => {
        if (isDraggingRef.current) {
            const newTime = calculateTime(e);
            if (audioRef.current && isFinite(newTime)) {
                audioRef.current.currentTime = newTime;
            }
            isDraggingRef.current = false;
        }
    };

    const formatTime = (t) => {
        if (!t || isNaN(t)) return "0:00";
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s < 10 ? "0" + s : s}`;
    };

    if (!currentSong) return null;
    const prevTrack = queue.length > 0 ? queue[(currentIndex - 1 + queue.length) % queue.length] : null;
    const nextTrack = queue.length > 0 ? queue[(currentIndex + 1) % queue.length] : null;

    return (
        <AnimatePresence mode="wait">


            {/* --- MINI PLAYER (Sleek Floating Capsule) --- */}
            {!isExpanded && (
                <motion.div
                    key="mini-player-container" // Wrapper for positioning
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed z-[500] pointer-events-none flex justify-center items-center bottom-[96px] left-0 right-0 px-3 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-auto md:px-0"
                >
                    <motion.div
                        key="mini-player-capsule" // The actual capsule
                        layoutId="mini-player-capsule"
                        initial={{ y: 20, scale: 0.98 }}
                        animate={{ y: 0, scale: 1 }}
                        exit={{ scale: 0.95, transition: { duration: 0.2 } }}
                        transition={{ type: "spring", stiffness: 220, damping: 25 }}
                        className="pointer-events-auto w-full max-w-2xl h-[72px] bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl flex md:grid md:grid-cols-3 items-center justify-between md:justify-items-center px-4 md:px-6 cursor-pointer group relative overflow-hidden"
                        style={{ "--accent": accentColor }} // Set CSS variable for hover effects
                        onClick={() => setIsExpanded(true)}
                    >
                        {/* Simple High-Performance Progress Line (Bottom) */}
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
                            <motion.div
                                className="h-full relative"
                                style={{ width: `${progress}%`, backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }}
                                layoutId="progress-bar"
                            />
                        </div>

                        {/* LEFT: Art + Info */}
                        <div className="flex items-center gap-4 z-10 min-w-0 w-full md:w-auto md:justify-self-start">
                            <motion.div
                                layoutId="album-art"
                                className="w-12 h-12 rounded-full overflow-hidden relative shrink-0 shadow-lg border-2 border-white/10 group-hover:scale-105 transition-transform duration-300 will-change-transform"
                            >
                                {currentSong.cover ? (
                                    <img
                                        src={getHighResCover(currentSong.cover)}
                                        className="w-full h-full object-cover animate-spin-slow-paused group-hover:animate-spin-slow"
                                        style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                                        alt="cover"
                                        onError={(e) => { e.target.src = currentSong.cover; }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                        <span className="text-[8px] font-bold text-white/30">MELO</span>
                                    </div>
                                )}
                                {/* Center hole for vinyl look */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#121212] rounded-full border border-white/10" />
                            </motion.div>

                            <div className="min-w-0 flex flex-col justify-center gap-0.5">
                                <motion.h4 layoutId="song-title" className="font-bold text-white text-sm truncate leading-snug pr-4">{currentSong.title}</motion.h4>
                                <motion.p layoutId="song-artist" className="text-xs text-white/50 truncate font-medium group-hover:text-white/80 transition-colors">{currentSong.artist}</motion.p>
                            </div>
                        </div>

                        {/* CENTER: Controls (Desktop Only) */}
                        <div className="hidden md:flex items-center gap-5 z-20 justify-self-center">
                            <button
                                onClick={(e) => { e.stopPropagation(); prevSong(); }}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-white/70 hover:text-[var(--accent)] hover:bg-white/5 transition will-change-transform active:scale-95"
                            >
                                <SkipBack size={22} fill="currentColor" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                className="w-12 h-12 rounded-full text-white flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg"
                                style={{ backgroundColor: accentColor, boxShadow: `0 4px 20px -5px ${accentColor}80` }}
                            >
                                {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); nextSong(); }}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-white/70 hover:text-[var(--accent)] hover:bg-white/5 transition will-change-transform active:scale-95"
                            >
                                <SkipForward size={22} fill="currentColor" />
                            </button>
                        </div>

                        {/* RIGHT: Actions */}
                        <div className="flex items-center gap-3 z-10 shrink-0 md:justify-self-end">
                            {/* Mobile Controls (Prev, Play, Next) */}
                            <div className="md:hidden flex items-center gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); prevSong(); }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full text-white/50 hover:text-[var(--accent)] hover:bg-white/10 transition"
                                >
                                    <SkipBack size={18} fill="currentColor" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                    className="w-10 h-10 text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg mx-1"
                                    style={{ backgroundColor: accentColor, boxShadow: `0 4px 15px -5px ${accentColor}80` }}
                                >
                                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); nextSong(); }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full text-white/50 hover:text-[var(--accent)] hover:bg-white/10 transition"
                                >
                                    <SkipForward size={18} fill="currentColor" />
                                </button>
                            </div>

                            {/* Desktop Extra Controls */}
                            <div className="hidden md:flex items-center gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleLike(currentSong); }}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 transition text-white/50 hover:text-[#22c55e]"
                                >
                                    <Heart size={20} fill={likedSongs.has(currentSong.id) ? "#22c55e" : "transparent"} className={likedSongs.has(currentSong.id) ? "text-[#22c55e]" : ""} />
                                </button>
                                <div className="w-[1px] h-6 bg-white/10 mx-1" />
                                <div className="flex items-center gap-2 group/vol hover:bg-white/5 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-white/5">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                                        className="text-white/50 hover:text-white transition-colors"
                                    >
                                        {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                    </button>
                                    <div className="w-20 h-1 bg-white/20 rounded-full overflow-hidden relative">
                                        <div className="absolute inset-0 bg-white/50 origin-left" style={{ transform: `scaleX(${volume})` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

            )}


            {/* --- EXPANDED PLAYER --- */}
            {
                isExpanded && (
                    <motion.div
                        key="expanded-player"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%", transition: { duration: 0.35, ease: "easeIn" } }} // Smooth exit, no spring
                        style={{ y }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.02} // Almost rigid drag for premium feel
                        onDragEnd={handleDragEnd}
                        // Premium spring: snappy launch, high damping to kill bounce
                        transition={{ type: "spring", damping: 50, stiffness: 350, mass: 1 }}
                        className="fixed inset-0 bg-[#09090b] z-[1000] flex flex-col items-center justify-center overflow-hidden touch-none"
                    >
                        {/* Background Image (Blurred) */}
                        <motion.div className="absolute inset-0 z-0 select-none">
                            <motion.img
                                src={getHighResCover(currentSong.cover)}
                                className="w-full h-full object-cover blur-[50px] saturate-150 opacity-50"
                                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80"; }}
                                alt="bg"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#09090b]/80 to-[#09090b] z-0" />
                            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")` }}></div>
                        </motion.div>

                        {/* Top Bar */}
                        <motion.div className="absolute top-0 w-full p-6 md:p-8 flex justify-between items-center z-20">
                            <button onClick={() => setIsExpanded(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 backdrop-blur-md transition group">
                                <ChevronDown size={24} className="text-white group-hover:-translate-y-0.5 transition-transform" />
                            </button>

                            <div className="md:hidden absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/20 rounded-full" />

                            <div className="flex bg-black/40 rounded-full p-1 backdrop-blur-md border border-white/5">
                                <button onClick={() => setShowLyrics(false)} className={`px-5 py-1.5 md:px-6 md:py-2 rounded-full text-xs font-bold transition-all duration-300 ${!showLyrics ? "text-black shadow-lg" : "text-white/50 hover:text-white"}`} style={!showLyrics ? { backgroundColor: accentColor } : {}}>Song</button>
                                <button onClick={() => setShowLyrics(true)} className={`px-5 py-1.5 md:px-6 md:py-2 rounded-full text-xs font-bold transition-all duration-300 ${showLyrics ? "text-black shadow-lg" : "text-white/50 hover:text-white"}`} style={showLyrics ? { backgroundColor: accentColor } : {}}>Lyrics</button>
                            </div>
                            <div className="relative z-50">
                                <button onClick={() => setShowMenu(!showMenu)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 backdrop-blur-md transition group">
                                    <MoreHorizontal size={24} className="text-white" />
                                </button>
                                <AnimatePresence>
                                    {showMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="absolute right-0 top-full mt-2 w-48 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1"
                                        >
                                            <div className="px-3 py-2 text-xs font-bold text-white/40 uppercase tracking-widest border-b border-white/5 mb-1">Add to Playlist</div>
                                            {playlists.length === 0 ? (
                                                <div className="px-4 py-3 text-sm text-white/50 italic">No playlists</div>
                                            ) : (
                                                playlists.map(pl => (
                                                    <button
                                                        key={pl.id}
                                                        onClick={() => { addToPlaylist(pl.id, currentSong); setShowMenu(false); }}
                                                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                        <span className="truncate">{pl.name}</span>
                                                    </button>
                                                ))
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>

                        {/* CENTER CONTENT */}
                        <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center mt-8 mb-4">
                            <AnimatePresence mode='wait'>
                                {showLyrics ? (
                                    <motion.div key="lyrics" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} ref={lyricsContainerRef} className="w-full max-w-2xl h-[50vh] overflow-y-auto custom-scrollbar px-8 text-center mask-image-gradient">
                                        {loadingLyrics ? (
                                            <div className="flex flex-col items-center justify-center h-full text-white/50 gap-2"><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><p>Fetching lyrics...</p></div>
                                        ) : (
                                            <div className="py-[40vh] flex flex-col gap-6 md:gap-8 transition-all duration-500">
                                                {lyricsData.map((item, i) => (
                                                    <p id={`line-${i}`} key={i} className={`text-2xl md:text-4xl font-bold leading-tight transition-all duration-500 cursor-pointer ${i === activeLine ? "scale-105 opacity-100 drop-shadow-md" : "scale-95 opacity-30 blur-[1px] hover:opacity-60"}`} style={i === activeLine ? { color: accentColor } : { color: 'white' }} onClick={() => { if (isSynced && typeof item !== 'string') audioRef.current.currentTime = item.time; }}>{isSynced ? item.text : item}</p>
                                                ))}
                                                {lyricsData.length === 0 && <p>Lyrics not available.</p>}
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div key="art" className="relative w-full h-full flex items-center justify-center perspective-1000">
                                        {/* Prev / Next Artwork restored */}
                                        {prevTrack && prevTrack.cover && (
                                            <div className="absolute transform -translate-x-[90%] md:-translate-x-80 translate-z-[-100px] rotate-y-[-25deg] w-48 h-48 md:w-72 md:h-72 rounded-[2rem] border border-white/5 overflow-hidden opacity-60 shadow-2xl transition-all duration-500 blur-sm scale-75 md:scale-100 z-10">
                                                <img
                                                    src={getHighResCover(prevTrack.cover)}
                                                    className="w-full h-full object-cover grayscale"
                                                    alt="prev"
                                                    onError={(e) => { if (e.target.src !== prevTrack.cover) e.target.src = prevTrack.cover; }}
                                                />
                                            </div>
                                        )}
                                        {nextTrack && nextTrack.cover && (
                                            <div className="absolute transform translate-x-[90%] md:translate-x-80 translate-z-[-100px] rotate-y-[25deg] w-48 h-48 md:w-72 md:h-72 rounded-[2rem] border border-white/5 overflow-hidden opacity-60 shadow-2xl transition-all duration-500 blur-sm scale-75 md:scale-100 z-10">
                                                <img
                                                    src={getHighResCover(nextTrack.cover)}
                                                    className="w-full h-full object-cover grayscale"
                                                    alt="next"
                                                    onError={(e) => { if (e.target.src !== nextTrack.cover) e.target.src = nextTrack.cover; }}
                                                />
                                            </div>
                                        )}

                                        {/* Artwork with SHARED LAYOUT ID */}
                                        <motion.div
                                            layoutId="album-art"
                                            className="relative w-[280px] h-[280px] md:w-[400px] md:h-[400px] rounded-[2rem] md:rounded-[2.5rem] border border-white/10 z-20 bg-[#121212] overflow-hidden shadow-2xl"
                                            style={{ boxShadow: `0 40px 80px -20px ${accentColor}40` }}
                                        >
                                            {currentSong.cover ? (
                                                <img
                                                    src={getHighResCover(currentSong.cover)}
                                                    className="w-full h-full object-cover"
                                                    alt="current"
                                                    onError={(e) => {
                                                        if (e.target.src !== currentSong.cover) {
                                                            e.target.src = currentSong.cover;
                                                        } else {
                                                            e.target.src = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80";
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-[#333] flex items-center justify-center">
                                                    <span className="text-white/20 text-4xl font-bold">MELO</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none" />
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Song Info */}
                        <div className="z-30 text-center mb-6 px-4 w-full max-w-lg mx-auto">
                            <motion.h2 layoutId="song-title" className="text-3xl md:text-5xl font-black text-white mb-2 drop-shadow-lg tracking-tight leading-tight line-clamp-2">
                                {currentSong.title}
                            </motion.h2>
                            <motion.p layoutId="song-artist" className="text-lg md:text-2xl text-white/70 font-medium truncate">
                                {currentSong.artist}
                            </motion.p>
                        </div>

                        {/* Visualizer Canvas - SMALLER HEIGHT ON MOBILE (h-12 instead of h-16) */}
                        <div className={`w-full h-12 md:h-24 mb-2 flex items-center justify-center relative z-20 pointer-events-none transition-opacity duration-500 ${showLyrics ? 'opacity-0' : 'opacity-100'}`}>
                            <canvas ref={canvasRef} className="w-full h-full max-w-3xl" />
                        </div>

                        {/* Controls Container */}
                        <motion.div className="w-full max-w-5xl px-4 md:px-8 relative z-30 mb-safe-bottom">
                            <div className="w-full bg-[#121212]/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-center gap-6 md:gap-10">

                                {/* Desktop Buttons */}
                                <div className="hidden md:flex items-center justify-start gap-4 md:w-1/3">
                                    <button onClick={() => setIsShuffle(!isShuffle)} className={`transition ${isShuffle ? 'text-white' : 'text-white/30 hover:text-white'}`} title="Shuffle (S)">
                                        <Shuffle size={20} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); prevSong() }}><SkipBack size={26} className="text-white/70 hover:text-white hover:scale-110 transition" /></button>
                                    <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); togglePlay() }} className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-black hover:scale-105 transition" style={{ backgroundColor: accentColor }}>
                                        {isBuffering ? <Loader2 size={24} className="animate-spin text-black" /> : (isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" className="ml-1" />)}
                                    </motion.button>
                                    <button onClick={(e) => { e.stopPropagation(); nextSong() }}><SkipForward size={26} className="text-white/70 hover:text-white hover:scale-110 transition" /></button>
                                    <button onClick={handleToggleRepeat} className={`transition ${repeatMode !== 0 ? 'text-white' : 'text-white/30 hover:text-white'}`} title="Repeat (R)">
                                        {repeatMode === 2 ? <Repeat1 size={20} /> : <Repeat size={20} />}
                                    </button>
                                </div>

                                {/* Progress Bar */}
                                <div className="flex-1 w-full flex items-center gap-3 text-xs font-bold text-white/40 font-mono px-2 relative">
                                    <span>{formatTime(currentTime)}</span>
                                    <div
                                        ref={progressBarRef}
                                        className="flex-1 h-1.5 md:h-2 bg-white/10 rounded-full cursor-pointer relative group touch-none"
                                        onPointerDown={handleSeekStart}
                                        onPointerMove={handleSeekMove}
                                        onPointerUp={handleSeekEnd}
                                        onPointerLeave={() => { handleSeekEnd(); setHoverTime(null); }}
                                    >
                                        <div className="absolute -top-4 -bottom-4 left-0 right-0 z-10"></div>
                                        <motion.div
                                            layoutId="progress-bar"
                                            className="absolute top-0 left-0 h-full rounded-full transition-all duration-100 ease-linear pointer-events-none"
                                            style={{ width: `${progress}%`, backgroundColor: accentColor, boxShadow: `0 0 12px ${accentColor}80` }}
                                        >
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-1/2 scale-75 group-hover:scale-100" />
                                        </motion.div>
                                        {/* Tooltip */}
                                        {hoverTime !== null && (
                                            <div
                                                className="absolute -top-10 px-2 py-1 bg-black/80 backdrop-blur-md text-white text-xs rounded border border-white/10 pointer-events-none transform -translate-x-1/2 transition-opacity shadow-xl"
                                                style={{ left: `${(hoverTime / duration) * 100}%` }}
                                            >
                                                {formatTime(hoverTime)}
                                            </div>
                                        )}
                                    </div>
                                    <span>{formatTime(duration)}</span>
                                </div>

                                {/* Volume & Mobile Extras */}
                                <div className="flex items-center w-full md:w-auto justify-between md:justify-end gap-4 md:pl-4">
                                    {/* Mobile Main Controls */}
                                    <div className="flex md:hidden items-center gap-5 mx-auto">
                                        <button onClick={() => setIsShuffle(!isShuffle)} className={`${isShuffle ? 'text-white' : 'text-white/30'}`}><Shuffle size={18} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); prevSong() }}><SkipBack size={24} className="text-white" /></button>
                                        <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); togglePlay() }} className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-black" style={{ backgroundColor: accentColor }}>
                                            {isBuffering ? <Loader2 size={24} className="animate-spin text-black" /> : (isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" className="ml-1" />)}
                                        </motion.button>
                                        <button onClick={(e) => { e.stopPropagation(); nextSong() }}><SkipForward size={24} className="text-white" /></button>
                                        <button onClick={handleToggleRepeat} className={`${repeatMode !== 0 ? 'text-white' : 'text-white/30'}`}>{repeatMode === 2 ? <Repeat1 size={18} /> : <Repeat size={18} />}</button>
                                    </div>

                                    {/* Volume Control */}
                                    <div className="hidden md:flex items-center gap-2 group/vol">
                                        <button onClick={toggleMute} className="hover:text-white text-white/50 transition">
                                            {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                        </button>
                                        <div className="w-24 h-1 bg-white/20 rounded-lg overflow-hidden relative">
                                            <input
                                                type="range" min="0" max="1" step="0.01"
                                                value={volume}
                                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="h-full bg-white transition-all" style={{ width: `${volume * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )
            }

        </AnimatePresence >
    );
}
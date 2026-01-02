import { useState, useEffect } from 'react';
import API_URL from '../config';
import { usePlayer } from '../context/PlayerContext';

export function useHistory() {
    const { playSong } = usePlayer();
    const [recent, setRecent] = useState(() => {
        try {
            const cache = JSON.parse(localStorage.getItem('recent_history_cache_v1') || 'null');
            if (cache && Array.isArray(cache.items) && cache.items.length > 0) return cache.items;
            const local = JSON.parse(localStorage.getItem('local_recent_history_v1') || 'null');
            if (local && Array.isArray(local)) return local;
        } catch (e) { }
        return [];
    });

    const [loading, setLoading] = useState(() => recent.length === 0);
    const [error, setError] = useState(null);

    const getToken = () => {
        const t = localStorage.getItem('token');
        if (!t || t === 'undefined' || t === 'null') return null;
        return t.replace(/^"|"$/g, '');
    };

    const deleteItem = async (e, videoId) => {
        if (e) e.stopPropagation();
        const token = getToken();

        setRecent(prev => prev.filter(item => item.id !== videoId));

        if (token) {
            try {
                await fetch(`${API_URL}/api/history/${videoId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (err) {
                console.error("Failed to delete history on server", err);
            }
        }

        const cacheKey = 'recent_history_cache_v1';
        const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        if (cache.items) {
            cache.items = cache.items.filter(i => i.id !== videoId);
            localStorage.setItem(cacheKey, JSON.stringify(cache));
        }
    };

    const playItem = (s) => {
        const song = { ...s };
        if (!song.stream_url) song.stream_url = `${API_URL}/api/stream/${song.id}`;
        playSong(song, recent);
    };

    useEffect(() => {
        let mounted = true;
        const cacheKey = 'recent_history_cache_v1';

        const fetchHistory = async () => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);
                const headers = {};
                const token = getToken();
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`${API_URL}/api/history`, { headers, signal: controller.signal });
                clearTimeout(timeout);

                if (res.ok) {
                    const data = await res.json();
                    const items = Array.isArray(data) ? data : (data.items || []);
                    if (mounted) {
                        setRecent(items);
                        setLoading(false);
                        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), items }));
                    }
                } else if (recent.length === 0) {
                    setError(`History unavailable`);
                    setLoading(false);
                }
            } catch (e) {
                if (mounted && recent.length === 0) setLoading(false);
            }
        };

        fetchHistory();

        const onLocalUpdate = (e) => {
            const item = (e && e.detail) || null;
            if (item && item.id) {
                setRecent(prev => {
                    const filtered = (prev || []).filter(i => i.id !== item.id);
                    return [item, ...filtered].slice(0, 50);
                });
            }
        };
        window.addEventListener('localRecentUpdated', onLocalUpdate);
        return () => { mounted = false; window.removeEventListener('localRecentUpdated', onLocalUpdate); };
    }, []);

    return { recent, loading, error, deleteItem, playItem };
}

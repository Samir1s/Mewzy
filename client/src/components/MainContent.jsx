import React, { useEffect, useState, memo } from 'react';
import { Heart, MoreHorizontal, Music, PlayCircle, UploadCloud, CheckCircle, Podcast as PodcastIcon, Trash2, ArrowLeft, Play, Compass, Loader2, ListMusic, Search, PlusCircle, Edit2, User as UserIcon, Globe, TrendingUp, Settings, Upload, UserPlus } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import API_URL from '../config';
import { motion, AnimatePresence } from 'framer-motion';

// Extracted Components
import { SkeletonCard, SkeletonRow, SkeletonStreamLine } from './Skeletons';
import SongRow from './SongRow';
import MobileHome from './MobileHome';
import DesktopHome from './DesktopHome';

const DEFAULT_IMG = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80";

// Helper for Token Management
const apiFetch = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const validToken = token && token !== 'undefined' && token !== 'null' ? token.replace(/^"|"$/g, '') : null;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (validToken) {
        headers['Authorization'] = `Bearer ${validToken}`;
    }

    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
    }
    return res;
};

const AvatarPicker = ({ current, onSelect }) => {
    const avatars = [
        "https://cdn-icons-png.flaticon.com/512/847/847969.png", // Girl 1
        "https://cdn-icons-png.flaticon.com/512/4140/4140048.png", // Boy 1
        "https://cdn-icons-png.flaticon.com/512/6997/6997662.png", // Girl 2
        "https://cdn-icons-png.flaticon.com/512/4140/4140037.png", // Boy 2
        "https://cdn-icons-png.flaticon.com/512/4140/4140047.png", // Old Man
        "https://cdn-icons-png.flaticon.com/512/4140/4140051.png"  // Old Woman
    ];

    return (
        <div className="flex gap-4 mt-6 overflow-x-auto pb-4 custom-scrollbar">
            {avatars.map((url, i) => (
                <img
                    key={i}
                    src={url}
                    onClick={() => onSelect(url)}
                    className={`w-16 h-16 rounded-full cursor-pointer hover:scale-110 transition border-2 ${current === url ? 'border-green-500' : 'border-transparent'}`}
                    alt="avatar"
                />
            ))}
        </div>
    );
};


// --- 1. UPLOAD VIEW ---
const UploadView = () => {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState(null);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setTitle(selected.name.split('.')[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setStatus(null);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('artist', artist);

        try {
            // Use raw fetch for FormData as headers differ
            const token = localStorage.getItem('token');
            const validToken = token && token !== 'undefined' ? token.replace(/^"|"$/g, '') : null;

            const res = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                headers: validToken ? { 'Authorization': `Bearer ${validToken}` } : {},
                body: formData
            });

            if (res.ok) {
                setStatus('success');
                setFile(null); setTitle(""); setArtist("");
            } else { setStatus('error'); }
        } catch { setStatus('error'); }
        finally { setUploading(false); }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full max-w-xl mx-auto px-4">
            <div className="bg-[#18181d] border border-white/10 p-10 rounded-3xl w-full shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4"><UploadCloud className="text-green-500" size={32} /></div>
                    <h2 className="text-2xl font-bold text-white">Upload Track</h2>
                </div>
                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="relative border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-green-500/50 transition cursor-pointer">
                        <input type="file" onChange={handleFileChange} accept=".mp3,.wav,.ogg" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        {file ? <p className="text-green-400 font-medium truncate">{file.name}</p> : <p className="text-gray-500 text-sm">Drag & drop or click to select</p>}
                    </div>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Track Title" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:outline-none" required />
                    <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist Name" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white focus:outline-none" required />
                    <button disabled={uploading} className="w-full bg-green-500 text-black font-bold py-4 rounded-xl hover:bg-green-400 transition disabled:opacity-50">{uploading ? "Uploading..." : "Upload"}</button>
                </form>
                {status === 'success' && <div className="mt-4 p-3 bg-green-500/20 text-green-400 rounded-lg flex items-center gap-2 text-sm"><CheckCircle size={16} /> Success!</div>}
            </div>
        </div>
    );
};

// --- 2. DISCOVER COMPONENTS ---
const DiscoverHero = ({ item, onPlay, onLike, isLiked }) => {
    if (!item) return null;
    return (
        <div className="relative h-[55vh] md:h-[70vh] min-h-[400px] w-full group overflow-hidden">
            <div className="absolute inset-0">
                <img src={item.cover} className="w-full h-full object-cover" alt="Hero" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#121212]/20 to-[#121212]" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#121212]/90 via-[#121212]/40 to-transparent" />
            </div>

            <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 z-10 max-w-4xl">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                    <span className="inline-block px-3 py-1 mb-4 text-[10px] font-bold tracking-widest text-black uppercase bg-green-500 rounded-full">
                        Editors' Choice
                    </span>
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-4 leading-tight tracking-tight drop-shadow-2xl">
                        {item.title}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-200 mb-8 line-clamp-2 md:w-2/3 drop-shadow-md">
                        Experience the sound that everyone is talking about. {item.artist} brings a new vibe to the scene.
                    </p>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onPlay(item)}
                            className="bg-green-500 text-black font-bold py-4 px-10 rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(34,197,94,0.3)] flex items-center gap-2"
                        >
                            <Play fill="black" size={20} /> Play Now
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onLike(item); }}
                            className={`p-4 rounded-full border-2 transition-all hover:scale-110 ${isLiked ? 'border-green-500 bg-green-500/20 text-green-500' : 'border-white/30 text-white hover:bg-white/10'}`}
                        >
                            <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

const ScrollRow = ({ title, items, isCircle = false, onPlay }) => {
    if (!items || items.length === 0) return null;
    return (
        <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between px-4 md:px-8">
                <h3 className="text-xl font-bold text-white cursor-pointer hover:text-green-400 transition flex items-center gap-2">
                    {title} <span className="text-gray-600 text-xs">View All</span>
                </h3>
            </div>
            <div className="flex gap-4 overflow-x-auto px-4 md:px-8 pb-4 snap-x content-safe-area-x scrollbar-none">
                {items.map((item) => (
                    <motion.div
                        key={item.id}
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onPlay(item)}
                        className={`relative flex-shrink-0 group snap-start cursor-pointer ${isCircle ? "w-32" : "w-36 md:w-48"}`}
                    >
                        <div className={`overflow-hidden relative shadow-lg bg-[#18181d] ${isCircle ? "rounded-full aspect-square" : "rounded-2xl aspect-square mb-3"}`}>
                            <img src={item.cover} className="w-full h-full object-cover transition duration-500 group-hover:scale-110 group-hover:opacity-80" alt={item.title} />
                            <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isCircle ? "bg-black/40" : ""}`}>
                                <Play size={isCircle ? 32 : 40} className="text-white drop-shadow-lg" fill="white" />
                            </div>
                        </div>
                        <div className={`${isCircle ? "text-center mt-2" : "text-left"}`}>
                            <h4 className="font-bold text-white text-sm truncate group-hover:text-green-400 transition-colors">{item.title}</h4>
                            <p className="text-xs text-gray-400 truncate">{item.artist}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};



// --- 3. PODCAST SECTIONS ---
const PodcastSection = ({ onOpenPodcast }) => {
    const [podcasts, setPodcasts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/podcasts`)
            .then(res => res.json())
            .then(data => {
                setPodcasts(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-gray-500">Loading podcasts...</div>;

    return (
        <div className="space-y-8 px-4 md:px-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <PodcastIcon className="text-purple-500" /> Popular Podcasts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {podcasts.map((p) => (
                    <div key={p.id} onClick={() => onOpenPodcast(p.id)} className="group relative bg-[#18181d] p-4 rounded-2xl border border-white/5 hover:bg-white/5 transition cursor-pointer">
                        <img src={p.cover || DEFAULT_IMG} onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMG; }} className="w-full h-48 object-cover rounded-xl mb-4 shadow-lg group-hover:scale-[1.02] transition" alt={p.title} />
                        <h3 className="font-bold text-white truncate">{p.title}</h3>
                        <p className="text-sm text-gray-500">{p.artist}</p>
                        <div className="mt-3">
                            <button className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-full transition w-full">
                                Browse Episodes
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PodcastDetail = ({ podcastId, onBack }) => {
    const [data, setData] = useState(null);
    const { playSong } = usePlayer();

    useEffect(() => {
        fetch(`${API_URL}/api/podcasts/${podcastId}`)
            .then(res => res.json())
            .then(setData)
            .catch(console.error);
    }, [podcastId]);

    if (!data) return <div className="text-gray-500 p-8">Loading episodes...</div>;

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6">
                <ArrowLeft size={20} /> Back to Podcasts
            </button>

            <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
                <img src={data.cover || DEFAULT_IMG} onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMG; }} className="w-52 h-52 object-cover rounded-2xl shadow-2xl" alt={data.title} />
                <div>
                    <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-2">Podcast</h4>
                    <h1 className="text-4xl font-bold text-white mb-4">{data.title}</h1>
                    <p className="text-gray-400 max-w-xl line-clamp-3">{data.description || "No description available."}</p>
                </div>
            </div>

            <div className="space-y-1">
                {data.episodes?.map((ep, i) => (
                    <div key={ep.id} onClick={() => playSong(ep, data.episodes)} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition border-b border-white/5">
                        <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-green-500 group-hover:bg-green-500 group-hover:text-black transition">
                            <Play size={16} fill="currentColor" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium truncate">{ep.title}</h4>
                            <p className="text-sm text-gray-500">{ep.duration} • {ep.artist}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- 4. PROFILE VIEW ---
const ProfileView = ({ user, targetId, setViewingProfileId }) => {
    const { playlists, likedSongs, apiFetch } = usePlayer();
    const [profileData, setProfileData] = useState(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Edit Form State
    const [newName, setNewName] = useState("");
    const [newBio, setNewBio] = useState("");
    const [newBanner, setNewBanner] = useState("");
    const [newProfilePic, setNewProfilePic] = useState(null); // URL or File placeholder

    // Social Data
    const [friendStatus, setFriendStatus] = useState('none'); // none, friend, sent, received
    const [requests, setRequests] = useState([]);
    const [friends, setFriends] = useState([]);

    const token = localStorage.getItem('token');
    const isLoggedIn = token && token !== 'undefined' && token !== 'null';
    const isMyProfile = (!targetId && isLoggedIn) || (targetId && targetId === Number(localStorage.getItem('id')));

    useEffect(() => {
        const fetchData = async () => {
            if (!targetId && !isLoggedIn) {
                setProfileData({
                    username: 'Guest',
                    bio: 'Sign in to customize your profile and connect with friends.',
                    profile_pic: "https://cdn-icons-png.flaticon.com/512/847/847969.png",
                    banner_url: null,
                    playlist_count: 0,
                    playlists: []
                });
                return;
            }

            try {
                const endpoint = targetId ? `${API_URL}/api/user/${targetId}` : `${API_URL}/api/profile`;
                const res = await apiFetch(endpoint);
                if (res.ok) {
                    const data = await res.json();
                    setProfileData(data);
                    setNewName(data.username);
                    setNewBio(data.bio || "");
                    setNewBanner(data.banner_url || "");
                    setFriendStatus(data.status || 'none');
                } else if (res.status === 401 && !targetId) {
                    setProfileData({ username: 'Guest', bio: 'Session expired.' });
                }

                if (isMyProfile) {
                    const friendsRes = await apiFetch(`${API_URL}/api/friends`);
                    if (friendsRes.ok) {
                        const fdata = await friendsRes.json();
                        setRequests(fdata.requests);
                        setFriends(fdata.friends);
                    }
                }
            } catch (e) { console.error(e); }
        };
        fetchData();
    }, [targetId, isLoggedIn]);

    const handleUpdate = async () => {
        if (!isLoggedIn) return;
        setLoading(true);
        try {
            const body = { username: newName, bio: newBio, banner_url: newBanner };
            // Note: Profile Pic is handled separately by upload for now, or passed here if URL

            const res = await apiFetch(`${API_URL}/api/user/update`, {
                method: 'PUT',
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('username', data.username);
                alert("Profile updated!");
                setEditing(false);
                setProfileData(prev => ({ ...prev, ...data }));
            }
        } catch (e) { alert("Error updating"); }
        finally { setLoading(false); }
    };

    const handleFileUpload = async (e, type) => {
        if (!isLoggedIn) return;
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);

        try {
            setLoading(true);
            const endpoint = type === 'avatar' ? '/api/user/upload-avatar' : '/api/user/upload-banner';
            const res = await apiFetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                if (type === 'avatar') {
                    setProfileData(prev => ({ ...prev, profile_pic: data.url }));
                    localStorage.setItem('profile_pic', data.url);
                } else {
                    setProfileData(prev => ({ ...prev, banner_url: data.url }));
                    setNewBanner(data.url);
                }
            } else {
                const err = await res.json();
                alert(`Upload failed: ${err.error || res.statusText}`);
            }
        } catch (e) { console.error(e); alert(`Upload error: ${e.message}`); }
        finally { setLoading(false); }
    };

    const sendRequest = async () => {
        if (!profileData || !isLoggedIn) return;
        try {
            const res = await apiFetch(`${API_URL}/api/friends/request/${profileData.id}`, { method: 'POST' });
            if (res.ok) setFriendStatus('sent');
        } catch (e) { }
    };

    const acceptRequest = async (senderId) => {
        try {
            const res = await apiFetch(`${API_URL}/api/friends/accept/${senderId}`, { method: 'POST' });
            if (res.ok) {
                setRequests(prev => prev.filter(r => r.id !== senderId));
                // Refresh friends list?
                const fr = requests.find(r => r.id === senderId);
                if (fr) setFriends(prev => [...prev, fr]);
            }
        } catch (e) { }
    };

    if (!profileData) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

    return (
        <div className="flex-1 text-white max-w-4xl mx-auto pb-24 md:pb-0 px-4 md:px-8">
            <div className="relative mb-8 md:mb-12 bg-[#121212] rounded-3xl overflow-hidden border border-white/10 group">
                {/* Banner */}
                <div className="h-48 md:h-64 bg-gray-800 relative">
                    {profileData.banner_url ? (
                        <img src={profileData.banner_url} className="w-full h-full object-cover" alt="Banner" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-gray-900 to-black" />
                    )}
                    {editing && (
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                            <input type="file" hidden onChange={e => handleFileUpload(e, 'banner')} accept="image/*" />
                            <span className="bg-white/10 px-4 py-2 rounded-full backdrop-blur text-sm font-bold flex gap-2"><Upload size={16} /> Change Cover</span>
                        </label>
                    )}
                </div>

                {/* Profile Info */}
                <div className="px-6 md:px-8 pb-6 md:pb-8 flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 md:-mt-20 relative z-10">
                    {/* Avatar */}
                    <div className="relative group/avatar">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#121212] overflow-hidden bg-black shadow-2xl">
                            <img src={profileData.profile_pic} className="w-full h-full object-cover" alt="Avatar" />
                        </div>
                        {editing && (
                            <label className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                <input type="file" hidden onChange={e => handleFileUpload(e, 'avatar')} accept="image/*" />
                                <Upload size={24} className="text-white" />
                            </label>
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                            {editing ? (
                                <input value={newName} onChange={e => setNewName(e.target.value)} className="text-3xl font-black bg-transparent border-b border-white/20 outline-none w-full max-w-sm" />
                            ) : (
                                <h1 className="text-3xl md:text-5xl font-black tracking-tight">{profileData.username}</h1>
                            )}
                            {/* Action Buttons */}
                            {isMyProfile ? (
                                <button onClick={() => setEditing(!editing)} className="px-4 py-2 bg-white/10 rounded-full text-xs font-bold hover:bg-white/20 transition flex items-center gap-2">
                                    {editing ? 'Cancel' : <><Edit2 size={14} /> Edit Profile</>}
                                </button>
                            ) : isLoggedIn ? (
                                <button onClick={sendRequest} disabled={friendStatus !== 'none'} className={`px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${friendStatus === 'friend' ? 'bg-green-500/20 text-green-500' : 'bg-white text-black hover:bg-gray-200'}`}>
                                    {friendStatus === 'none' && <><UserPlus size={14} /> Add Friend</>}
                                    {friendStatus === 'sent' && 'Requested'}
                                    {friendStatus === 'friend' && 'Friend'}
                                    {friendStatus === 'received' && 'Remote Request'}
                                </button>
                            ) : (
                                <button disabled className="px-4 py-2 bg-white/5 text-gray-500 rounded-full text-xs font-bold cursor-not-allowed">
                                    Guest View
                                </button>
                            )}
                        </div>

                        {editing ? (
                            <textarea value={newBio} onChange={e => setNewBio(e.target.value)} className="w-full bg-white/5 rounded-lg p-2 text-sm text-gray-300 outline-none border border-white/10 resize-none h-20" placeholder="Write a bio..." />
                        ) : (
                            <p className="text-gray-400 text-sm md:text-base max-w-2xl">{profileData.bio || "No bio yet."}</p>
                        )}

                        {editing && <button onClick={handleUpdate} className="mt-2 px-6 py-2 bg-green-500 text-black font-bold rounded-full text-sm">Save Changes</button>}
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Friends & Stats */}
                <div className="space-y-6">
                    <div className="bg-[#18181d] p-6 rounded-2xl border border-white/5">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-400 text-sm uppercase tracking-wider">Stats</h3>
                        <div className="flex gap-4">
                            <div className="bg-white/5 px-4 py-3 rounded-xl flex-1 text-center">
                                <div className="text-2xl font-black text-white">{profileData.playlist_count || 0}</div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase">Playlists</div>
                            </div>
                            <div className="bg-white/5 px-4 py-3 rounded-xl flex-1 text-center">
                                <div className="text-2xl font-black text-white">{friends.length || 0}</div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase">Friends</div>
                            </div>
                        </div>
                    </div>

                    {isMyProfile && requests.length > 0 && (
                        <div className="bg-[#18181d] p-6 rounded-2xl border border-white/5">
                            <h3 className="font-bold mb-4 flex items-center gap-2 text-green-400 text-sm uppercase tracking-wider">Friend Requests</h3>
                            <div className="space-y-3">
                                {requests.map(r => (
                                    <div key={r.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img src={r.profile_pic} className="w-8 h-8 rounded-full" />
                                            <span className="font-bold text-sm">{r.username}</span>
                                        </div>
                                        <button onClick={() => acceptRequest(r.id)} className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-xs font-bold">Accept</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {friends.length > 0 && (
                        <div className="bg-[#18181d] p-6 rounded-2xl border border-white/5">
                            <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-400 text-sm uppercase tracking-wider">Friends ({friends.length})</h3>
                            <div className="flex flex-wrap gap-2">
                                {friends.map(f => (
                                    <div key={f.id} onClick={() => { if (setViewingProfileId) { setViewingProfileId(f.id); } }} className="cursor-pointer" title={f.username}>
                                        <img src={f.profile_pic} className="w-10 h-10 rounded-full border border-white/10" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Playlists */}
                <div className="lg:col-span-2 bg-[#18181d] p-6 rounded-2xl border border-white/5">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-400 text-sm uppercase tracking-wider">Public Playlists</h3>
                    {profileData.playlists && profileData.playlists.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {profileData.playlists.map(pl => (
                                <div key={pl.id} className="bg-white/5 p-4 rounded-xl flex items-center gap-4 hover:bg-white/10 transition cursor-pointer">
                                    <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center font-bold text-xl">{pl.name[0]}</div>
                                    <div>
                                        <div className="font-bold text-sm">{pl.name}</div>
                                        <div className="text-xs text-gray-500">{pl.track_count} tracks</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 italic">No public playlists.</div>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- MAIN CONTROLLER ---
export default function MainContent({ activeTab, setActiveTab, searchQuery, user, onSearch, onMenuClick }) {
    const { playSong, currentSong, isPlaying, likedSongs, toggleLike, playlists, addToPlaylist, createPlaylist, playPlaylist, deletePlaylist, removeFromPlaylist, addToQueue } = usePlayer();

    const [feed, setFeed] = useState([]);
    const [header, setHeader] = useState("Home");
    const [playlistData, setPlaylistData] = useState(null);
    const [searchType, setSearchType] = useState('songs');
    const [loading, setLoading] = useState(false);
    const [viewingProfileId, setViewingProfileId] = useState(null); // For public profiles

    const inputRef = React.useRef(null);
    const debounceRef = React.useRef(null);

    const handleGenreSearch = (genre) => {
        if (onSearch) onSearch(genre);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    useEffect(() => {
        if (activeTab === 'Upload' || activeTab === 'Podcast' || activeTab === 'Profile' || (typeof activeTab === 'string' && activeTab.startsWith('Podcast:'))) return;

        // Auto-focus search input
        if (activeTab === 'Search' && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 100);
        }

        const fetchData = async () => {
            setLoading(true);
            const token = localStorage.getItem('token');
            const validToken = token && token !== 'undefined' && token !== 'null' ? token.replace(/^"|"$/g, '') : null;

            let url = (activeTab === 'Home' && validToken)
                ? `${API_URL}/api/recommendations`
                : `${API_URL}/api/feed`;

            if (activeTab === 'Search') {
                if (!searchQuery.trim()) {
                    setFeed([]);
                    setLoading(false);
                    return;
                }
                url = searchType === 'people'
                    ? `${API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`
                    : `${API_URL}/api/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`;
                setHeader(`Results for "${searchQuery}"`);
            } else { setHeader(activeTab); }

            console.log(`[MainContent] Loading tab: ${activeTab}, Query: ${searchQuery}, URL: ${url}`);

            try {
                const options = validToken ? { headers: { 'Authorization': `Bearer ${validToken}` } } : {};
                const res = await fetch(url, options);
                const data = await res.json();
                setFeed(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error("Feed load error", e);
            } finally {
                setLoading(false);
            }
        };

        // Debounce ONLY for Search
        if (activeTab === 'Search') {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(fetchData, 500);
        } else {
            fetchData();
        }

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [activeTab, searchQuery, searchType]);

    useEffect(() => {
        if (typeof activeTab !== 'number') return;
        let mounted = true;
        const loadPlaylist = async () => {
            try {
                const res = await fetch(`${API_URL}/api/playlists/${activeTab}`);
                if (!res.ok) { if (mounted) setPlaylistData({ error: 'Not found', tracks: [] }); return; }
                const data = await res.json();
                if (mounted) setPlaylistData(data);
            } catch (e) { if (mounted) setPlaylistData({ error: 'Failed', tracks: [] }); }
        };
        setPlaylistData(null);
        loadPlaylist();
        return () => { mounted = false; };
    }, [activeTab]);

    // Discover Data Logic (Moved to Top Level)
    const [discoverData, setDiscoverData] = useState({ featured: [], electronic: [], hiphop: [], rest: [] });
    const [discoverLoading, setDiscoverLoading] = useState(false);

    useEffect(() => {
        if (activeTab !== 'Discover') return;

        let mounted = true;
        const loadDiscover = async () => {
            setDiscoverLoading(true);
            try {
                const [feat, elec, hip, trnd] = await Promise.all([
                    fetch(`${API_URL}/api/discover/featured`).then(r => r.json()),
                    fetch(`${API_URL}/api/discover/electronic`).then(r => r.json()),
                    fetch(`${API_URL}/api/discover/hiphop`).then(r => r.json()),
                    fetch(`${API_URL}/api/discover/trending`).then(r => r.json())
                ]);
                if (mounted) {
                    setDiscoverData({
                        featured: Array.isArray(feat) ? feat : [],
                        electronic: Array.isArray(elec) ? elec : [],
                        hiphop: Array.isArray(hip) ? hip : [],
                        rest: Array.isArray(trnd) ? trnd : []
                    });
                }
            } catch (e) { console.error("Discover load failed", e); }
            finally { if (mounted) setDiscoverLoading(false); }
        };

        // Only load if empty (cache-like behavior) or force reload if needed
        if (discoverData.featured.length === 0) {
            loadDiscover();
        }

        return () => { mounted = false; };
    }, [activeTab]);

    const playFlow = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token.replace(/^"|"$/g, '')}` } : {};
            const res = await fetch(`${API_URL}/api/flow`, { headers });
            const data = await res.json();
            if (data && data.length > 0) {
                playSong(data[0], data);
            }
        } catch (e) { console.error("Flow error", e); }
    };

    const renderContent = () => {
        if (activeTab === 'Profile') return <ProfileView user={user} targetId={viewingProfileId} setViewingProfileId={(id) => { setViewingProfileId(id); if (id) setActiveTab('Profile'); }} />;
        if (activeTab === 'Podcast') return <PodcastSection onOpenPodcast={(id) => setActiveTab(`Podcast:${id}`)} />;

        if (typeof activeTab === 'string' && activeTab.startsWith('Podcast:')) {
            const podcastId = activeTab.split(':')[1];
            return <PodcastDetail podcastId={podcastId} onBack={() => setActiveTab('Podcast')} />;
        }

        if (activeTab === 'Upload') return <UploadView />;

        if (activeTab === 'Search') {
            const handleSavePlaylistLink = async (e, item) => {
                e.stopPropagation();
                const token = localStorage.getItem('token');
                if (!token || token === 'undefined' || token === 'null') {
                    alert("Please login to import playlists");
                    return;
                }
                try {
                    const res = await apiFetch(`${API_URL}/api/playlists/import-youtube`, {
                        method: 'POST',
                        body: JSON.stringify({ yt_playlist_id: item.id, name: item.title })
                    });
                    if (res.ok) {
                        alert(`Saved "${item.title}" to your library`);
                        setTimeout(() => window.location.reload(), 1000);
                    } else {
                        const err = await res.json();
                        alert(err.error || "Failed to save playlist.");
                    }
                } catch (err) { alert("Connection error"); }
            };

            return (
                <div className="space-y-10 px-4 md:px-8">
                    <div>
                        <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-2">Discovery</p>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">Search</h1>
                    </div>

                    {/* NEW: Input for Mobile/Desktop */}
                    <div className="relative">
                        <input
                            ref={inputRef}
                            value={searchQuery}
                            onChange={(e) => onSearch && onSearch(e.target.value)}
                            placeholder="What do you want to listen to?"
                            className="w-full bg-[#18181d] border border-white/10 p-4 pl-12 rounded-2xl text-white focus:outline-none focus:border-green-500/50 transition shadow-lg text-lg placeholder:text-gray-500"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    </div>

                    {!searchQuery ? (
                        <div className="space-y-12">
                            <section>
                                <h3 className="text-gray-400 text-sm font-semibold mb-6">Browse Genres & Types</h3>
                                <div className="flex flex-wrap gap-3">
                                    {['Pop', 'Hip-Hop', 'Lofi', 'Rock', 'Jazz', 'Electronic'].map(genre => (
                                        <button key={genre} onClick={() => handleGenreSearch(genre)} className="px-6 py-3 bg-white/5 hover:bg-green-500 hover:text-black border border-white/10 rounded-full text-sm font-medium transition-all">{genre}</button>
                                    ))}
                                    <button onClick={() => setSearchType(searchType === 'playlists' ? 'songs' : 'playlists')} className={`px-6 py-3 border border-white/10 rounded-full text-sm font-medium transition-all ${searchType === 'playlists' ? 'bg-green-500 text-black' : 'bg-white/5 text-white'}`}>Search Playlists</button>
                                </div>
                            </section>
                            <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                <Search size={80} strokeWidth={1} />
                                <p className="mt-4 text-xl font-medium">Type to find your next favorite song</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-gray-400 text-sm font-semibold">Results for "{searchQuery}" ({searchType})</h3>
                                <div className="flex bg-white/5 rounded-lg p-1">
                                    {['songs', 'playlists', 'podcasts', 'people'].map(t => (
                                        <button key={t} onClick={() => setSearchType(t)} className={`px-4 py-1.5 rounded-md text-xs font-bold capitalize transition ${searchType === t ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}>{t}</button>
                                    ))}
                                </div>
                            </div>

                            {loading ? (
                                <div className="space-y-4">
                                    {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
                                </div>
                            ) : feed.length > 0 ? (
                                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-1">
                                    {searchType === 'people' ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {feed.map((Person, i) => (
                                                <div key={Person.id} onClick={() => { setViewingProfileId(Person.id); setActiveTab('Profile'); }} className="bg-white/5 p-4 rounded-xl flex flex-col items-center gap-2 cursor-pointer hover:bg-white/10 transition group">
                                                    <img src={Person.profile_pic} className="w-20 h-20 rounded-full object-cover shadow-lg group-hover:scale-105 transition" />
                                                    <div className="font-bold text-sm text-center">{Person.username}</div>
                                                    <div className="text-[10px] text-gray-500 uppercase font-bold text-green-500">{Person.status === 'friend' ? 'Friend' : (Person.status === 'sent' ? 'Requested' : (Person.status === 'received' ? 'Request Received' : ''))}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        feed.map((item, i) => (
                                            item.type === 'playlists' || item.type === 'podcast' ? (
                                                <motion.div variants={itemVariants} key={i} className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 cursor-pointer group transition border border-white/5">
                                                    <img src={item.cover || DEFAULT_IMG} onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMG; }} className="w-16 h-16 rounded-lg object-cover" alt={item.title} />
                                                    <div className="flex-1">
                                                        <h4 className="text-white font-bold truncate">{item.title}</h4>
                                                        <p className="text-sm text-gray-400">{item.artist} • {item.item_count ? item.item_count + ' items' : 'Playlist'}</p>
                                                    </div>
                                                    <button onClick={(e) => handleSavePlaylistLink(e, item)} className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black text-sm font-bold rounded-lg transition">Import</button>
                                                </motion.div>
                                            ) : (
                                                <motion.div variants={itemVariants} key={i}>
                                                    <SongRow key={i} index={i} song={item} feed={feed} isActive={currentSong?.id === item.id} isPlaying={isPlaying} isLiked={likedSongs?.has(item.id)} playlists={playlists} onPlay={playSong} onLike={toggleLike} onAdd={addToPlaylist} onAddToQueue={addToQueue} />
                                                </motion.div>
                                            )
                                        ))
                                    )}
                                </motion.div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                    <Search size={48} className="mb-4" />
                                    <p className="text-lg font-medium">No results found.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        if (typeof activeTab === 'number') {
            if (playlistData === null) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin text-green-500 mr-2" /> Loading playlist...</div>;
            if (playlistData?.error) return <div className="text-red-400">{playlistData.error}</div>;

            const handleDeletePlaylist = async () => {
                if (window.confirm("Are you sure you want to delete this playlist?")) {
                    const success = await deletePlaylist(activeTab);
                    if (success && setActiveTab) setActiveTab("Home");
                }
            };
            const handleRemoveTrack = async (videoId) => {
                if (window.confirm("Remove this track from playlist?")) {
                    const success = await removeFromPlaylist(activeTab, videoId);
                    if (success) {
                        setPlaylistData(prev => ({ ...prev, tracks: prev.tracks.filter(t => t.id !== videoId) }));
                    }
                }
            };

            return (
                <div className="px-4 md:px-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-1">{playlistData?.name || 'Playlist'}</h1>
                            <p className="text-sm text-gray-400">{playlistData?.tracks?.length || 0} tracks</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => playPlaylist(activeTab)} className="bg-green-500 text-black font-bold py-2 px-4 rounded-xl">Play</button>
                            <button onClick={handleDeletePlaylist} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition">
                                <Trash2 size={16} /> <span className="hidden md:inline">Delete</span>
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        {(playlistData?.tracks || []).map((song, i) => (
                            <div key={song.id + '-' + i} className="group relative">
                                <SongRow index={i} song={song} feed={playlistData.tracks} isActive={currentSong?.id === song.id} isPlaying={isPlaying} isLiked={likedSongs?.has(song.id)} playlists={playlists} onPlay={playSong} onLike={toggleLike} onAdd={addToPlaylist} />
                                <div className="absolute right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveTrack(song.id); }} className="p-2 bg-black/50 hover:bg-red-600 rounded-full text-white/70 hover:text-white transition shadow-lg"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (activeTab === 'Home') {
            const hour = new Date().getHours();
            let greeting = "Good Evening";
            if (hour < 12) greeting = "Good Morning";
            else if (hour < 18) greeting = "Good Afternoon";

            if (loading) return (
                <div className="space-y-8">
                    <div className="h-64 w-full bg-white/5 rounded-3xl animate-pulse" />
                    <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
                    </div>
                </div>
            );

            // Separate Logic for Desktop vs Mobile is handled by components now, 
            // but we pass common data.
            const heroItem = feed[0];
            const gridItems = feed.slice(1, 5);
            const listItems = feed.slice(5);

            const container = {
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.1 } }
            };

            return (
                <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 md:space-y-8 relative pb-32">
                    <MobileHome
                        user={user}
                        onMenuClick={onMenuClick}
                        greeting={greeting}
                        feed={feed} // Pass full feed for filtering
                        playSong={playSong}
                        playFlow={playFlow}
                        toggleLike={toggleLike}
                        addToPlaylist={addToPlaylist}
                        createPlaylist={createPlaylist} // Pass create capability
                        setActiveTab={setActiveTab}
                        currentSong={currentSong}
                        isPlaying={isPlaying}
                        likedSongs={likedSongs}
                        playlists={playlists}
                    />
                    <DesktopHome
                        greeting={greeting}
                        heroItem={heroItem}
                        gridItems={gridItems}
                        listItems={listItems}
                        playSong={playSong}
                        playFlow={playFlow}
                        toggleLike={toggleLike}
                        addToPlaylist={addToPlaylist}
                        currentSong={currentSong}
                        isPlaying={isPlaying}
                        likedSongs={likedSongs}
                        playlists={playlists}
                        feed={feed}
                    />
                </motion.div>
            );
        }

        if (activeTab === 'Discover') {
            if (discoverLoading && discoverData.featured.length === 0) return <SkeletonStreamLine />;

            const { featured, electronic, hiphop, rest } = discoverData;
            const heroItem = featured[0];

            return (
                <div className="space-y-6 pb-24">
                    <DiscoverHero
                        item={heroItem}
                        onPlay={(item) => playSong(item, feed)}
                        onLike={toggleLike}
                        isLiked={likedSongs.has(heroItem?.id)}
                    />

                    <div className="relative z-10 -mt-24 space-y-8">
                        <ScrollRow title="Trending Now" items={featured.slice(1, 10)} onPlay={(item) => playSong(item, feed)} />

                        <div className="px-4 md:px-8">
                            <div className="p-6 rounded-[2rem] bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-32 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
                                <h3 className="text-2xl font-black text-white mb-4 relative z-10">New & Hot 🔥</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 relative z-10">
                                    {(discoverData.rest.length > 0 ? discoverData.rest : featured.slice(2, 7)).map((item) => (
                                        <div key={item.id} onClick={() => playSong(item, feed)} className="group cursor-pointer bg-black/20 p-3 rounded-2xl hover:bg-white/10 transition duration-300">
                                            <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                                                <img src={item.cover} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt={item.title} />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition" />
                                                <button className="absolute bottom-2 right-2 p-3 bg-green-500 rounded-full text-black opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all shadow-lg hover:scale-110">
                                                    <Play fill="black" size={18} />
                                                </button>
                                            </div>
                                            <h4 className="font-bold text-white text-sm truncate">{item.title}</h4>
                                            <p className="text-xs text-gray-400">{item.artist}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <ScrollRow title="Electronic Essentials" items={electronic} onPlay={(item) => playSong(item, feed)} />
                        <ScrollRow title="Hip-Hop & R&B" items={hiphop} onPlay={(item) => playSong(item, feed)} />

                        <div className="px-4 md:px-8 pb-8">
                            <h3 className="text-xl font-bold text-white mb-4">Curated For You</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {['Late Night Lo-Fi', 'Workout Pump', 'Focus Flow', 'Dinner Jazz', 'Party Hits', 'Sleep Sounds'].map((name, i) => (
                                    <div key={i} onClick={() => handleGenreSearch(name)} className="h-20 rounded-xl bg-white/5 border border-white/5 hover:border-green-500/50 hover:bg-white/10 transition cursor-pointer flex items-center px-5 relative overflow-hidden group">
                                        <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-black/50 to-transparent" />
                                        <span className="font-bold text-sm md:text-base z-10 group-hover:text-green-400 transition-colors">{name}</span>
                                        <ArrowLeft size={16} className="rotate-180 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-green-500" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-0">
                <h1 className="text-4xl font-bold text-white mb-6">{header}</h1>
                <div className="space-y-1">
                    {loading ? (
                        [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                    ) : (
                        feed.map((song, i) => (
                            <SongRow key={i} index={i} song={song} feed={feed} isActive={currentSong?.id === song.id} isPlaying={isPlaying} isLiked={likedSongs?.has(song.id)} playlists={playlists} onPlay={playSong} onLike={toggleLike} onAdd={addToPlaylist} />
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 overflow-hidden relative">


            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 12, filter: "blur(10px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -12, filter: "blur(10px)" }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="h-full p-0 md:p-4 overflow-y-auto content-safe-area custom-scrollbar"
                >
                    <div className="max-w-7xl mx-auto p-0 md:p-8">
                        {renderContent()}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
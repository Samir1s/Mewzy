import React, { useState, useEffect, useRef } from 'react';
import { Home, Compass, Mic2, Disc, Music, User, Search, Upload, PlusCircle, ListMusic, LogOut, LogIn, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';
import API_URL from '../config';

const SidebarItem = ({ icon, label, active, onClick }) => (
    <div onClick={onClick} className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all group ${active ? "bg-green-500/10 text-green-400 border-l-4 border-green-500 shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"
        }`}>
        {React.cloneElement(icon, { size: 18, className: active ? "text-green-400" : "group-hover:text-white" })}
        <span className="text-sm font-semibold tracking-tight">{label}</span>
    </div>
);

export default function Sidebar({ activeTab, setActiveTab, onLoginClick, user, onSearch, setIsMobileMenuOpen }) {
    const { playlists, createPlaylist } = usePlayer();
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const isSelection = useRef(false);

    useEffect(() => {
        if (isSelection.current) {
            isSelection.current = false;
            return;
        }

        if (query.length > 2) {
            const timeoutId = setTimeout(() => {
                fetch(`${API_URL}/api/search/suggestions?q=${query}`)
                    .then(res => res.json())
                    .then(data => setSuggestions(Array.isArray(data) ? data : []))
                    .catch(() => setSuggestions([]));
            }, 300);
            return () => clearTimeout(timeoutId);
        } else {
            setSuggestions([]);
        }
    }, [query]);

    const handleSearchSubmit = (q) => {
        onSearch(q);
        setSuggestions([]);
        isSelection.current = true;
        setQuery(q);
        setActiveTab("Search");
        setIsMobileMenuOpen(false);
    };

    const fileInputRef = useRef(null);

    const handleUploadClick = () => {
        if (!user) {
            onLoginClick();
            return;
        }
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        // Simple metadata (could be expanded with a modal)
        formData.append('title', file.name.replace(/\.[^/.]+$/, ""));
        formData.append('artist', user.username || 'Unknown User');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                alert(`Upload Successful! Track ID: ${data.id}`);
                // Ideally refresh library here
            } else {
                alert(`Upload Failed: ${data.error}`);
            }
        } catch (err) {
            console.error(err);
            alert("Upload Error");
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#121216] md:bg-transparent rounded-[2.5rem] md:rounded-none p-6 md:p-0 border border-white/5 md:border-none shadow-2xl md:shadow-none overflow-hidden">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".mp3,.wav,.ogg,.m4a"
            />

            {/* Header section (Mobile only) */}
            <div className="flex items-center justify-between mb-8 px-2 md:hidden">
                <h2 className="text-xl font-black tracking-tighter text-white uppercase">Menu</h2>
                <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 bg-white/5 rounded-full text-gray-400 active:scale-95 transition-transform"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Desktop Brand */}
            <div className="hidden md:flex items-center gap-3 mb-10 px-2 group">
                <img
                    src="/logo.png"
                    alt="Mewzy Logo"
                    className="w-16 h-16 object-cover transition-transform duration-300 group-hover:scale-110"
                    style={{
                        maskImage: 'radial-gradient(circle, black 50%, transparent 70%)',
                        WebkitMaskImage: 'radial-gradient(circle, black 50%, transparent 70%)'
                    }}
                />
                <div className="flex flex-col">
                    <span className="text-2xl font-black tracking-tighter text-white leading-none">Mewzy</span>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-green-400 font-bold ml-0.5 shadow-green-400/20">Music</span>
                </div>
            </div>

            {/* --- SEARCH SECTION --- */}
            {/* We use an absolute icon to ensure it appears INSIDE the input padding */}
            <div className="relative mb-10 px-2 z-[60]">
                <div className="relative flex items-center">
                    <div className="absolute left-4 z-10 pointer-events-none">
                        <Search className="text-gray-500 group-focus-within:text-green-400 transition-colors" size={20} />
                    </div>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(query)}
                        type="text"
                        placeholder="Search tracks, artists..."
                        className="w-full bg-[#1e1e24]/80 backdrop-blur-md text-white text-sm font-medium rounded-full pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-green-500/20 border border-white/5 transition-all shadow-inner placeholder:text-gray-600"
                    />
                </div>

                {/* Suggestions dropdown */}
                <AnimatePresence>
                    {suggestions.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="absolute top-full left-2 right-2 mt-3 bg-[#1e1e24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[70] backdrop-blur-xl"
                        >
                            {suggestions.map((s, i) => (
                                <div key={i} onClick={() => handleSearchSubmit(s)} className="px-5 py-3 hover:bg-white/5 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors border-b border-white/5 last:border-0">
                                    {s}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- SCROLLABLE CONTAINER --- */}
            {/* Added flex-1 to push everything content-related, leaving room for logout */}
            <div className="overflow-y-auto flex-1 space-y-8 scrollbar-hide px-2">
                <section>
                    <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4 px-2 opacity-50">Discovery</h3>
                    <SidebarItem icon={<Home />} label="Home" active={activeTab === "Home"} onClick={() => { setActiveTab("Home"); setIsMobileMenuOpen(false); }} />
                    <SidebarItem icon={<Compass />} label="Discover" active={activeTab === "Discover"} onClick={() => { setActiveTab("Discover"); setIsMobileMenuOpen(false); }} />
                    <SidebarItem icon={<Mic2 />} label="Podcasts" active={activeTab === "Podcast"} onClick={() => { setActiveTab("Podcast"); setIsMobileMenuOpen(false); }} />
                </section>

                <section>
                    <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4 px-2 opacity-50">Your Music</h3>
                    <SidebarItem icon={<User />} label="Profile" active={activeTab === "Profile"} onClick={() => { if (user) { setActiveTab("Profile"); setIsMobileMenuOpen(false); } else { onLoginClick(); } }} />
                    <SidebarItem icon={<Disc />} label="Albums" />
                    <SidebarItem icon={<User />} label="Artists" />
                    <SidebarItem icon={<Upload />} label="Upload" active={activeTab === "Upload"} onClick={handleUploadClick} />
                </section>

                <section>
                    <div className="flex items-center justify-between px-2 mb-4">
                        <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest opacity-50">Playlists</h3>
                        <button onClick={() => { const name = prompt("Playlist Name:"); if (name) createPlaylist(name); }} className="text-gray-500 hover:text-green-400 transition-colors">
                            <PlusCircle size={16} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        {Array.isArray(playlists) && playlists.map((pl) => (
                            <SidebarItem key={pl.id} icon={<ListMusic />} label={pl.name} active={activeTab === pl.id} onClick={() => { setActiveTab(pl.id); setIsMobileMenuOpen(false); }} />
                        ))}
                    </div>
                </section>

                {/* --- LOGOUT SECTION (Pinned at bottom of scroll) --- */}
                {/* pb-32 adds enough space so the menu items don't hide behind the mini-player player overlay */}
                <div className="mt-6 pt-6 border-t border-white/5 pb-36 md:pb-10">
                    {user ? (
                        <SidebarItem icon={<LogOut />} label="Logout" onClick={() => { localStorage.clear(); window.location.reload(); }} />
                    ) : (
                        <SidebarItem icon={<LogIn />} label="Login" onClick={onLoginClick} />
                    )}
                </div>
            </div>
        </div>
    );
}
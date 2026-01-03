import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Settings, Play, Heart, MoreHorizontal, Menu } from 'lucide-react';
import { SkeletonCard } from './Skeletons';
import SongRow from './SongRow';

const MobileHome = ({ user, profilePic, greeting, feed, playSong, playFlow, toggleLike, addToPlaylist, createPlaylist, setActiveTab, currentSong, isPlaying, likedSongs, playlists, onMenuClick }) => {
    const [activeFilter, setActiveFilter] = useState('All');

    // Filter Logic
    const getFilteredFeed = () => {
        if (activeFilter === 'All') return feed;
        if (activeFilter === 'New Release') return feed.slice(0, 5); // Mock logic
        if (activeFilter === 'Trending') return feed.slice(5, 10);
        if (activeFilter === 'Top') return feed.filter(i => i.likes > 50); // Mock logic
        return feed;
    };

    const filteredFeed = getFilteredFeed();
    const heroItem = filteredFeed[0];
    const gridItems = filteredFeed.slice(1, 5);
    const listItems = filteredFeed.slice(5);

    // Animation Variants
    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    const itemAnim = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 20 } }
    };

    return (
        <motion.div className="md:hidden space-y-8" variants={container} initial="hidden" animate="show">
            {/* --- Sticky Glass Header --- */}
            {/* --- Sticky Glass Header --- */}
            {/* --- Sticky Glass Header --- */}
            {/* --- Sticky Glass Header --- */}
            <div className="sticky top-0 z-40 backdrop-blur-3xl bg-[#0f0f13]/90 border-b border-white/5 pb-4 pt- safe-top transition-all duration-300">

                {/* 1. Top Bar: Menu (Left) & Actions (Right) */}
                <motion.div variants={itemAnim} className="flex items-center justify-between px-4 py-3">
                    <button onClick={onMenuClick} className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white active:scale-90 transition-transform">
                        <Menu size={20} />
                    </button>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setActiveTab('Search')} className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white active:scale-90 transition-transform">
                            <Search size={18} />
                        </button>
                        <motion.div
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setActiveTab('Profile')}
                            className="w-10 h-10 rounded-full cursor-pointer overflow-hidden"
                        >
                            <img
                                src={profilePic || "https://cdn-icons-png.flaticon.com/512/847/847969.png"}
                                className="w-full h-full object-cover"
                                alt="Profile"
                            />
                        </motion.div>
                    </div>
                </motion.div>

                {/* 2. Big Greeting with Date & Spotlight */}
                <motion.div variants={itemAnim} className="px-4 mt-4 mb-6 relative">
                    {/* Spotlight Glow */}
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl pointer-events-none mix-blend-screen"></div>

                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mb-2 ml-1">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                        <h1 className="text-3xl font-black text-white leading-tight tracking-tighter mb-6">
                            <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 block mb-1">
                                {new Date().getHours() < 12 ? 'Good Morning,' : new Date().getHours() < 18 ? 'Good Afternoon,' : 'Good Evening,'}
                            </span>
                            {user || "Guest"}
                        </h1>
                        <button
                            onClick={playFlow}
                            className="w-full relative h-[100px] rounded-[2rem] overflow-hidden group shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 hover:scale-[1.02] active:scale-95 border border-white/10"
                        >
                            {/* Sophisticated Glass Mesh Background */}
                            <div className="absolute inset-0 bg-[#121212]" />
                            <div className="absolute inset-0 opacity-40">
                                <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[200%] bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-blue-500/20 blur-[80px] animate-aurora" />
                                <div className="absolute bottom-[-20%] right-[-20%] w-[100%] h-[100%] bg-gradient-to-tl from-emerald-500/10 via-teal-500/10 to-transparent blur-[60px] animate-pulse" />
                            </div>

                            {/* Noise Texture */}
                            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />

                            {/* Glass Reflection */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                            {/* Content Layer */}
                            <div className="relative z-10 w-full h-full flex items-center justify-between px-7">
                                <div className="flex items-center gap-5">
                                    <div className="relative w-14 h-14">
                                        <div className="absolute inset-0 bg-white/10 rounded-full blur-md" />
                                        <div className="relative w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner group-hover:bg-white/20 transition-colors">
                                            <Play size={24} fill="white" className="ml-1 text-white shadow-sm" />
                                        </div>
                                    </div>

                                    <div className="text-left flex flex-col justify-center">
                                        <div className="text-2xl font-black text-white leading-none tracking-tight drop-shadow-md">My Flow</div>
                                        <div className="text-[11px] font-bold text-white/50 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                                            <span>Personal Mix</span>
                                            <span className="w-1 h-1 rounded-full bg-white/30" />
                                            <span className="text-white/80">Infinite</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Modern EQ Animation */}
                                <div className="flex items-center gap-1 h-5 opacity-70">
                                    <div className="w-[3px] bg-gradient-to-t from-white/20 to-white rounded-full animate-wave" style={{ animationDuration: '0.9s' }}></div>
                                    <div className="w-[3px] bg-gradient-to-t from-white/20 to-white rounded-full animate-wave" style={{ animationDuration: '1.1s' }}></div>
                                    <div className="w-[3px] bg-gradient-to-t from-white/20 to-white rounded-full animate-wave" style={{ animationDuration: '0.7s' }}></div>
                                    <div className="w-[3px] bg-gradient-to-t from-white/20 to-white rounded-full animate-wave" style={{ animationDuration: '1.3s' }}></div>
                                </div>
                            </div>
                        </button>
                    </div>
                </motion.div>

                {/* 3. Filter Chips (Pills) */}
                <motion.div variants={itemAnim} className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none content-safe-area-x mask-linear-fade">
                    {['All', 'New Release', 'Trending', 'Top'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`whitespace-nowrap px-6 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all duration-300 ${activeFilter === filter
                                ? 'bg-[#d2fb54] text-black shadow-[0_0_20px_rgba(210,251,84,0.4)] scale-105'
                                : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </motion.div>
            </div>

            {/* 3. Curated & Trending */}
            <motion.div variants={itemAnim} className="space-y-4 px-4">
                <h2 className="text-xl font-bold text-white tracking-tight">Curated & trending</h2>
                {heroItem ? (
                    <motion.div
                        whileTap={{ scale: 0.98 }}
                        onClick={() => playSong(heroItem)}
                        className="relative w-full aspect-[16/10] rounded-[2.5rem] p-6 overflow-hidden shadow-2xl mx-auto group cursor-pointer"
                        style={{
                            background: 'radial-gradient(circle at top left, #c084fc, #7c3aed 40%, #4c1d95 90%)',
                            boxShadow: '0 20px 40px -10px rgba(124, 58, 237, 0.5)'
                        }}
                    >
                        {/* Noise Overlay */}
                        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none"></div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <span className="px-2 py-1 bg-black/20 backdrop-blur-md rounded-lg text-[10px] font-bold text-white mb-2 inline-block border border-white/10">WEEKLY PICK</span>
                                <h3 className="text-3xl font-black text-white mb-1 leading-none tracking-tight">Discover<br />weekly</h3>
                                <p className="text-white/80 text-xs font-medium max-w-[60%] mt-2">The original slow instrumental best playlists.</p>
                            </div>

                            <div className="flex items-end justify-between">
                                <div className="flex items-center gap-4">
                                    <button className="w-14 h-14 bg-[#18181d] rounded-full flex items-center justify-center shadow-xl text-white group-active:scale-90 transition-transform">
                                        <Play fill="white" size={24} className="ml-1" />
                                    </button>
                                    <div className="flex gap-4 text-white/80">
                                        <Heart size={22} className={likedSongs?.has(heroItem.id) ? "fill-green-500 text-green-500" : ""} />
                                        <MoreHorizontal size={22} />
                                    </div>
                                </div>

                                {/* Artist Image Masked */}
                                <div className="absolute right-[-10px] bottom-[-10px] w-40 h-44">
                                    <img
                                        src={heroItem.cover}
                                        className="w-full h-full object-cover rounded-tl-[3rem] shadow-[-10px_-10px_30px_rgba(0,0,0,0.3)] saturate-[1.1]"
                                        style={{ maskImage: 'linear-gradient(to bottom, black 85%, transparent)' }}
                                        alt="Cover"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : <SkeletonCard />}
            </motion.div>

            {/* --- Your Playlists (New Section) --- */}
            <motion.div variants={itemAnim} className="space-y-4">
                <div className="px-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white tracking-tight">Your Playlists</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto px-4 pb-4 snap-x content-safe-area-x">
                    <motion.div
                        whileTap={{ scale: 0.95 }}
                        className="snap-start shrink-0 w-36 flex flex-col gap-3 group cursor-pointer"
                        onClick={() => {
                            const name = prompt("Enter playlist name:");
                            if (name && createPlaylist) createPlaylist(name);
                        }}
                    >
                        <div className="aspect-square rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center">
                            <span className="text-4xl text-white/20 font-light">+</span>
                        </div>
                        <div className="px-1"><h4 className="font-bold text-sm text-white">Create New</h4></div>
                    </motion.div>

                    {playlists && playlists.map((pl, i) => (
                        <motion.div
                            whileTap={{ scale: 0.95 }}
                            key={pl.id}
                            className="snap-start shrink-0 w-36 flex flex-col gap-3 group cursor-pointer"
                            onClick={() => setActiveTab(pl.id)}
                        >
                            <div className="aspect-square rounded-[1.5rem] overflow-hidden relative shadow-lg bg-[#222]">
                                <div className="absolute inset-0 flex items-center justify-center text-white/40 font-bold text-xl">{pl.name[0]}</div>
                            </div>
                            <div className="px-1">
                                <h4 className="font-bold text-sm truncate text-white">{pl.name}</h4>
                                <p className="text-[10px] text-gray-400 truncate font-medium">{pl.tracks?.length || 0} tracks</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* 4. Top Daily Playlists */}
            <motion.div variants={itemAnim} className="space-y-4">
                <div className="px-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white tracking-tight">Top daily playlists</h2>
                    <span className="text-xs text-[#d2fb54] font-bold">See all</span>
                </div>
                {/* Horizontal Playlist Scroll */}
                <div className="flex gap-4 overflow-x-auto px-4 pb-4 snap-x content-safe-area-x">
                    {gridItems.map((item, i) => (
                        <motion.div
                            whileTap={{ scale: 0.95 }}
                            key={i}
                            onClick={() => playSong(item)}
                            className="snap-start shrink-0 w-36 flex flex-col gap-3 group cursor-pointer"
                        >
                            <div className="aspect-square rounded-[1.5rem] overflow-hidden relative shadow-lg">
                                <img src={item.cover} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt={item.title} />
                                <div className="absolute inset-0 bg-black/10 group-active:bg-black/20 transition-colors"></div>
                            </div>
                            <div className="px-1">
                                <h4 className="font-bold text-sm truncate text-white">{item.title}</h4>
                                <p className="text--[10px] text-gray-400 truncate font-medium">By {item.artist}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* 5. Additional List for scrolling content */}
            <motion.div variants={itemAnim} className="space-y-2 px-2 pb-8">
                <h2 className="text-xl font-bold text-white mb-4 px-2 tracking-tight">Midnight Confessions</h2>
                {listItems.slice(0, 5).map((item, i) => (
                    <SongRow key={i} index={i} song={item} feed={feed} isActive={currentSong?.id === item.id} isPlaying={isPlaying} isLiked={likedSongs?.has(item.id)} playlists={playlists} onPlay={playSong} onLike={toggleLike} onAdd={addToPlaylist} />
                ))}
            </motion.div>
        </motion.div>
    );
};

export default MobileHome;

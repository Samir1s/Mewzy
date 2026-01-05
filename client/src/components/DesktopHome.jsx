import React from 'react';
import { motion } from 'framer-motion';
import { Play, Heart, Compass, PlayCircle, ListMusic } from 'lucide-react';
import SongRow from './SongRow';
import { getImageUrl } from '../utils/urlUtils';

const DesktopHome = ({ greeting, heroItem, gridItems, listItems, playSong, playFlow, toggleLike, addToPlaylist, currentSong, isPlaying, likedSongs, playlists, feed }) => {

    // Animation Variants
    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };
    const itemAnim = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 20 } }
    };

    return (
        <div className="hidden md:block space-y-8">
            {/* Ambient Background Glow */}
            {heroItem && (
                <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-green-500/15 blur-[120px] rounded-full pointer-events-none opacity-40 mix-blend-screen animate-pulse-slow will-change-transform" />
            )}

            {/* Header */}
            <motion.header variants={itemAnim} className="flex items-center justify-between pb-2 relative z-10">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-400 tracking-tight drop-shadow-sm mb-0.5">
                        {greeting}
                    </h1>
                    <p className="text-gray-400 text-sm font-medium tracking-wide">Your daily mix, curated just for you.</p>
                </div>
                {/* My Flow Button */}
                <button
                    onClick={playFlow}
                    className="group relative px-6 py-2.5 rounded-full overflow-hidden shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all duration-300 active:scale-95"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#059669] to-[#10b981] opacity-90 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />

                    <div className="flex items-center gap-2 relative z-10">
                        <div className="flex items-end gap-[2px] h-3">
                            <div className="w-[2px] bg-white rounded-full animate-wave" style={{ animationDuration: '0.8s' }}></div>
                            <div className="w-[2px] bg-white rounded-full animate-wave animate-wave-delay-1" style={{ animationDuration: '1.2s' }}></div>
                            <div className="w-[2px] bg-white rounded-full animate-wave animate-wave-delay-2" style={{ animationDuration: '0.6s' }}></div>
                        </div>
                        <span className="font-extrabold text-white text-sm uppercase tracking-wide drop-shadow-sm">My Flow</span>
                    </div>
                </button>
            </motion.header>


            {/* Hero Section */}
            {heroItem && (
                <motion.div variants={itemAnim} className="relative w-full h-72 rounded-[2rem] overflow-hidden group shadow-2xl transition-all transform hover:scale-[1.005] ring-1 ring-white/10 hover:ring-white/20">
                    {/* Background */}
                    <div className="absolute inset-0">
                        <img src={getImageUrl(heroItem.cover)} className="w-full h-full object-cover blur-2xl opacity-50 scale-110" alt="bg" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/20 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#121212] via-black/50 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="relative h-full flex items-center p-6 md:p-8 z-10">
                        <div className="flex gap-6 items-center w-full max-w-6xl mx-auto">
                            <div className="relative shrink-0 group-hover:scale-105 transition duration-500 shadow-2xl rounded-2xl">
                                <img src={getImageUrl(heroItem.cover)} className="w-48 h-48 rounded-2xl object-cover hidden md:block shadow-lg" alt={heroItem.title} />
                                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl"></div>
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-3 py-1 bg-green-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_4px_12px_rgba(34,197,94,0.4)]">Top Pick</span>
                                </div>
                                <h2 className="text-4xl md:text-6xl font-black text-white mb-2 leading-none truncate drop-shadow-2xl tracking-tighter">{heroItem.title}</h2>
                                <p className="text-xl text-gray-200 font-medium mb-5 truncate opacity-90">{heroItem.artist}</p>

                                <div className="flex gap-3">
                                    <button onClick={() => playSong(heroItem, feed)} className="bg-gradient-to-b from-green-400 to-green-500 text-black font-bold py-3 px-8 rounded-full flex items-center gap-2 hover:from-green-300 hover:to-green-400 transition transform hover:scale-105 shadow-[0_4px_20px_rgba(34,197,94,0.3)] text-sm active:scale-95 ring-1 ring-white/20">
                                        <Play fill="black" size={18} /> Play Now
                                    </button>
                                    <button onClick={() => toggleLike(heroItem)} className={`p-3 rounded-full border backdrop-blur-md transition hover:scale-110 active:scale-95 shadow-lg ${likedSongs.has(heroItem.id) ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'}`}>
                                        <Heart size={20} className={likedSongs.has(heroItem.id) ? 'fill-green-500' : ''} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Top Picks Grid */}
            {gridItems.length > 0 && (
                <motion.section variants={itemAnim}>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Compass size={18} className="text-blue-400" /> Quick Picks
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {gridItems.map((item) => (
                            <div key={item.id} onClick={() => playSong(item, feed)} className="group relative bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl">
                                <div className="aspect-square rounded-xl overflow-hidden mb-3 relative shadow-md group-hover:shadow-lg transition-shadow">
                                    <img src={getImageUrl(item.cover)} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt={item.title} />
                                    <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-xl"></div>
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <PlayCircle size={40} className="text-white drop-shadow-lg scale-90 group-hover:scale-100 transition-transform" />
                                    </div>
                                </div>
                                <h4 className="font-bold text-white truncate text-sm mb-0.5 group-hover:text-green-400 transition-colors">{item.title}</h4>
                                <p className="text-xs text-gray-500 truncate font-medium">{item.artist}</p>
                            </div>
                        ))}
                    </div>
                </motion.section>
            )}

            {/* The Rest (List) */}
            {listItems.length > 0 && (
                <motion.section variants={itemAnim}>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <ListMusic size={18} className="text-purple-400" /> More for You
                    </h3>
                    <div className="space-y-1">
                        {listItems.map((song, i) => (
                            <SongRow key={i} index={i + 5} song={song} feed={feed} isActive={currentSong?.id === song.id} isPlaying={isPlaying} isLiked={likedSongs?.has(song.id)} playlists={playlists} onPlay={playSong} onLike={toggleLike} onAdd={addToPlaylist} />
                        ))}
                    </div>
                </motion.section>
            )}
        </div>
    );
};

export default DesktopHome;

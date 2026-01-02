import React, { useState, memo } from 'react';
import { Heart, MoreHorizontal, ListPlus } from 'lucide-react';

const DEFAULT_IMG = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80";

const SongRow = memo(({ song, index, isPlaying, isActive, onPlay, onLike, isLiked, playlists, onAdd, onAddToQueue, feed }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <div onClick={() => onPlay(song, feed)} className={`grid grid-cols-[24px_1fr_auto] md:grid-cols-[40px_1fr_1fr_60px_40px] gap-3 md:gap-4 px-2 py-2 md:px-4 md:py-3 rounded-xl cursor-pointer items-center transition hover:bg-white/5 ${isActive ? "bg-white/10" : ""}`}>
            {/* Index */}
            <div className={`text-xs md:text-sm font-bold ${isActive ? "text-green-400" : "text-gray-500"}`}>{index + 1}</div>

            {/* Title + Image */}
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={song.cover || DEFAULT_IMG} onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMG; }} className="w-10 h-10 rounded-lg object-cover" alt={song.title} />
                    {isActive && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-full bg-black/30 rounded-lg" />
                            <div className="absolute w-6 h-6 bg-green-400 rounded-full flex items-center justify-center shadow-lg">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-bold truncate ${isActive ? "text-green-400" : "text-white"}`}>{song.title}</h4>
                    {/* Mobile Artist */}
                    <p className="md:hidden text-xs text-gray-500 truncate">{song.artist}</p>
                </div>
            </div>

            {/* Desktop Artist */}
            <div className="hidden md:block text-gray-500 text-sm truncate">{song.artist}</div>

            {/* Desktop Duration */}
            <div className="hidden md:block text-gray-500 text-xs font-mono">{song.duration || "N/A"}</div>

            {/* Actions */}
            <div className="flex gap-2 relative justify-end">
                <Heart size={16} onClick={(e) => { e.stopPropagation(); onLike(song); }} className={`hidden md:block ${isLiked ? "fill-green-500 text-green-500" : "text-gray-500 hover:text-white"}`} />
                <MoreHorizontal size={16} onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} className="text-gray-500 hover:text-white" />
                {menuOpen && (
                    <div className="absolute right-0 top-6 bg-black border border-white/10 rounded-lg p-2 z-50 w-40 shadow-xl">
                        <div onClick={(e) => { e.stopPropagation(); if (onAddToQueue) onAddToQueue(song); setMenuOpen(false); }} className="text-xs text-white p-2 hover:bg-white/20 rounded cursor-pointer flex items-center gap-2 border-b border-white/10 mb-1">
                            <ListPlus size={14} /> Add to Queue
                        </div>
                        {playlists && playlists.map(p => (
                            <div key={p.id} onClick={(e) => { e.stopPropagation(); onAdd(p.id, song); setMenuOpen(false); }} className="text-xs text-white p-2 hover:bg-white/20 rounded cursor-pointer">{p.name}</div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

export default SongRow;

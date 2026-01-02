import React from 'react';
import { useHistory } from '../hooks/useHistory';
import { usePlayer } from '../context/PlayerContext';
import { Trash2, Clock, Play } from 'lucide-react';
import { motion } from 'framer-motion';

const getThumb = (url) => {
    if (!url) return null;
    try {
        if (url.includes('googleusercontent.com')) return url.replace(/=[^=]*$/, '=s120-c');
        if (url.includes('w1200')) return url.replace(/w1200(-h1200)?/g, 'w120-h120');
        if (url.includes('w544')) return url.replace(/w544(-h544)?/g, 'w120-h120');
        return url;
    } catch (e) { return url; }
};

export default function HistoryView() {
    const { recent, loading, error, deleteItem, playItem } = useHistory();
    const { currentSong } = usePlayer();

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="h-full overflow-y-auto content-safe-area custom-scrollbar p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Recently Played</h1>
                        <p className="text-gray-400 text-sm">Your listening history across all devices</p>
                    </div>
                </header>

                {loading && recent.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <div className="w-8 h-8 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mb-4" />
                        <p>Syncing history...</p>
                    </div>
                ) : recent.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        {error || "No songs played yet. Start listening!"}
                    </div>
                ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-2">
                        {recent.map((s, i) => (
                            <motion.div
                                variants={itemVariants}
                                key={s.id || i}
                                onClick={() => playItem(s)}
                                className={`group flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-white/5 hover:bg-white/5 ${currentSong?.id === s.id ? 'bg-white/10 border-white/10' : ''}`}
                            >
                                <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-lg bg-[#222]">
                                    <img
                                        src={getThumb(s.cover)}
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                                        onError={(e) => { e.target.style.display = 'none' }}
                                        alt={s.title}
                                    />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play fill="white" size={20} className="text-white drop-shadow-lg" />
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className={`font-bold truncate text-base ${currentSong?.id === s.id ? 'text-green-400' : 'text-white'}`}>{s.title}</h4>
                                    <p className="text-sm text-gray-400 truncate">{s.artist}</p>
                                </div>

                                <button
                                    onClick={(e) => deleteItem(e, s.id)}
                                    className="p-3 text-gray-500 hover:text-red-500 hover:bg-white/10 rounded-full transition opacity-100 md:opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}

import React from 'react';
import { useHistory } from '../hooks/useHistory';
import { usePlayer } from '../context/PlayerContext';
import { Trash2 } from 'lucide-react';


export default function RightSidebar() {
   const { recent, loading, error, deleteItem, playItem } = useHistory();
   const { currentSong } = usePlayer();

   const getThumb = (url) => {
      if (!url) return null;
      try {
         if (url.includes('googleusercontent.com')) return url.replace(/=[^=]*$/, '=s120-c');
         if (url.includes('w1200')) return url.replace(/w1200(-h1200)?/g, 'w120-h120');
         if (url.includes('w544')) return url.replace(/w544(-h544)?/g, 'w120-h120');
         return url;
      } catch (e) { return url; }
   };

   return (
      <div className="w-80 flex flex-col p-6 border-l border-white/5 bg-[#121216]/80 backdrop-blur-2xl z-20 h-full">
         <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-white">Recently Played</h3>
         </div>

         <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            {loading && recent.length === 0 ? (
               <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading...
               </div>
            ) : recent.length === 0 ? (
               <div className="text-sm text-gray-400">{error || "No recently played songs."}</div>
            ) : (
               recent.map((s, i) => (
                  <div
                     key={s.id || i}
                     className={`group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition cursor-pointer relative ${currentSong?.id === s.id ? 'bg-white/3' : ''}`}
                     onClick={() => playItem(s)}
                  >
                     <div className="w-10 h-10 shrink-0 rounded-lg bg-white/5 overflow-hidden relative">
                        {s.cover ? (
                           <img
                              loading="lazy"
                              src={getThumb(s.cover)}
                              alt={s.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                 e.target.style.display = 'none';
                                 e.target.parentElement.classList.add('bg-gray-800');
                              }}
                           />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center bg-gray-800 text-[8px] text-gray-400">NA</div>
                        )}
                     </div>
                     <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white truncate">{s.title || "Unknown"}</div>
                        <div className="text-[10px] text-gray-400 truncate">{s.artist || "Unknown"}</div>
                     </div>

                     <button
                        onClick={(e) => deleteItem(e, s.id)}
                        className="md:opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-red-500 transition-all z-10"
                        title="Remove from history"
                     >
                        <Trash2 size={14} />
                     </button>
                  </div>
               ))
            )}
         </div>
      </div>
   );
}
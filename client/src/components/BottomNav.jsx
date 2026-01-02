import React from 'react';
import { Home, Compass, User, Clock, Search } from 'lucide-react';
import { motion } from 'framer-motion';

import { usePlayer } from '../context/PlayerContext';

export default function BottomNav({ activeTab, setActiveTab }) {
    const { isExpanded } = usePlayer();

    const tabs = [
        { id: "Home", icon: Home, label: "Home" },
        { id: "Discover", icon: Compass, label: "Discover" },
        { id: "Search", icon: Search, label: "Search" },
        { id: "Recent", icon: Clock, label: "History" },
        { id: "Profile", icon: User, label: "Profile" },
    ];

    if (isExpanded) return null;

    return (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[400] w-auto">
            <div className="island-nav rounded-[2rem] p-2 flex items-center gap-1 shadow-2xl ring-1 ring-white/10">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="nav-pill"
                                    className="absolute inset-0 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <div className="relative z-10">
                                <Icon
                                    size={20}
                                    className={`transition-all duration-300 ${isActive ? 'text-black scale-110' : 'text-white/40 group-hover:text-white/60'}`}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

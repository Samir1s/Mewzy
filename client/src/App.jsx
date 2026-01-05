import React, { useState } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import MainContent from './components/MainContent';
import Player from './components/Player';
import BottomNav from './components/BottomNav';
import HistoryView from './components/HistoryView';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Menu } from 'lucide-react';
import API_URL from './config';
import { fixUrl } from './utils/urlUtils';

// --- AUTH MODAL COMPONENT ---
const AuthModal = ({ onClose, onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [formData, setFormData] = useState({ username: "", email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        const endpoint = isRegistering ? "/api/register" : "/api/login";
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Something went wrong");

            if (isRegistering) {
                setIsRegistering(false);
                setError("Account created! Please log in.");
            } else {
                localStorage.setItem("token", data.token);
                localStorage.setItem("username", data.username);
                localStorage.setItem("profile_pic", data.profile_pic || "");
                onLogin(data);
                onClose();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#18181d] border border-white/10 p-8 rounded-3xl w-full max-w-md relative shadow-2xl"
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>
                <h2 className="text-2xl font-bold text-white mb-2">{isRegistering ? "Join Melo" : "Welcome Back"}</h2>
                <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                    {isRegistering && (
                        <input className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none" placeholder="Username" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                    )}
                    <input className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none" placeholder="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    <input className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none" placeholder="Password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                    <button disabled={loading} className="w-full bg-green-500 text-black font-bold py-3 rounded-xl hover:bg-green-400 transition">{loading ? "Loading..." : (isRegistering ? "Sign Up" : "Login")}</button>
                </form>
                {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                <p className="text-center text-xs text-gray-500 mt-4 cursor-pointer underline" onClick={() => setIsRegistering(!isRegistering)}>
                    {isRegistering ? "Already have an account? Login" : "Don't have an account? Sign Up"}
                </p>
            </motion.div>
        </div>
    );
};

// --- APP COMPONENT ---
export default function App() {
    const [activeTab, setActiveTab] = useState("Home");
    const [searchQuery, setSearchQuery] = useState("");
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [user, setUser] = useState(localStorage.getItem("username"));
    const [profilePic, setProfilePic] = useState(fixUrl(localStorage.getItem("profile_pic")));
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogin = (data) => {
        setUser(data.username);
        setProfilePic(data.profile_pic);
    };

    return (
        <PlayerProvider>
            <div className="fixed inset-0 z-0 bg-[#0f0f13]">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            <div className="flex flex-col md:flex-row h-full w-full text-white font-sans overflow-hidden relative z-10 premium-gradient-bg p-0 md:p-4 lg:p-6 gap-0 md:gap-4">

                {/* Mobile Header (Sleeker, less boxy) - HIDDEN ON HOME */}
                {activeTab !== 'Home' && (
                    <div className="md:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-[#0f0f13]/80 backdrop-blur-xl border-b border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                                    <span className="text-sm font-black text-green-500">M</span>
                                </div>
                                <span className="text-xl font-bold tracking-tight text-white">Mewsic</span>
                            </div>
                            {(activeTab !== 'Home' && activeTab !== 'Search') && (
                                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5 mx-auto absolute left-1/2 -translate-x-1/2">
                                    <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{activeTab}</h2>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Sidebar Drawer */}
                <AnimatePresence mode="wait">
                    {isSidebarOpen && (
                        <motion.div
                            initial={{ x: -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -300, opacity: 0 }}
                            className="fixed inset-0 z-[250] md:hidden"
                        >
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsSidebarOpen(false)} />
                            <div className="relative h-full w-72 flex-shrink-0">
                                <Sidebar
                                    activeTab={activeTab}
                                    setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }}
                                    onLoginClick={() => setShowAuthModal(true)}
                                    user={user}
                                    onSearch={(q) => { setSearchQuery(q); setActiveTab("Search"); setIsSidebarOpen(false); }}
                                    setIsMobileMenuOpen={setIsSidebarOpen}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Desktop Sidebar (Always visible on md+) */}
                <div className="hidden md:flex h-full w-64 flex-shrink-0">
                    <Sidebar
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        onLoginClick={() => setShowAuthModal(true)}
                        user={user}
                        onSearch={(q) => { setSearchQuery(q); setActiveTab("Search"); }}
                        setIsMobileMenuOpen={setIsSidebarOpen}
                    />
                </div>

                {/* Main Content Area */}
                {/* Main Content Area Wrapper */}
                <div className="flex-1 relative overflow-hidden flex flex-col h-full bg-[#121216]/40 backdrop-blur-sm rounded-none md:rounded-3xl border-0 md:border border-white/5">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`flex-1 overflow-y-auto overflow-x-hidden content-safe-area ${activeTab !== 'Home' ? 'pt-16' : ''} md:pt-0`}
                    >
                        {activeTab === "Recent" ? (
                            <HistoryView />
                        ) : (
                            <MainContent
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                user={user}
                                searchQuery={searchQuery}
                                onSearch={setSearchQuery}
                                onMenuClick={() => setIsSidebarOpen(true)}
                                profilePic={profilePic}
                                setProfilePic={setProfilePic}
                                onLoginClick={() => setShowAuthModal(true)}
                                onLogoutClick={() => {
                                    localStorage.removeItem("token");
                                    localStorage.removeItem("username");
                                    localStorage.removeItem("profile_pic");
                                    setUser(null);
                                    setProfilePic(null);
                                    window.location.reload();
                                }}
                            />
                        )}
                    </motion.div>

                    {/* --- FIXED BOTTOM BLUR --- */}
                    <div
                        className="absolute bottom-0 left-0 right-0 h-40 z-20 pointer-events-none"
                        style={{
                            background: 'linear-gradient(to top, #0f0f13 10%, transparent)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            maskImage: 'linear-gradient(to top, black 20%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to top, black 20%, transparent 100%)'
                        }}
                    />
                </div>

                {/* RightSidebar (Desktop Only) */}
                <div className="hidden lg:block w-80 h-full overflow-hidden rounded-3xl bg-[#121216]/50 border border-white/5">
                    <RightSidebar />
                </div>
            </div>

            <Player />
            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

            <AnimatePresence>
                {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onLogin={handleLogin} />}
            </AnimatePresence>
        </PlayerProvider>
    );
}
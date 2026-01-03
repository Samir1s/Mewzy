// Prioritize Environment Variable (Vite) -> Then Logic
const isProduction = window.location.hostname.includes('vercel.app');

const API_URL = isProduction
    ? "https://mewzy.onrender.com"
    : (import.meta.env.VITE_API_URL || "http://127.0.0.1:5000");

console.log("🔍 CONFIG:", { isProduction, Host: window.location.hostname, API_URL });

export default API_URL;
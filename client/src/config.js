// Better Environment Detection
const hostname = window.location.hostname;
const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

const API_URL = (isLocal && !hostname.includes('vercel.app'))
    ? (import.meta.env.VITE_API_URL || "http://127.0.0.1:5000")
    : "https://mewzy.onrender.com";

console.log("🔍 CONFIG:", { isLocal, Host: hostname, API_URL });

export default API_URL;
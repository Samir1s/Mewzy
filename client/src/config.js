// 🚨 NUCLEAR OPTION: Force Production URL
// Un-comment the logic below only after Production is verified fixed.
const API_URL = "https://mewzy.onrender.com";

// const hostname = window.location.hostname;
// const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
// const API_URL = (isLocal && !hostname.includes('vercel.app'))
//    ? (import.meta.env.VITE_API_URL || "http://127.0.0.1:5000")
//    : "https://mewzy.onrender.com";

console.log("🔍 NUCLEAR CONFIG:", { API_URL });

export default API_URL;
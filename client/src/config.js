const hostname = window.location.hostname;

// Check if we are running locally
const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

// Determine API URL based on environment
const API_URL = isLocal
    ? (import.meta.env.VITE_API_URL || "http://127.0.0.1:5000")
    : "https://mewzy.onrender.com";

console.error(`[CRITICAL CONFIG CHECK] Environment: ${isLocal ? 'Local' : 'Production'}, API_URL: ${API_URL}`);
if (!isLocal && API_URL.includes("localhost")) {
    console.error("!!! DANGER: Production build is using localhost API !!!");
}

export default API_URL;
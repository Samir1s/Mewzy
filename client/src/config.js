// Prioritize Environment Variable (Vite) -> Then Logic
const API_URL = import.meta.env.VITE_API_URL || (
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? "http://127.0.0.1:5000"
        : "https://mewzy.onrender.com"
);

export default API_URL;
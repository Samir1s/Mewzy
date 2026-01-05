import API_URL from '../config';

/**
 * Sanitizes and formats image URLs.
 * 1. Replaces hardcoded localhost/127.0.0.1 backends with the current API_URL.
 * 2. Prepends API_URL to relative paths (starting with /api).
 * 3. Returns original URL for external links (e.g. YouTube, Unsplash).
 */
export const getImageUrl = (url) => {
    if (!url) return null;

    // 0. Robustly determine API_URL locally to avoid any import/bundling weirdness
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    // If not local, FORCE the production URL. If local, use the imported one (or fallback).
    const EFFECTIVE_API_URL = isLocal ? API_URL : "https://mewzy.onrender.com";

    // 1. Check for hardcoded localhost backend URLs
    // Matches http://localhost, http://127.0.0.1, with optional ports
    const localhostRegex = /^(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?/;

    if (localhostRegex.test(url)) {
        // Strip the localhost part to get the relative path
        const relative = url.replace(localhostRegex, '');
        const finalUrl = `${EFFECTIVE_API_URL}${relative}`;
        // console.log(`[URL Fix] Converted ${url} -> ${finalUrl}`);
        return finalUrl;
    }

    // 2. Handle relative paths (e.g., /api/uploads/...)
    if (url.startsWith('/')) {
        return `${EFFECTIVE_API_URL}${url}`;
    }

    // 3. Return others as is (e.g., https://lh3.googleusercontent.com...)
    return url;
};

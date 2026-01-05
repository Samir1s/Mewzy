import API_URL from '../config';

/**
 * Sanitizes and formats image URLs.
 * 1. Replaces hardcoded localhost/127.0.0.1 backends with the current API_URL.
 * 2. Prepends API_URL to relative paths (starting with /api).
 * 3. Returns original URL for external links (e.g. YouTube, Unsplash).
 */
export const getImageUrl = (url) => {
    if (!url) return null;

    // 1. Check for hardcoded localhost backend URLs
    // Matches http://localhost, http://127.0.0.1, with optional ports
    const localhostRegex = /^(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?/;

    if (localhostRegex.test(url)) {
        // Strip the localhost part to get the relative path
        const relative = url.replace(localhostRegex, '');
        // Use the centralized API_URL logic
        const finalUrl = `${API_URL}${relative}`;
        // console.log(`[URL Fix] Converted ${url} -> ${finalUrl}`);
        return finalUrl;
    }

    // 2. Handle relative paths (e.g., /api/uploads/...)
    if (url.startsWith('/')) {
        return `${API_URL}${url}`;
    }

    // 3. Return others as is (e.g., https://lh3.googleusercontent.com..., or already correct https://mewzy.onrender.com...)
    return url;
};

// Alias for semantic clarity when fixing non-image URLs (like streams)
export const fixUrl = getImageUrl;

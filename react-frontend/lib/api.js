/**
 * API Configuration Utility
 * 
 * This utility ensures that API calls always use the correct base URL
 * whether in development or production.
 */

export function getApiBaseUrl() {
    // In production, always use the external API URL
    let API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/statcan';

    // For production builds, ensure we use the correct external API
    if (process.env.NODE_ENV === 'production') {
        API_BASE = 'https://grocery-index-api.nicklina.com/api/statcan';
    }

    // For client-side production, also check the hostname
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        API_BASE = 'https://grocery-index-api.nicklina.com/api/statcan';
    }

    // Ensure the URL has a protocol
    if (API_BASE && !API_BASE.startsWith('http://') && !API_BASE.startsWith('https://')) {
        API_BASE = `https://${API_BASE}`;
    }

    return API_BASE;
}

export function buildApiUrl(endpoint, params = {}) {
    const baseUrl = getApiBaseUrl();
    const url = new URL(endpoint, baseUrl);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
    });

    return url.toString();
} 
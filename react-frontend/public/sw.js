// Service Worker for Canadian Grocery Index
// Caches API responses and static assets for better performance

const CACHE_NAME = 'grocery-index-v2';
const API_CACHE_NAME = 'grocery-index-api-v2';

// URLs to cache immediately (excluding CSS and JS files to prevent styling issues)
const STATIC_ASSETS = [
    '/',
    '/next.svg',
    '/vercel.svg',
    '/file.svg',
    '/globe.svg',
    '/window.svg'
];

// File extensions that should NOT be cached to prevent styling issues
const NO_CACHE_EXTENSIONS = ['.css', '.js', '.mjs', '.ts', '.tsx', '.jsx'];

// API endpoints to cache - use the actual external API URL
const API_BASE_URL = 'https://grocery-index-api.nicklina.com/api/statcan';
const API_ENDPOINTS = [
    `${API_BASE_URL}/price-changes?geo=Canada&limit=3`,
    `${API_BASE_URL}/streaks?geo=Canada&limit=3`,
    `${API_BASE_URL}/all-price-changes?geo=Canada`
];

// Install event - cache static assets only
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Service Worker installed');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker installation failed:', error);
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle external API requests
    if (url.hostname === 'https://grocery-index-api.nicklina.com' && url.pathname.startsWith('/api/statcan/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Handle static assets
    if (request.method === 'GET') {
        event.respondWith(handleStaticRequest(request));
        return;
    }
});

// Handle API requests with caching
async function handleApiRequest(request) {
    const cache = await caches.open(API_CACHE_NAME);

    try {
        // Try to fetch from network first
        const networkResponse = await fetch(request);

        // If successful, cache the response
        if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            cache.put(request, responseClone);
        }

        return networkResponse;
    } catch (error) {
        // If network fails, try to serve from cache
        console.log('Network failed, trying cache for:', request.url);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            console.log('Serving from cache:', request.url);
            return cachedResponse;
        }

        // If no cached response, return a fallback
        return new Response(
            JSON.stringify({ error: 'Network error and no cached data available' }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Handle static asset requests
async function handleStaticRequest(request) {
    const url = new URL(request.url);

    // Check if this is a file that should not be cached (CSS, JS, etc.)
    const shouldNotCache = NO_CACHE_EXTENSIONS.some(ext =>
        url.pathname.toLowerCase().includes(ext)
    );

    // For CSS, JS, and other development files, always fetch from network
    if (shouldNotCache) {
        try {
            const networkResponse = await fetch(request);
            return networkResponse;
        } catch (error) {
            console.error('Failed to fetch uncached resource:', request.url, error);
            throw error;
        }
    }

    const cache = await caches.open(CACHE_NAME);

    // Try cache first for static assets (only for non-CSS/JS files)
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    // If not in cache, try network
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            cache.put(request, responseClone);
        }
        return networkResponse;
    } catch (error) {
        // Return a fallback for navigation requests
        if (request.mode === 'navigate') {
            return cache.match('/');
        }
        throw error;
    }
}

// Background sync for updating cache
self.addEventListener('sync', (event) => {
    if (event.tag === 'update-cache') {
        event.waitUntil(updateCache());
    }
});

// Update cache with fresh data
async function updateCache() {
    const cache = await caches.open(API_CACHE_NAME);

    for (const endpoint of API_ENDPOINTS) {
        try {
            const response = await fetch(endpoint);
            if (response.ok) {
                await cache.put(endpoint, response);
                console.log('Updated cache for:', endpoint);
            } else {
                console.log('Failed to update cache for:', endpoint, 'Status:', response.status);
            }
        } catch (error) {
            console.log('Failed to update cache for:', endpoint, error);
        }
    }
} 
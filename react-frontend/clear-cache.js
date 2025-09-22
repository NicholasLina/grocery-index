// Script to clear service worker cache
// Run this in the browser console if you need to force clear the cache

if ('serviceWorker' in navigator) {
    // Unregister the current service worker
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister();
            console.log('Service worker unregistered');
        }
    });

    // Clear all caches
    caches.keys().then(function (cacheNames) {
        return Promise.all(
            cacheNames.map(function (cacheName) {
                console.log('Deleting cache:', cacheName);
                return caches.delete(cacheName);
            })
        );
    }).then(function () {
        console.log('All caches cleared');
        // Reload the page to get fresh content
        window.location.reload();
    });
} else {
    console.log('Service workers not supported');
}

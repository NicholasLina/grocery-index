// Legacy helper kept for users that previously registered /sw.js manually.
// Run this in the browser console once, then refresh.

if ('serviceWorker' in navigator && window.caches) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log('Service worker unregistered');
    });
  });

  caches
    .keys()
    .then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
    .then(() => {
      console.log('All caches cleared');
      window.location.reload();
    });
}

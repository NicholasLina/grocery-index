"use client";
import { useEffect, useState } from 'react';

export default function ServiceWorkerRegistration() {
    const [isClient, setIsClient] = useState(false);

    // Mark as client-side after hydration
    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient) return;

        if ('serviceWorker' in navigator) {
            // Register service worker
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registered successfully:', registration);

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New service worker available
                                console.log('New service worker available');
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                });

            // Handle service worker updates
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('Service Worker controller changed');
                // Optionally reload the page to use the new service worker
                // window.location.reload();
            });
        }
    }, [isClient]);

    return null; // This component doesn't render anything
} 
"use client";
import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import PriceCard from '../components/PriceCard';
import StreakCard from '../components/StreakCard';
import {
    HomePagePlaceholder,
    PriceCardPlaceholder,
    StreakCardPlaceholder,
    TablePlaceholder
} from '../components/LoadingPlaceholder';
import ProgressiveLoading from '../components/ProgressiveLoading';
import { getApiBaseUrl } from '../lib/api';

// Cache duration in milliseconds (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Cache utility functions
const cacheUtils = {
    set: (key, data) => {
        if (typeof window !== 'undefined') {
            const cacheData = {
                data,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(cacheData));
        }
    },

    get: (key) => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(key);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    return data;
                }
                // Cache expired, remove it
                localStorage.removeItem(key);
            }
        }
        return null;
    },

    clear: (key) => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(key);
        }
    }
};



export default function HomePage({ initialData = null }) {
    const [gainers, setGainers] = useState(initialData?.gainers || []);
    const [losers, setLosers] = useState(initialData?.losers || []);
    const [streaks, setStreaks] = useState(initialData?.streaks || []);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState(initialData?.error || null);
    const [region, setRegion] = useState('Canada');
    const [allProductChanges, setAllProductChanges] = useState(initialData?.allProductChanges || []);
    const [allProductChangesLoading, setAllProductChangesLoading] = useState(!initialData);
    const [showContent, setShowContent] = useState(!!initialData);
    const [allProductChangesError, setAllProductChangesError] = useState(null);
    const [isClient, setIsClient] = useState(false);

    // Mark as client-side after hydration
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Load region from localStorage only on client
    useEffect(() => {
        if (!isClient) return;

        const stored = localStorage.getItem('region');
        if (stored) setRegion(stored);
    }, [isClient]);

    // Listen for region changes from header
    useEffect(() => {
        if (!isClient) return;

        function handleRegionChange(event) {
            setRegion(event.detail.region);
        }

        window.addEventListener('regionChanged', handleRegionChange);
        return () => window.removeEventListener('regionChanged', handleRegionChange);
    }, [isClient]);

    useEffect(() => {
        async function fetchData() {
            // Check cache first
            const cacheKey = `homepage_data_${region}`;
            const cachedData = cacheUtils.get(cacheKey);

            if (cachedData) {
                setGainers(cachedData.gainers || []);
                setLosers(cachedData.losers || []);
                setStreaks(cachedData.streaks || []);
                setAllProductChanges(cachedData.allProductChanges || []);
                setLoading(false);
                setAllProductChangesLoading(false);
                setError(null);
                setAllProductChangesError(null);
                setShowContent(true);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const API_BASE = getApiBaseUrl();

                const [priceRes, streakRes, allChangesRes] = await Promise.all([
                    fetch(`${API_BASE}/price-changes?geo=${encodeURIComponent(region)}&limit=3`),
                    fetch(`${API_BASE}/streaks?geo=${encodeURIComponent(region)}&limit=3`),
                    fetch(`${API_BASE}/all-price-changes?geo=${encodeURIComponent(region)}`)
                ]);

                if (!priceRes.ok || !streakRes.ok || !allChangesRes.ok) throw new Error('Failed to fetch data');

                const [priceData, streakData, allChangesData] = await Promise.all([
                    priceRes.json(),
                    streakRes.json(),
                    allChangesRes.json()
                ]);

                const data = {
                    gainers: priceData.gainers || [],
                    losers: priceData.losers || [],
                    streaks: streakData.streaks || [],
                    allProductChanges: allChangesData.products || []
                };

                // Cache the data
                cacheUtils.set(cacheKey, data);

                setGainers(data.gainers);
                setLosers(data.losers);
                setStreaks(data.streaks);
                setAllProductChanges(data.allProductChanges);
                setShowContent(true);
            } catch (err) {
                setError('Failed to load data. Please try again later.');
                setGainers([]);
                setLosers([]);
                setStreaks([]);
                setAllProductChanges([]);
            } finally {
                setLoading(false);
                setAllProductChangesLoading(false);
            }
        }

        // Only fetch if we don't have initial data or if region changed
        if (!initialData || region !== 'Canada') {
            fetchData();
        }
    }, [region, initialData]);

    // Don't render until client-side hydration is complete
    if (!isClient) {
        return (
            <main className="max-w-4xl mx-auto p-4 bg-gray-50 min-h-[80vh] rounded-lg shadow-md">
                <LoadingSpinner />
            </main>
        );
    }

    return (
        <main className="max-w-4xl mx-auto p-4 bg-gray-50 min-h-[80vh] rounded-lg shadow-md">
            <h2 className="text-black mb-10">Welcome to the <b>Canadian Grocery Index!</b> This tool uses data from <a href="https://www.statcan.gc.ca/en/topics-start/food-price" className="text-blue-800 underline hover:bg-amber-200">Statistics Canada</a> to help you understand and visualise changes in grocery prices in order to make informed decisions on your food purchases.</h2>
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
            <ProgressiveLoading
                gainers={gainers}
                losers={losers}
                streaks={streaks}
                allProductChanges={allProductChanges}
                loading={loading || !showContent}
                allProductChangesLoading={allProductChangesLoading}
                error={allProductChangesError}
            />
        </main>
    );
} 
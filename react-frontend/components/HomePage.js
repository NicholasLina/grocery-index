"use client";
import React, { useState, useEffect } from 'react';
import ProgressiveLoading from '../components/ProgressiveLoading';
import { getApiBaseUrl } from '../lib/api';
import { DEFAULT_REGION } from '../lib/constants';
import { useRegion } from './RegionProvider';

export default function HomePage({ initialData = null }) {
    const { region } = useRegion();
    const [gainers, setGainers] = useState(initialData?.gainers || []);
    const [losers, setLosers] = useState(initialData?.losers || []);
    const [streaks, setStreaks] = useState(initialData?.streaks || []);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState(initialData?.error || null);
    const [allProductChanges, setAllProductChanges] = useState(initialData?.allProductChanges || []);
    const [allProductChangesLoading, setAllProductChangesLoading] = useState(!initialData);
    const [showContent, setShowContent] = useState(!!initialData);
    const [allProductChangesError, setAllProductChangesError] = useState(null);

    useEffect(() => {
        async function fetchData() {
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
        if (!initialData || region !== DEFAULT_REGION) {
            fetchData();
        }
    }, [region, initialData]);

    return (
        <main className="max-w-4xl mx-auto p-4 bg-gray-50 min-h-[80vh] rounded-lg shadow-md">
            <h2 className="text-black mb-10">Welcome to the <b>Canadian Grocery Index!</b> This tool uses data from <a href="https://www.statcan.gc.ca/en/topics-start/food-price" className="text-gray-800 underline hover:bg-amber-200">Statistics Canada</a> to help you understand and visualise changes in grocery prices in order to make informed decisions on your food purchases.</h2>
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
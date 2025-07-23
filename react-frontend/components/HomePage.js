"use client";
import React, { useEffect, useState } from 'react';
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

function SortableProductTable({ data, loading, error }) {
    const [sortKey, setSortKey] = React.useState('product');
    const [sortOrder, setSortOrder] = React.useState('asc');

    const columns = [
        { key: 'product', label: 'Product' },
        { key: 'currentPrice', label: 'Current Price ($)' },
        { key: 'change', label: 'MoM Change ($)' },
        { key: 'changePercent', label: 'MoM Change (%)' },
        { key: 'yearAgoChange', label: 'YoY Change ($)' },
        { key: 'yearAgoPercent', label: 'YoY Change (%)' },
    ];

    const sortedData = React.useMemo(() => {
        if (!Array.isArray(data)) return [];
        const sorted = [...data].sort((a, b) => {
            let aVal = a[sortKey];
            let bVal = b[sortKey];
            // For product, sort alphabetically
            if (sortKey === 'product') {
                aVal = aVal || '';
                bVal = bVal || '';
                if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            } else {
                // For numbers, handle nulls and sort numerically
                aVal = aVal == null ? -Infinity : aVal;
                bVal = bVal == null ? -Infinity : bVal;
                return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
            }
        });
        return sorted;
    }, [data, sortKey, sortOrder]);

    function handleSort(key) {
        if (sortKey === key) {
            setSortOrder(order => (order === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    }

    if (loading) return <TablePlaceholder />;
    if (error) return <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>;
    if (!data || data.length === 0) return <TablePlaceholder />;

    return (
        <div className="overflow-x-auto mt-12">
            <h2 className="text-xl font-semibold mb-2 text-blue-800">All Products: Monthly & Yearly Price Changes</h2>
            <table className="min-w-full bg-white rounded shadow overflow-hidden">
                <thead>
                    <tr className="bg-blue-100">
                        {columns.map(col => (
                            <th
                                key={col.key}
                                className="px-4 py-2 text-left text-gray-900 cursor-pointer select-none hover:bg-blue-200"
                                onClick={() => handleSort(col.key)}
                            >
                                {col.label}
                                {sortKey === col.key && (
                                    <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, idx) => (
                        <tr key={row.product + '-' + idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="px-4 py-2 font-mono text-gray-900">{row.product}</td>
                            <td className="px-4 py-2 text-gray-900">{row.currentPrice != null ? `$${row.currentPrice.toFixed(2)}` : 'N/A'}</td>
                            <td className={row.change > 0 ? 'px-4 py-2 text-red-700' : 'px-4 py-2 text-green-700'}>{row.change != null ? (row.change > 0 ? '+' : '') + row.change.toFixed(2) : 'N/A'}</td>
                            <td className={row.changePercent > 0 ? 'px-4 py-2 text-red-700' : 'px-4 py-2 text-green-700'}>{row.changePercent != null ? (row.changePercent > 0 ? '+' : '') + row.changePercent.toFixed(2) + '%' : 'N/A'}</td>
                            <td className={row.yearAgoChange > 0 ? 'px-4 py-2 text-red-700' : 'px-4 py-2 text-green-700'}>{row.yearAgoChange != null ? (row.yearAgoChange > 0 ? '+' : '') + row.yearAgoChange.toFixed(2) : 'N/A'}</td>
                            <td className={row.yearAgoPercent > 0 ? 'px-4 py-2 text-red-700' : 'px-4 py-2 text-green-700'}>{row.yearAgoPercent != null ? (row.yearAgoPercent > 0 ? '+' : '') + row.yearAgoPercent.toFixed(2) + '%' : 'N/A'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('region');
            if (stored) setRegion(stored);
        }
    }, []);

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
                const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/statcan';
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
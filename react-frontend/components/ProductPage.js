"use client";
import React, { useState, useEffect, useMemo } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import PriceChart from '../components/PriceChart';
import { useParams } from 'next/navigation';
import { getApiBaseUrl } from '../lib/api';
import { getProductFromSlug, createSlugMapping } from '../lib/slugUtils';
import { FALLBACK_SLUG_MAPPING } from '../lib/products';
import { DEFAULT_REGION } from '../lib/constants';
import { useRegion } from './RegionProvider';

function subtractMonths(ym, n) {
    if (!ym || typeof ym !== 'string') {
        return '';
    }

    const parts = ym.split('-');
    if (parts.length !== 2) {
        return '';
    }

    const [year, month] = parts.map(Number);
    if (isNaN(year) || isNaN(month)) {
        return '';
    }

    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - n);
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${y}-${m}`;
}

export default function ProductPage({ initialData = [], initialProductName = '' }) {
    const params = useParams();
    const slug = params?.slug;
    const { region } = useRegion();

    // Get product name from slug
    const [productName, setProductName] = useState(initialProductName);
    // Split the product name by the first comma
    const [mainTitle, ...subtitleParts] = (productName || '').split(/,(.+)/); // split only on the first comma
    const subtitle = subtitleParts.length > 0 ? subtitleParts[0].trim() : null;

    const [history, setHistory] = useState(initialData);
    const [loading, setLoading] = useState(initialData.length === 0);
    const [error, setError] = useState(null);
    // Date range state
    const [rangePreset, setRangePreset] = useState('all'); // '1y', '3y', '5y', 'all'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // --- Extracted summary values for top display ---
    const values = history.map(row => Number(row.VALUE)).filter(v => !isNaN(v));
    const dates = history.map(row => row.REF_DATE).filter(date => date); // Filter out undefined/null dates
    // Find min/max date in data for default range
    const minDate = dates.length ? dates[0] : '';
    const maxDate = dates.length ? dates[dates.length - 1] : '';

    // Set default range when data loads or preset changes
    useEffect(() => {
        if (!dates.length || !minDate || !maxDate) {
            return;
        }
        let newStart = minDate;
        let newEnd = maxDate;

        if (rangePreset === '1y') {
            newStart = subtractMonths(maxDate, 12);
            if (newStart < minDate) newStart = minDate;
        } else if (rangePreset === '3y') {
            newStart = subtractMonths(maxDate, 36);
            if (newStart < minDate) newStart = minDate;
        } else if (rangePreset === '5y') {
            newStart = subtractMonths(maxDate, 60);
            if (newStart < minDate) newStart = minDate;
        } else if (rangePreset === 'all') {
            newStart = minDate;
        }
        setStartDate(newStart);
        setEndDate(newEnd);
    }, [history, rangePreset, dates.length, maxDate, minDate]);

    // Filtered history for chart
    const filteredHistory = useMemo(() => {
        if (!startDate || !endDate) return history;

        const filtered = history.filter(row => {
            // Skip rows without REF_DATE
            if (!row.REF_DATE) return false;
            return row.REF_DATE >= startDate && row.REF_DATE <= endDate;
        });

        return filtered;
    }, [history, startDate, endDate]);
    const last = values.length ? values[values.length - 1] : null;
    const lastDate = dates.length ? dates[dates.length - 1] : null;
    const first = values.length ? values[0] : null;
    const percentChange = (first && last && first !== 0) ? ((last - first) / first) * 100 : null;

    // --- End extracted summary values ---

    // Resolve product name from slug
    useEffect(() => {
        if (!slug) return;

        // First try fallback mapping
        let resolvedProduct = getProductFromSlug(slug, FALLBACK_SLUG_MAPPING);

        if (resolvedProduct) {
            setProductName(resolvedProduct);
            return;
        }

        // If not found in fallback, try to fetch from API
        async function fetchProductMapping() {
            try {
                const API_BASE = getApiBaseUrl();
                const res = await fetch(`${API_BASE}/products`);
                if (res.ok) {
                    const data = await res.json();
                    const products = data.products || [];

                    const newSlugMapping = createSlugMapping(products);
                    const product = getProductFromSlug(slug, newSlugMapping);
                    if (product) {
                        setProductName(product);
                    }
                }
            } catch (_error) {
                // Keep fallback behavior for unknown products.
            }
        }

        fetchProductMapping();
    }, [slug]);

    useEffect(() => {
        async function fetchData() {
            if (!productName) return;

            setLoading(true);
            setError(null);
            try {
                const API_BASE = getApiBaseUrl();
                const url = `${API_BASE}?geo=${encodeURIComponent(region)}&product=${encodeURIComponent(productName)}`;

                const res = await fetch(url);
                if (!res.ok) throw new Error(`Failed to fetch data: ${res.status} ${res.statusText}`);
                const data = await res.json();

                setHistory(data || []);
            } catch (err) {
                setError(`Failed to load product data: ${err.message}`);
                setHistory([]);
            } finally {
                setLoading(false);
            }
        }
        // Only fetch if we don't have initial data or if region changed from default.
        if (productName && productName.trim() && (initialData.length === 0 || region !== DEFAULT_REGION)) {
            fetchData();
        }
    }, [productName, region, initialData.length]);

    // Show loading state while product name is being resolved
    if (!productName) {
        return (
            <main className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-[80vh] rounded-lg shadow-md">
                <div className="text-center py-8">
                    <LoadingSpinner />
                    <div className="mt-4 text-gray-600">Loading product information...</div>
                </div>
            </main>
        );
    }

    return (
        <main className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-[80vh] rounded-lg shadow-md">
            {/* Top section: Product name and summary */}
            <div className="flex flex-col sm:flex-row sm:justify-between text-center sm:text-left mb-2 gap-2">
                <div>
                    <h1 className="text-2xl font-bold text-blue-900">{mainTitle || 'Loading...'}</h1>
                    {subtitle && <h2 className="text-md font-medium text-blue-700">{subtitle}</h2>}
                </div>
                {/* Most Recent Price and % Change */}
                <div className="flex flex-col gap-6 items-center justify-end">
                    <div className="text-center sm:text-right">
                        <div className="text-gray-500 text-sm">Most Recent Price{lastDate ? ` (${lastDate})` : ''}</div>
                        <div className="font-bold text-blue-900 text-4xl">{last !== null ? `$${last.toFixed(2)}` : 'N/A'}</div>
                        <div className={percentChange !== null ? (percentChange >= 0 ? 'text-red-700 font-bold text-lg' : 'text-green-700 font-bold text-lg') : ''}>
                            {percentChange !== null ? `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%` : 'N/A'}
                        </div>
                    </div>
                    <div className="text-right">

                    </div>
                </div>
            </div>
            {/* Error message */}
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    <div className="font-semibold mb-2">Error loading product data</div>
                    <div className="text-sm">{error}</div>
                    {history.length === 0 && productName && (
                        <div className="mt-2 text-sm">
                            <div>Product: <code className="bg-gray-200 px-1 rounded">{productName}</code></div>
                            <div>Region: <code className="bg-gray-200 px-1 rounded">{region}</code></div>
                        </div>
                    )}
                </div>
            )}
            {loading ? <LoadingSpinner /> : (
                <>
                    {/* Summary Card */}
                    {history.length > 0 && (() => {
                        const high = values.length ? Math.max(...values) : null;
                        const low = values.length ? Math.min(...values) : null;
                        const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
                        const firstDate = dates.length ? dates[0] : null;
                        // Removed last, lastDate, percentChange from here
                        return (
                            <section className="mb-8">
                                <h2 className="text-lg font-semibold mb-2 text-blue-800">Key Price Indicators</h2>
                                <div className="grid grid-cols-2 gap-4 bg-white rounded shadow p-4 mb-4">
                                    <div>
                                        <div className="text-gray-500 text-sm">Historical High</div>
                                        <div className="font-bold text-blue-900">{high !== null ? `$${high.toFixed(2)}` : 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 text-sm">Historical Low</div>
                                        <div className="font-bold text-blue-900">{low !== null ? `$${low.toFixed(2)}` : 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 text-sm">Average Price</div>
                                        <div className="font-bold text-blue-900">{avg !== null ? `$${avg.toFixed(2)}` : 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 text-sm">First Recorded Price{firstDate ? ` (${firstDate})` : ''}</div>
                                        <div className="font-bold text-blue-900">{first !== null ? `$${first.toFixed(2)}` : 'N/A'}</div>
                                    </div>
                                </div>
                            </section>
                        );
                    })()}
                    {/* Price History Section with Preset Range Buttons */}
                    <section className="mb-8">
                        <h2 className="text-lg font-semibold mb-2 text-blue-800">Price History</h2>
                        {/* Preset Range Buttons */}
                        <div className="flex gap-2 mb-4">
                            <button
                                type="button"
                                className={`px-3 py-1 rounded border text-sm font-medium ${rangePreset === '1y' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'}`}
                                onClick={() => setRangePreset('1y')}
                            >
                                1 Year
                            </button>
                            <button
                                type="button"
                                className={`px-3 py-1 rounded border text-sm font-medium ${rangePreset === '3y' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'}`}
                                onClick={() => setRangePreset('3y')}
                            >
                                3 Years
                            </button>
                            <button
                                type="button"
                                className={`px-3 py-1 rounded border text-sm font-medium ${rangePreset === '5y' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'}`}
                                onClick={() => setRangePreset('5y')}
                            >
                                5 Years
                            </button>
                            <button
                                type="button"
                                className={`px-3 py-1 rounded border text-sm font-medium ${rangePreset === 'all' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'}`}
                                onClick={() => setRangePreset('all')}
                            >
                                All
                            </button>
                        </div>
                        <PriceChart data={filteredHistory} />
                    </section>
                    {/* Paginated Table Section */}
                    <section className="mb-8">
                        <h2 className="text-lg font-semibold mb-2 text-blue-800">Historical Data Table</h2>
                        {history.length === 0 ? (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                                <div className="text-yellow-800 font-semibold mb-2">No data found</div>
                                <div className="text-sm text-yellow-700">
                                    <div>Product: <code className="bg-yellow-100 px-1 rounded">{productName}</code></div>
                                    <div>Region: <code className="bg-yellow-100 px-1 rounded">{region}</code></div>
                                    <div className="mt-2">This could mean:</div>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        <li>The product name doesn&apos;t match the database exactly</li>
                                        <li>No data is available for this product/region combination</li>
                                        <li>There&apos;s an issue with the API connection</li>
                                    </ul>
                                </div>
                            </div>
                        ) : dates.length === 0 ? (
                            <div className="p-4 bg-orange-50 border border-orange-200 rounded">
                                <div className="text-orange-800 font-semibold mb-2">Data found but missing date information</div>
                                <div className="text-sm text-orange-700">
                                    <div>Product: <code className="bg-orange-100 px-1 rounded">{productName}</code></div>
                                    <div>Region: <code className="bg-orange-100 px-1 rounded">{region}</code></div>
                                    <div>Records found: <code className="bg-orange-100 px-1 rounded">{history.length}</code></div>
                                    <div className="mt-2">The data exists but is missing date fields. This is likely a database issue in production.</div>
                                </div>
                            </div>
                        ) : (
                            <PaginatedHistoryTable history={history} />
                        )}
                    </section>
                </>
            )}
        </main>
    );
}

function PaginatedHistoryTable({ history }) {
    const PAGE_SIZE = 12;
    const [page, setPage] = useState(1);

    // Sort history from most to least recent
    const sorted = useMemo(() => {
        return [...history].sort((a, b) => (b.REF_DATE > a.REF_DATE ? 1 : b.REF_DATE < a.REF_DATE ? -1 : 0));
    }, [history]);

    useEffect(() => {
        setPage(1);
    }, [sorted]);

    const displayed = sorted.slice(0, page * PAGE_SIZE);
    const hasMore = displayed.length < sorted.length;

    const handleLoadMore = () => {
        setPage((prev) => prev + 1);
    };

    return (
        <div>
            <table className="min-w-full bg-white rounded shadow overflow-hidden">
                <thead>
                    <tr className="bg-blue-100">
                        <th className="px-4 py-2 text-left text-gray-900">Date</th>
                        <th className="px-4 py-2 text-left text-gray-900">Price</th>
                    </tr>
                </thead>
                <tbody>
                    {displayed.map((row, idx) => (
                        <tr key={row.REF_DATE + '-' + idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="px-4 py-2 font-mono text-gray-900">{row.REF_DATE}</td>
                            <td className="px-4 py-2 text-gray-900">${Number(row.VALUE).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {hasMore && (
                <div className="flex justify-center mt-4">
                    <button
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        onClick={handleLoadMore}
                    >
                        Load More
                    </button>
                </div>
            )}
        </div>
    );
} 
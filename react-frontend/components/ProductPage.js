"use client";
import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import PriceChart from '../components/PriceChart';
import { useParams } from 'next/navigation';

export default function ProductPage() {
    const params = useParams();
    const slug = params?.slug;
    const decodedSlug = slug ? decodeURIComponent(slug) : '';
    // Split the decoded slug by the first comma
    const [mainTitle, ...subtitleParts] = decodedSlug.split(/,(.+)/); // split only on the first comma
    const subtitle = subtitleParts.length > 0 ? subtitleParts[0].trim() : null;
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [region, setRegion] = useState('Canada');
    // Date range state
    const [rangePreset, setRangePreset] = useState('all'); // '1y', '3y', '5y', 'all'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // --- Extracted summary values for top display ---
    const values = history.map(row => Number(row.VALUE)).filter(v => !isNaN(v));
    const dates = history.map(row => row.REF_DATE);
    // Find min/max date in data for default range
    const minDate = dates.length ? dates[0] : '';
    const maxDate = dates.length ? dates[dates.length - 1] : '';

    // Helper to subtract months from YYYY-MM string
    function subtractMonths(ym, n) {
        const [year, month] = ym.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        date.setMonth(date.getMonth() - n);
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${y}-${m}`;
    }

    // Set default range when data loads or preset changes
    React.useEffect(() => {
        if (!dates.length) return;
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
    const filteredHistory = React.useMemo(() => {
        if (!startDate || !endDate) return history;
        return history.filter(row => row.REF_DATE >= startDate && row.REF_DATE <= endDate);
    }, [history, startDate, endDate]);
    const last = values.length ? values[values.length - 1] : null;
    const lastDate = dates.length ? dates[dates.length - 1] : null;
    const first = values.length ? values[0] : null;
    const percentChange = (first && last) ? ((last - first) / first) * 100 : null;
    // --- End extracted summary values ---

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('region');
            if (stored) setRegion(stored);
        }
    }, []);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError(null);
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/statcan';
                const res = await fetch(`${API_BASE}?geo=${encodeURIComponent(region)}&product=${encodeURIComponent(decodedSlug)}`);
                if (!res.ok) throw new Error('Failed to fetch data');
                const data = await res.json();
                setHistory(data || []);
            } catch (err) {
                setError('Failed to load product data. Please try again later.');
                setHistory([]);
            } finally {
                setLoading(false);
            }
        }
        if (slug) fetchData();
    }, [slug, region, decodedSlug]);

    return (
        <main className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-[80vh] rounded-lg shadow-md">
            {/* Top section: Product name and summary */}
            <div className="flex flex-col sm:flex-row sm:justify-between text-center sm:text-left mb-2 gap-2">
                <div>
                    <h1 className="text-2xl font-bold text-blue-900">{mainTitle}</h1>
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
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
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
                        <PaginatedHistoryTable history={history} />
                    </section>
                </>
            )}
        </main>
    );
}

function PaginatedHistoryTable({ history }) {
    const PAGE_SIZE = 12;
    const [page, setPage] = React.useState(1);
    const [displayed, setDisplayed] = React.useState([]);
    const [loading, setLoading] = React.useState(false);

    // Sort history from most to least recent
    const sorted = React.useMemo(() => {
        return [...history].sort((a, b) => (b.REF_DATE > a.REF_DATE ? 1 : b.REF_DATE < a.REF_DATE ? -1 : 0));
    }, [history]);

    React.useEffect(() => {
        setDisplayed(sorted.slice(0, PAGE_SIZE));
        setPage(1);
    }, [sorted]);

    const handleLoadMore = () => {
        setLoading(true);
        setTimeout(() => { // Simulate lazy loading
            setDisplayed(prev => sorted.slice(0, (page + 1) * PAGE_SIZE));
            setPage(prev => prev + 1);
            setLoading(false);
        }, 400);
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
            {displayed.length < sorted.length && (
                <div className="flex justify-center mt-4">
                    <button
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        onClick={handleLoadMore}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Load More'}
                    </button>
                </div>
            )}
        </div>
    );
} 
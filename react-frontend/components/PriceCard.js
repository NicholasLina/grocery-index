"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import PriceChart from './PriceChart';
import { ChartPlaceholder } from './LoadingPlaceholder';
import { getApiBaseUrl } from '../lib/api';
import { productToSlug } from '../lib/slugUtils';

export default function PriceCard({ product, changePercent, currentPrice, className = '' }) {
    const router = useRouter();
    const pathname = usePathname();
    const slug = productToSlug(product);
    const isOnProductPage = pathname === `/product/${slug}`;
    const [history, setHistory] = useState([]);
    const [region, setRegion] = useState('Canada');
    const [loading, setLoading] = useState(false);

    // Split product into main title and subtitle
    const [mainTitle, ...subtitleParts] = product.split(/,(.+)/); // split only on the first comma
    const subtitle = subtitleParts.length > 0 ? subtitleParts[0].trim() : null;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('region');
            if (stored) setRegion(stored);
        }
    }, []);

    // Listen for region changes from header
    useEffect(() => {
        function handleRegionChange(event) {
            setRegion(event.detail.region);
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('regionChanged', handleRegionChange);
            return () => window.removeEventListener('regionChanged', handleRegionChange);
        }
    }, []);

    useEffect(() => {
        async function fetchHistory() {
            setLoading(true);
            try {
                const API_BASE = getApiBaseUrl();

                const res = await fetch(`${API_BASE}?geo=${encodeURIComponent(region)}&product=${encodeURIComponent(product)}`);
                if (!res.ok) throw new Error('Failed to fetch history');
                const data = await res.json();
                setHistory(data || []);
            } catch {
                setHistory([]);
            } finally {
                setLoading(false);
            }
        }
        if (region && product) fetchHistory();
    }, [region, product]);

    function handleClick(e) {
        if (isOnProductPage) {
            e.preventDefault();
        }
    }

    const lineColor = changePercent > 0 ? '#dc2626' : '#16a34a';

    return (
        <a
            href={`/product/${slug}`}
            className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-transform hover:scale-105 hover:shadow-lg block no-underline ${className} ${isOnProductPage ? 'ring-2 ring-gray-500' : ''}`}
            onClick={handleClick}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{mainTitle}</h3>
                    {subtitle && <p className="text-gray-600 text-sm">{subtitle}</p>}
                </div>
                <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-gray-900">${currentPrice}</div>
                    <div className={`text-sm font-medium ${changePercent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
                    </div>
                </div>
            </div>

            <div className="h-24">
                {loading ? (
                    <ChartPlaceholder />
                ) : history.length > 0 ? (
                    <PriceChart
                        data={history.slice(-12)}
                        showAxes={false}
                        showGrid={false}
                        interactive={false}
                        height="96px"
                        lineColor={lineColor}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        No data available
                    </div>
                )}
            </div>
        </a>
    );
} 
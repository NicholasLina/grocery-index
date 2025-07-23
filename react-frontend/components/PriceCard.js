"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import PriceChart from './PriceChart';
import { ChartPlaceholder } from './LoadingPlaceholder';

export default function PriceCard({ product, changePercent, currentPrice, className = '' }) {
    const router = useRouter();
    const pathname = usePathname();
    const slug = encodeURIComponent(product);
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

    useEffect(() => {
        async function fetchHistory() {
            setLoading(true);
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/statcan';
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

    function handleClick() {
        if (!isOnProductPage) {
            router.push(`/product/${slug}`);
        }
    }

    const lineColor = changePercent > 0 ? '#dc2626' : '#16a34a';

    return (
        <div
            className={`bg-white rounded shadow p-4 flex flex-col items-center cursor-pointer hover:bg-blue-50 hover:shadow-lg transition-all duration-200 ${className}`}
            onClick={handleClick}
            tabIndex={0}
            role="button"
            aria-label={`View details for ${product}`}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
        >
            <div className="font-bold text-lg text-blue-900 leading-4">{mainTitle}</div>
            {subtitle && <div className="text-sm font-medium text-blue-700">{subtitle}</div>}
            <div className="text-gray-500 font-bold text-2xl">${currentPrice?.toFixed(2)}</div>
            <p className={changePercent > 0 ? "text-red-600 text-sm leading-3" : "text-green-600 text-sm leading-3"}>{changePercent > 0 ? '+' : ''}{changePercent?.toFixed(2)}%</p>
            <div className="w-full mt-2">
                {loading ? <ChartPlaceholder height="96px" /> : (
                    <PriceChart data={history.slice(-12)} interactive={false} showGrid={false} showAxes={false} height="96px" lineColor={lineColor} />
                )}
            </div>
        </div>
    );
} 
"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import { productToSlug } from '../lib/slugUtils';
import PriceChart from './PriceChart';

export default function PriceCard({ product, changePercent, currentPrice, trendData = [], className = '' }) {
    const pathname = usePathname();
    const slug = productToSlug(product);
    const isOnProductPage = pathname === `/product/${slug}`;

    // Split product into main title and subtitle
    const [mainTitle, ...subtitleParts] = product.split(/,(.+)/); // split only on the first comma
    const subtitle = subtitleParts.length > 0 ? subtitleParts[0].trim() : null;

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

            <PriceChart
                data={trendData}
                showAxes={false}
                showGrid={false}
                interactive={false}
                height="96px"
                lineColor={lineColor}
            />
        </a>
    );
} 
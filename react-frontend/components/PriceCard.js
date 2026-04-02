"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import { productToSlug } from '../lib/slugUtils';

export default function PriceCard({ product, changePercent, currentPrice, className = '' }) {
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

            <div className="h-24 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center">
                <div className="text-center text-gray-500 text-sm">
                    Open product for full trend
                </div>
            </div>
        </a>
    );
} 
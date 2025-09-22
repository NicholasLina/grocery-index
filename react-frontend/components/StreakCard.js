import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import PriceChart from './PriceChart';
import { ChartPlaceholder } from './LoadingPlaceholder';
import { productToSlug } from '../lib/slugUtils';

export default function StreakCard({ product, streakLength, streakType, className = '', data }) {
    // Split product into main title and subtitle
    const [mainTitle, ...subtitleParts] = product.split(/,(.+)/); // split only on the first comma
    const subtitle = subtitleParts.length > 0 ? subtitleParts[0].trim() : null;

    const lineColor = streakType === 'increase' ? '#dc2626' : '#16a34a';
    const router = useRouter();
    const slug = productToSlug(product);
    const pathname = usePathname();
    const isOnProductPage = pathname === `/product/${slug}`;

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
                    <div className={`text-lg font-bold ${streakType === 'increase' ? 'text-red-600' : 'text-green-600'}`}>
                        {streakLength} {streakLength === 1 ? 'month' : 'months'}
                    </div>
                    <div className={`text-sm font-medium ${streakType === 'increase' ? 'text-red-600' : 'text-green-600'}`}>
                        {streakType === 'increase' ? 'Increasing' : 'Decreasing'}
                    </div>
                </div>
            </div>

            <div className="h-24">
                {data && data.length > 0 ? (
                    <PriceChart
                        data={data.slice(-12)}
                        showAxes={false}
                        showGrid={false}
                        interactive={false}
                        height="96px"
                        lineColor={lineColor}
                    />
                ) : (
                    <ChartPlaceholder />
                )}
            </div>
        </a>
    );
} 
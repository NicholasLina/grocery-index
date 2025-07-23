import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import PriceChart from './PriceChart';
import { ChartPlaceholder } from './LoadingPlaceholder';

export default function StreakCard({ product, streakLength, streakType, className = '', data }) {
    // Split product into main title and subtitle
    const [mainTitle, ...subtitleParts] = product.split(/,(.+)/); // split only on the first comma
    const subtitle = subtitleParts.length > 0 ? subtitleParts[0].trim() : null;

    const lineColor = streakType === 'increase' ? '#dc2626' : '#16a34a';
    const router = useRouter();
    const slug = encodeURIComponent(product);
    const pathname = usePathname();
    const isOnProductPage = pathname === `/product/${slug}`;

    function handleClick() {
        if (!isOnProductPage) {
            router.push(`/product/${slug}`);
        }
    }

    return (
        <div
            className={`bg-white rounded shadow p-4 flex flex-col items-center cursor-pointer hover:bg-blue-50 hover:shadow-lg transition-all duration-200 ${className}`}
            onClick={handleClick}
            tabIndex={0}
            role="button"
            aria-label={`View details for ${product}`}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
        >
            <div className="font-bold text-lg text-blue-900">{mainTitle}</div>
            {subtitle && <div className="text-md font-medium text-blue-700">{subtitle}</div>}
            <div className={streakType === 'increase' ? 'text-red-600' : 'text-green-600'}>
                {streakType === 'increase' ? '\u25b2' : '\u25bc'} {streakLength} month streak
            </div>
            <div className="w-full mt-2">
                {Array.isArray(data) && data.length > 1 ? (
                    <PriceChart data={data} interactive={false} showGrid={false} showAxes={false} height="96px" lineColor={lineColor} />
                ) : (
                    <ChartPlaceholder height="96px" />
                )}
            </div>
        </div>
    );
} 
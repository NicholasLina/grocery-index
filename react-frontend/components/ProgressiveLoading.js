"use client";
import React, { useState, useMemo } from 'react';
import PriceCard from './PriceCard';
import StreakCard from './StreakCard';
import {
    PriceCardPlaceholder,
    StreakCardPlaceholder,
    TablePlaceholder
} from './LoadingPlaceholder';

function SortableProductTable({ data, loading, error }) {
    const [sortKey, setSortKey] = useState('product');
    const [sortOrder, setSortOrder] = useState('asc');

    const columns = [
        { key: 'product', label: 'Product' },
        { key: 'currentPrice', label: 'Current Price ($)' },
        { key: 'change', label: 'MoM Change ($)' },
        { key: 'changePercent', label: 'MoM Change (%)' },
        { key: 'yearAgoChange', label: 'YoY Change ($)' },
        { key: 'yearAgoPercent', label: 'YoY Change (%)' },
    ];

    const sortedData = useMemo(() => {
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

// Progressive loading component that shows content as it becomes available
export const ProgressiveLoading = ({
    gainers = [],
    losers = [],
    streaks = [],
    allProductChanges = [],
    loading = true,
    allProductChangesLoading = true,
    error = null
}) => {
    // Show full placeholder if everything is loading or if we have no data at all
    if (loading || (gainers.length === 0 && losers.length === 0 && streaks.length === 0 && allProductChanges.length === 0)) {
        return (
            <div className="space-y-8">
                {/* Biggest Price Increases section */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-2 text-blue-800">Biggest Price Increases</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <PriceCardPlaceholder key={index} />
                        ))}
                    </div>
                </section>

                {/* Biggest Discounts section */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-2 text-blue-800">Biggest Discounts</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <PriceCardPlaceholder key={index} />
                        ))}
                    </div>
                </section>

                {/* Longest Price Streaks section */}
                <section>
                    <h2 className="text-xl font-semibold mb-2 text-blue-800">Longest Price Streaks</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <StreakCardPlaceholder key={index} />
                        ))}
                    </div>
                </section>

                {/* Table placeholder */}
                <TablePlaceholder />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Biggest Price Increases section */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-2 text-blue-800">Biggest Price Increases</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {gainers.length > 0 ? (
                        gainers.map((item) => (
                            <PriceCard key={item.product} {...item} className="hover:shadow-lg transition-shadow duration-200" />
                        ))
                    ) : (
                        Array.from({ length: 3 }).map((_, index) => (
                            <PriceCardPlaceholder key={index} />
                        ))
                    )}
                </div>
            </section>

            {/* Biggest Discounts section */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-2 text-blue-800">Biggest Discounts</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {losers.length > 0 ? (
                        losers.map((item) => (
                            <PriceCard key={item.product} {...item} className="hover:shadow-lg transition-shadow duration-200" />
                        ))
                    ) : (
                        Array.from({ length: 3 }).map((_, index) => (
                            <PriceCardPlaceholder key={index} />
                        ))
                    )}
                </div>
            </section>

            {/* Longest Price Streaks section */}
            <section>
                <h2 className="text-xl font-semibold mb-2 text-blue-800">Longest Price Streaks</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {streaks.length > 0 ? (
                        streaks.map((item) => (
                            <StreakCard key={item.product} {...item} className="hover:shadow-lg transition-shadow duration-200" />
                        ))
                    ) : (
                        Array.from({ length: 3 }).map((_, index) => (
                            <StreakCardPlaceholder key={index} />
                        ))
                    )}
                </div>
            </section>

            {/* Table section */}
            <SortableProductTable
                data={allProductChanges}
                loading={allProductChangesLoading}
                error={error}
            />
        </div>
    );
};

export default ProgressiveLoading; 
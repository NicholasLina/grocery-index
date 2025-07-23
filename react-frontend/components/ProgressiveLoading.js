"use client";
import React from 'react';
import PriceCard from './PriceCard';
import StreakCard from './StreakCard';
import {
    PriceCardPlaceholder,
    StreakCardPlaceholder,
    TablePlaceholder
} from './LoadingPlaceholder';

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
            <div className="overflow-x-auto mt-12">
                <h2 className="text-xl font-semibold mb-2 text-blue-800">All Products: Monthly & Yearly Price Changes</h2>
                {allProductChangesLoading ? (
                    <TablePlaceholder />
                ) : allProductChanges.length > 0 ? (
                    <div className="min-w-full bg-white rounded shadow overflow-hidden">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-blue-100">
                                    <th className="px-4 py-2 text-left text-gray-900">Product</th>
                                    <th className="px-4 py-2 text-left text-gray-900">Current Price ($)</th>
                                    <th className="px-4 py-2 text-left text-gray-900">MoM Change ($)</th>
                                    <th className="px-4 py-2 text-left text-gray-900">MoM Change (%)</th>
                                    <th className="px-4 py-2 text-left text-gray-900">YoY Change ($)</th>
                                    <th className="px-4 py-2 text-left text-gray-900">YoY Change (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allProductChanges.map((row, idx) => (
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
                ) : (
                    <TablePlaceholder />
                )}
            </div>
        </div>
    );
};

export default ProgressiveLoading; 
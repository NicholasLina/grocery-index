"use client";
import React from 'react';

// Animated skeleton component
const Skeleton = ({ className = "", ...props }) => (
    <div
        className={`skeleton-loading animate-shimmer rounded ${className}`}
        {...props}
    />
);

// Loading placeholder for PriceCard
export const PriceCardPlaceholder = () => (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16" />
        </div>
        <div className="space-y-2">
            <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
            </div>
            <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-14" />
            </div>
        </div>
    </div>
);

// Loading placeholder for StreakCard
export const StreakCardPlaceholder = () => (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
        <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-12" />
        </div>
        <div className="space-y-2">
            <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-10" />
            </div>
            <div className="flex justify-between">
                <Skeleton className="h-3 w-18" />
                <Skeleton className="h-3 w-8" />
            </div>
        </div>
    </div>
);

// Loading placeholder for chart area
export const ChartPlaceholder = ({ height = "96px" }) => (
    <div className="w-full mt-2" style={{ height }}>
        <div className="w-full h-full bg-gray-50 rounded relative overflow-hidden skeleton-loading">
            {/* Chart area background */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-transparent opacity-30"></div>

            {/* Chart line skeleton - curved path */}
            <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path
                        d="M0,10 Q25,5 50,10 T100,10"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                        fill="none"
                        className="animate-pulse"
                    />
                    {/* Chart dots */}
                    <circle cx="0" cy="10" r="1.5" fill="#d1d5db" className="animate-pulse" />
                    <circle cx="25" cy="5" r="1.5" fill="#d1d5db" className="animate-pulse" />
                    <circle cx="50" cy="10" r="1.5" fill="#d1d5db" className="animate-pulse" />
                    <circle cx="75" cy="15" r="1.5" fill="#d1d5db" className="animate-pulse" />
                    <circle cx="100" cy="10" r="1.5" fill="#d1d5db" className="animate-pulse" />
                </svg>
            </div>

            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
        </div>
    </div>
);

// Loading placeholder for table rows
export const TableRowPlaceholder = () => (
    <tr className="animate-pulse">
        <td className="px-4 py-2">
            <Skeleton className="h-4 w-32" />
        </td>
        <td className="px-4 py-2">
            <Skeleton className="h-4 w-16" />
        </td>
        <td className="px-4 py-2">
            <Skeleton className="h-4 w-12" />
        </td>
        <td className="px-4 py-2">
            <Skeleton className="h-4 w-14" />
        </td>
        <td className="px-4 py-2">
            <Skeleton className="h-4 w-12" />
        </td>
        <td className="px-4 py-2">
            <Skeleton className="h-4 w-14" />
        </td>
    </tr>
);

// Loading placeholder for the entire table
export const TablePlaceholder = () => (
    <div className="overflow-x-auto mt-12">
        <Skeleton className="h-6 w-80 mb-4" />
        <div className="min-w-full bg-white rounded shadow overflow-hidden">
            <table className="min-w-full">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="px-4 py-2 text-left">
                            <Skeleton className="h-4 w-16" />
                        </th>
                        <th className="px-4 py-2 text-left">
                            <Skeleton className="h-4 w-24" />
                        </th>
                        <th className="px-4 py-2 text-left">
                            <Skeleton className="h-4 w-20" />
                        </th>
                        <th className="px-4 py-2 text-left">
                            <Skeleton className="h-4 w-22" />
                        </th>
                        <th className="px-4 py-2 text-left">
                            <Skeleton className="h-4 w-20" />
                        </th>
                        <th className="px-4 py-2 text-left">
                            <Skeleton className="h-4 w-22" />
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: 8 }).map((_, index) => (
                        <TableRowPlaceholder key={index} />
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

// Loading placeholder for section headers
export const SectionHeaderPlaceholder = () => (
    <Skeleton className="h-6 w-48 mb-4" />
);

// Main loading component for the entire homepage
export const HomePagePlaceholder = () => (
    <main className="max-w-4xl mx-auto p-4 bg-gray-50 min-h-[80vh] rounded-lg shadow-md">
        {/* Welcome text placeholder */}
        <div className="mb-10 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Biggest Price Increases section */}
        <section className="mb-8">
            <SectionHeaderPlaceholder />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                    <PriceCardPlaceholder key={index} />
                ))}
            </div>
        </section>

        {/* Biggest Discounts section */}
        <section className="mb-8">
            <SectionHeaderPlaceholder />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                    <PriceCardPlaceholder key={index} />
                ))}
            </div>
        </section>

        {/* Longest Price Streaks section */}
        <section className="mb-8">
            <SectionHeaderPlaceholder />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                    <StreakCardPlaceholder key={index} />
                ))}
            </div>
        </section>

        {/* Table placeholder */}
        <TablePlaceholder />
    </main>
);

export default HomePagePlaceholder; 
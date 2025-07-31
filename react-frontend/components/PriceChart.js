"use client";
import React, { useId, useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area
} from 'recharts';
import { ChartPlaceholder } from './LoadingPlaceholder';

// Custom tooltip to ensure black date text
function CustomTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-2 rounded shadow border border-gray-200">
                <div className="text-black font-semibold mb-1">Date: {label}</div>
                {payload.map((entry, idx) => (
                    <div key={idx} className="text-gray-900">
                        Price: <span className="font-mono">${entry.value.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
}

export default function PriceChart({ data, interactive = true, showGrid = true, showAxes = true, height = '18rem', lineColor = '#2563eb', debugAreaSolid = false, showPlaceholder = true }) {
    const [isClient, setIsClient] = useState(false);

    // Unique gradient id per chart instance - always call useId first
    const gradientId = useId();

    // Mark as client-side after hydration
    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return showPlaceholder ? <ChartPlaceholder height={height} /> : null;
    }

    if (!Array.isArray(data) || data.length === 0) {
        return showPlaceholder ? (
            <div className="flex items-center justify-center" style={{ height }}>
                <div className="text-center text-gray-500">
                    <div className="text-sm font-medium">No data available</div>
                    <div className="text-xs">Price history not found</div>
                </div>
            </div>
        ) : null;
    }
    // Defensive: ensure VALUE is a number and filter out rows without REF_DATE
    const chartData = data
        .filter(row => row.REF_DATE) // Only include rows with dates
        .map(row => ({
            ...row,
            VALUE: Number(row.VALUE),
        }));
    // Calculate min and max for Y axis
    const values = chartData.map(d => d.VALUE).filter(v => !isNaN(v));

    // If no valid data after filtering, show placeholder
    if (values.length === 0) {
        return showPlaceholder ? (
            <div className="flex items-center justify-center" style={{ height }}>
                <div className="text-center text-gray-500">
                    <div className="text-sm font-medium">No date data available</div>
                    <div className="text-xs">Price history missing date information</div>
                </div>
            </div>
        ) : null;
    }

    const minY = Math.min(...values);
    const maxY = Math.max(...values);
    // Add a small padding if min==max
    const yDomain = minY === maxY ? [minY - 1, maxY + 1] : [minY, maxY];
    return (
        <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 10 }}>
                    {!debugAreaSolid && (
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor={lineColor} stopOpacity={0.6} />
                                <stop offset="100%" stopColor={lineColor} stopOpacity={0.12} />
                            </linearGradient>
                        </defs>
                    )}
                    {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                    {showAxes && <XAxis dataKey="REF_DATE" tick={{ fontSize: 12 }} minTickGap={20} />}
                    {showAxes && <YAxis tick={{ fontSize: 12 }} domain={yDomain} />}
                    {!showAxes && <YAxis hide domain={yDomain} />}
                    {interactive && <Tooltip content={<CustomTooltip />} />}
                    <Area
                        dataKey="VALUE"
                        stroke="black"
                        fill="#3182bd"
                        fillOpacity={1}
                        isAnimationActive={interactive}
                    />
                    <Line type="monotone" dataKey="VALUE" stroke={lineColor} dot={false} isAnimationActive={interactive} activeDot={interactive} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
} 
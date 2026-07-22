'use client';

import React from 'react';
import { generatePriceInsights } from '../lib/priceInsights';

const TYPE_STYLES = {
  seasonal: 'border-l-emerald-600 bg-emerald-50',
  trend: 'border-l-blue-700 bg-blue-50',
  yoy: 'border-l-amber-600 bg-amber-50',
  position: 'border-l-rose-600 bg-rose-50',
  streak: 'border-l-indigo-600 bg-indigo-50',
};

/**
 * Plain-English price pattern insights for a product page.
 */
export default function ProductInsights({ history, productName, maxInsights = 4 }) {
  const insights = generatePriceInsights(history, productName, { maxInsights });

  if (!insights.length) {
    return null;
  }

  return (
    <section className="mb-8" aria-labelledby="price-insights-heading">
      <h2 id="price-insights-heading" className="text-lg font-semibold mb-2 text-blue-800">
        Price Insights
      </h2>
      <ul className="space-y-2">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className={`border-l-4 rounded-r px-3 py-2 text-sm text-gray-800 ${TYPE_STYLES[insight.type] || 'border-l-gray-400 bg-white'}`}
          >
            {insight.text}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-gray-500">
        Based on Statistics Canada monthly average retail prices for this region.
      </p>
    </section>
  );
}

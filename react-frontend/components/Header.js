"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiBaseUrl } from '../lib/api';
import SearchModal from './SearchModal';
import { REGION_OPTIONS } from '../lib/constants';
import { useRegion } from './RegionProvider';

export default function Header() {
    const [products, setProducts] = useState([]);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const { region, setRegion } = useRegion();

    useEffect(() => {
        async function fetchProducts() {
            try {
                const API_BASE = getApiBaseUrl();
                const res = await fetch(`${API_BASE}/products`);
                if (res.ok) {
                    const data = await res.json();
                    setProducts(data.products || []);
                }
            } catch (error) {
                console.warn('Failed to fetch products:', error);
            }
        }
        fetchProducts();
    }, []);

    return (
        <header className="bg-black text-white py-4 mb-8 shadow">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Logo and Title */}
                    <div className="flex items-center">
                        <Link href="/" className="hover:opacity-80 transition-opacity">
                            <div className="flex items-center gap-3">
                                <img
                                    src="/logo/CGI-Logo.png"
                                    alt="Canadian Grocery Index"
                                    width={48}
                                    height={48}
                                    className="w-12 h-12 object-contain"
                                />
                                <div>
                                    <h1 className="text-xl font-bold">Canadian Grocery Index</h1>
                                    <p className="text-gray-300 text-sm">Track food prices across Canada</p>
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Region Selector and Search - Grouped on the right */}
                    <div className="flex items-center gap-4">
                        {/* Region Selector */}
                        <div className="flex items-center">
                            <label htmlFor="region-select" className="mr-2 text-sm font-medium">
                                Region:
                            </label>
                            <select
                                id="region-select"
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                                className="px-3 py-1 bg-white text-gray-900 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                            >
                                {REGION_OPTIONS.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Search Button */}
                        <button
                            onClick={() => setIsSearchModalOpen(true)}
                            className="p-2 text-white hover:bg-gray-800 rounded-lg transition-colors"
                            aria-label="Search for products"
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Search Modal */}
            <SearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                products={products}
            />
        </header>
    );
} 
"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiBaseUrl } from '../lib/api';
import SearchModal from './SearchModal';

export default function Header() {
    const [products, setProducts] = useState([]);
    const [region, setRegion] = useState('Canada');
    const [isClient, setIsClient] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const router = useRouter();

    // Mark as client-side after hydration
    useEffect(() => {
        setIsClient(true);
    }, []);

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



    // Load region from localStorage only on client
    useEffect(() => {
        if (!isClient) return;

        const stored = localStorage.getItem('region');
        if (stored) setRegion(stored);
    }, [isClient]);

    // Save region to localStorage when it changes
    useEffect(() => {
        if (!isClient) return;

        localStorage.setItem('region', region);
        // Dispatch custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('regionChanged', { detail: { region } }));
    }, [region, isClient]);



    const regions = [
        { value: 'Canada', label: 'Canada' },
        { value: 'Ontario', label: 'Ontario' },
        { value: 'Quebec', label: 'Quebec' },
        { value: 'British Columbia', label: 'British Columbia' },
        { value: 'Alberta', label: 'Alberta' },
        { value: 'Manitoba', label: 'Manitoba' },
        { value: 'Saskatchewan', label: 'Saskatchewan' },
        { value: 'Nova Scotia', label: 'Nova Scotia' },
        { value: 'New Brunswick', label: 'New Brunswick' },
        { value: 'Newfoundland and Labrador', label: 'Newfoundland and Labrador' },
        { value: 'Prince Edward Island', label: 'Prince Edward Island' },
        { value: 'Northwest Territories', label: 'Northwest Territories' },
        { value: 'Nunavut', label: 'Nunavut' },
        { value: 'Yukon', label: 'Yukon' }
    ];

    // Don't render interactive elements until client-side hydration is complete
    if (!isClient) {
        return (
            <header className="bg-blue-900 text-white py-4 mb-8 shadow">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Logo and Title */}
                        <div className="flex items-center">
                            <Link href="/" className="hover:opacity-80 transition-opacity">
                                <div>
                                    <h1 className="text-xl font-bold">Canadian Grocery Index</h1>
                                    <p className="text-blue-200 text-sm">Track food prices across Canada</p>
                                </div>
                            </Link>
                        </div>

                        {/* Placeholder for region selector and search */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center">
                                <label className="mr-2 text-sm font-medium">
                                    Region:
                                </label>
                                <div className="px-3 py-1 bg-white text-gray-900 rounded border border-gray-300 text-sm">
                                    Canada
                                </div>
                            </div>
                            <div className="p-2 text-white">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        );
    }

    return (
        <header className="bg-blue-900 text-white py-4 mb-8 shadow">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Logo and Title */}
                    <div className="flex items-center">
                        <Link href="/" className="hover:opacity-80 transition-opacity">
                            <div>
                                <h1 className="text-xl font-bold">Canadian Grocery Index</h1>
                                <p className="text-blue-200 text-sm">Track food prices across Canada</p>
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
                                className="px-3 py-1 bg-white text-gray-900 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                {regions.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Search Button */}
                        <button
                            onClick={() => setIsSearchModalOpen(true)}
                            className="p-2 text-white hover:bg-blue-800 rounded-lg transition-colors"
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
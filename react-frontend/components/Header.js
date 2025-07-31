"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiBaseUrl } from '../lib/api';
import { productToSlug } from '../lib/slugUtils';

export default function Header() {
    const [products, setProducts] = useState([]);
    const [query, setQuery] = useState('');
    const [filtered, setFiltered] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [region, setRegion] = useState('Canada');
    const [searchExpanded, setSearchExpanded] = useState(false);
    const searchRef = useRef();
    const router = useRouter();

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

    useEffect(() => {
        if (!query) setFiltered([]);
        else setFiltered(products.filter(p => p.toLowerCase().includes(query.toLowerCase())).slice(0, 8));
    }, [query, products]);

    // Load region from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('region');
            if (stored) setRegion(stored);
        }
    }, []);

    // Save region to localStorage when it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('region', region);
            // Dispatch custom event for other components to listen to
            window.dispatchEvent(new CustomEvent('regionChanged', { detail: { region } }));
        }
    }, [region]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setDropdownOpen(false);
                setSearchExpanded(false);
                setQuery('');
                setFiltered([]);
            }
        }
        if (dropdownOpen || searchExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownOpen, searchExpanded]);

    function handleSelect(product) {
        const slug = productToSlug(product);
        setQuery('');
        setFiltered([]);
        setSearchExpanded(false);
        router.push(`/product/${slug}`);
    }

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

                        {/* Search Bar */}
                        <div className="relative" ref={searchRef}>
                            {searchExpanded ? (
                                <div className="relative w-80">
                                    <input
                                        type="text"
                                        placeholder="Search for a product..."
                                        value={query}
                                        onChange={(e) => {
                                            setQuery(e.target.value);
                                            setDropdownOpen(e.target.value.length > 0);
                                        }}
                                        onFocus={() => setDropdownOpen(query.length > 0)}
                                        className="w-full px-4 py-2 pl-10 text-gray-900 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        autoFocus
                                    />
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setSearchExpanded(true)}
                                    className="p-2 text-white hover:bg-blue-800 rounded-lg transition-colors"
                                    aria-label="Search for products"
                                >
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </button>
                            )}

                            {/* Dropdown Results */}
                            {dropdownOpen && filtered.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                                    {filtered.map((product, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSelect(product)}
                                            className="w-full px-4 py-2 text-left text-gray-900 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                                        >
                                            {product}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* No Results */}
                            {dropdownOpen && query && filtered.length === 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
                                    <div className="px-4 py-2 text-gray-500">
                                        No products found for &quot;{query}&quot;
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
} 
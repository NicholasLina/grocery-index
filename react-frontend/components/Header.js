"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Header() {
    const [products, setProducts] = useState([]);
    const [query, setQuery] = useState('');
    const [filtered, setFiltered] = useState([]);
    const router = useRouter();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Add region list at the top
    const REGIONS = [
        "Canada",
        "Newfoundland and Labrador",
        "Prince Edward Island",
        "Nova Scotia",
        "New Brunswick",
        "Quebec",
        "Ontario",
        "Manitoba",
        "Saskatchewan",
        "Alberta",
        "British Columbia"
    ];

    const [region, setRegion] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('region') || 'Canada';
        }
        return 'Canada';
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('region', region);
        }
    }, [region]);

    function handleRegionChange(e) {
        setRegion(e.target.value);
        if (typeof window !== 'undefined') {
            localStorage.setItem('region', e.target.value);
            window.location.reload(); // reload to propagate region change
        }
    }

    useEffect(() => {
        async function fetchProducts() {
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/statcan';
                const res = await fetch(`${API_BASE}/products`);
                const data = await res.json();
                setProducts(data.products || []);
            } catch (err) {
                setProducts([]);
            }
        }
        fetchProducts();
    }, []);

    useEffect(() => {
        if (!query) setFiltered([]);
        else setFiltered(products.filter(p => p.toLowerCase().includes(query.toLowerCase())).slice(0, 8));
    }, [query, products]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownOpen]);

    function handleSelect(product) {
        setQuery('');
        setFiltered([]);
        router.push(`/product/${encodeURIComponent(product)}`);
    }

    return (
        <header className="bg-blue-900 text-white py-4 mb-8 shadow">
            <nav className="max-w-4xl mx-auto flex items-center flex-wrap justify-center px-4 sm:justify-between">
                <Link href="/" className="text-2xl font-bold tracking-tight mb-2 sm:mb-0 hover:underline">Canadian Grocery Index</Link>
                <div className="flex flex-row gap-4 flex-wrap justify-end">
                    {/* Region Dropdown */}
                    <div className="ml-4">
                        <select
                            value={region}
                            onChange={handleRegionChange}
                            className="bg-blue-900 !text-right text-white font-bold px-3 py-1 border-b-1  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white focus:text-black"
                            aria-label="Select region"
                        >
                            {REGIONS.map(r => (
                                <option className="text-left" key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            className="p-2 rounded-full border-gray-300 hover:bg-white group focus:outline-none focus:ring-2 focus:ring-blue-400"
                            aria-label="Search products"
                            onClick={() => setDropdownOpen(v => !v)}
                        >
                            {/* Magnifying glass SVG */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white group-hover:text-blue-900 " fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                            </svg>
                        </button>
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-gray-200 border border-gray-300 rounded shadow z-20 p-2">
                                <input
                                    type="text"
                                    className="w-full px-3 py-1 rounded text-black bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition mb-2"
                                    placeholder="Search product..."
                                    value={query}
                                    autoFocus
                                    onChange={e => setQuery(e.target.value)}
                                    onFocus={e => setFiltered(products.filter(p => p.toLowerCase().includes(e.target.value.toLowerCase())).slice(0, 8))}
                                />
                                {filtered.length > 0 && (
                                    <ul className="bg-white text-black border rounded shadow max-h-48 overflow-y-auto">
                                        {filtered.map(product => (
                                            <li
                                                key={product}
                                                className="px-3 py-1 hover:bg-blue-100 cursor-pointer"
                                                onMouseDown={() => { handleSelect(product); setDropdownOpen(false); }}
                                            >
                                                {product}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    );
} 
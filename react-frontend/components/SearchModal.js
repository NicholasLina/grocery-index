"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { productToSlug } from '../lib/slugUtils';

export default function SearchModal({ isOpen, onClose, products }) {
    const [query, setQuery] = useState('');
    const [filtered, setFiltered] = useState([]);
    const router = useRouter();

    useEffect(() => {
        if (!query) {
            setFiltered([]);
        } else {
            setFiltered(
                products.filter(p =>
                    p.toLowerCase().includes(query.toLowerCase())
                ).slice(0, 12)
            );
        }
    }, [query, products]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Focus the input when modal opens
            const input = document.getElementById('search-modal-input');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        } else {
            document.body.style.overflow = 'unset';
            setQuery('');
            setFiltered([]);
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleSelect = (product) => {
        const slug = productToSlug(product);
        setQuery('');
        setFiltered([]);
        onClose();
        router.push(`/product/${slug}`);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Search Products
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Close search"
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="p-6">
                        <div className="relative">
                            <input
                                id="search-modal-input"
                                type="text"
                                placeholder="Search for a product..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full px-4 py-3 pl-12 text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-lg"
                            />
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="px-6 pb-6">
                        {query && (
                            <div className="space-y-2">
                                {filtered.length > 0 ? (
                                    filtered.map((product, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSelect(product)}
                                            className="w-full px-4 py-3 text-left text-gray-900 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none rounded-lg transition-colors"
                                        >
                                            <div className="font-medium">{product}</div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-gray-500 text-center">
                                        No products found for &quot;{query}&quot;
                                    </div>
                                )}
                            </div>
                        )}

                        {!query && (
                            <div className="text-center text-gray-500 py-8">
                                <svg className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <p>Start typing to search for products</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 
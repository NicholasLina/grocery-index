export const metadata = {
    title: 'Product Details - Grocery Index',
    description: 'View detailed price information for grocery products',
};

import ProductPage from '../../../components/ProductPage';
import { FALLBACK_PRODUCTS, FALLBACK_SLUG_MAPPING } from '../../../lib/products';
import { getApiBaseUrl } from '../../../lib/api';
import { productToSlug, getProductFromSlug, createSlugMapping } from '../../../lib/slugUtils';

// Generate static paths for all products at build time
export async function generateStaticParams() {
    try {
        const API_BASE = getApiBaseUrl();

        const res = await fetch(`${API_BASE}/products`, {
            next: { revalidate: 3600 }, // Cache for 1 hour
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!res.ok) {
            console.warn('Failed to fetch products for static generation, using fallback');
            return FALLBACK_PRODUCTS.slice(0, 20).map((product) => ({
                slug: productToSlug(product),
            }));
        }

        const data = await res.json();
        const products = data.products || [];

        // If no products returned, use fallback
        if (products.length === 0) {
            console.warn('No products returned from API, using fallback');
            return FALLBACK_PRODUCTS.slice(0, 20).map((product) => ({
                slug: productToSlug(product),
            }));
        }

        // Generate params for first 20 products to avoid build timeouts
        return products.slice(0, 20).map((product) => ({
            slug: productToSlug(product),
        }));
    } catch (error) {
        console.warn('Error generating static params for products:', error);
        // Return first 20 fallback products instead of empty array
        return FALLBACK_PRODUCTS.slice(0, 20).map((product) => ({
            slug: productToSlug(product),
        }));
    }
}

// Fetch data at build time for static generation
async function getProductData(slug) {
    try {
        // Try to get product name from fallback mapping first
        let productName = getProductFromSlug(slug, FALLBACK_SLUG_MAPPING);

        // If not found in fallback, try to fetch from API
        if (!productName) {
            const API_BASE = getApiBaseUrl();
            const res = await fetch(`${API_BASE}/products`, {
                next: { revalidate: 3600 },
                signal: AbortSignal.timeout(5000)
            });
            if (res.ok) {
                const data = await res.json();
                const products = data.products || [];
                const slugMapping = createSlugMapping(products);
                productName = getProductFromSlug(slug, slugMapping);
            }
        }

        if (!productName) {
            console.warn(`Product not found for slug: ${slug}`);
            return [];
        }

        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}?geo=Canada&product=${encodeURIComponent(productName)}`, {
            next: { revalidate: 3600 },
            signal: AbortSignal.timeout(5000)
        });

        if (!res.ok) {
            console.warn(`Failed to fetch data for ${productName}, will load client-side`);
            return [];
        }

        const data = await res.json();
        return data || [];
    } catch (error) {
        console.warn(`Error fetching data for ${slug} during build, will load client-side:`, error);
        return [];
    }
}

export default async function Page({ params }) {
    const { slug } = await params;
    const initialData = await getProductData(slug);

    return <ProductPage initialData={initialData} />;
} 
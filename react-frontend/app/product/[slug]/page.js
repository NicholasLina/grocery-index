export const metadata = {
    title: 'Product Details - Grocery Index',
    description: 'View detailed price information for grocery products',
};

import ProductPage from '../../../components/ProductPage';
import { FALLBACK_PRODUCTS, FALLBACK_SLUG_MAPPING } from '../../../lib/products';
import { getApiBaseUrl } from '../../../lib/api';
import { productToSlug, getProductFromSlug, createSlugMapping } from '../../../lib/slugUtils';

const STATIC_PRODUCT_LIMIT = 20;

async function fetchProductsList() {
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/products`, {
            next: { revalidate: 3600 },
            signal: AbortSignal.timeout(10000)
        });

        if (!res.ok) {
            return [];
        }

        const data = await res.json();
        return data.products || [];
    } catch (_error) {
        return [];
    }
}

// Generate static paths for all products at build time
export async function generateStaticParams() {
    const products = await fetchProductsList();
    const sourceProducts = products.length > 0 ? products : FALLBACK_PRODUCTS;

    return sourceProducts.slice(0, STATIC_PRODUCT_LIMIT).map((product) => ({
        slug: productToSlug(product),
    }));
}

// Fetch data at build time for static generation
async function getProductData(slug) {
    try {
        // Try to get product name from fallback mapping first
        let productName = getProductFromSlug(slug, FALLBACK_SLUG_MAPPING);

        // If not found in fallback, try to resolve from the API product list
        if (!productName) {
            const products = await fetchProductsList();
            if (products.length > 0) {
                const slugMapping = createSlugMapping(products);
                productName = getProductFromSlug(slug, slugMapping);
            }
        }

        if (!productName) {
            return { initialData: [], initialProductName: '' };
        }

        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}?geo=Canada&product=${encodeURIComponent(productName)}`, {
            next: { revalidate: 3600 },
            signal: AbortSignal.timeout(5000)
        });

        if (!res.ok) {
            return { initialData: [], initialProductName: productName };
        }

        const data = await res.json();
        return { initialData: data || [], initialProductName: productName };
    } catch (_error) {
        return { initialData: [], initialProductName: '' };
    }
}

export default async function Page({ params }) {
    const { slug } = await params;
    const { initialData, initialProductName } = await getProductData(slug);

    return <ProductPage initialData={initialData} initialProductName={initialProductName} />;
} 
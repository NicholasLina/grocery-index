export const metadata = {
    title: 'Product Price History - Canadian Grocery Index',
    description: 'Explore historical price trends for Canadian grocery products. Powered by StatCan data.'
};

import ProductPage from '../../../components/ProductPage';
import { FALLBACK_PRODUCTS } from '../../../lib/products';
import { getApiBaseUrl } from '../../../lib/api';

// Generate static paths for all products at build time
export async function generateStaticParams() {

    try {
        const API_BASE = getApiBaseUrl();

        const res = await fetch(`${API_BASE}/products`);

        if (!res.ok) {
            console.warn('Failed to fetch products for static generation, using fallback');
            return FALLBACK_PRODUCTS.map((product) => ({
                slug: encodeURIComponent(product),
            }));
        }

        const data = await res.json();
        const products = data.products || [];

        // If no products returned, use fallback
        if (products.length === 0) {
            console.warn('No products returned from API, using fallback');
            return FALLBACK_PRODUCTS.map((product) => ({
                slug: encodeURIComponent(product),
            }));
        }

        // Generate params for each product
        return products.map((product) => ({
            slug: encodeURIComponent(product),
        }));
    } catch (error) {
        console.warn('Error generating static params for products:', error);
        // Return fallback products instead of empty array
        return FALLBACK_PRODUCTS.map((product) => ({
            slug: encodeURIComponent(product),
        }));
    }
}

// Fetch data at build time for static generation
async function getProductData(slug) {
    try {
        const decodedSlug = decodeURIComponent(slug);
        const API_BASE = getApiBaseUrl();

        const res = await fetch(`${API_BASE}?geo=Canada&product=${encodeURIComponent(decodedSlug)}`);

        if (!res.ok) {
            console.warn(`Failed to fetch data for ${decodedSlug}, will load client-side`);
            return [];
        }

        const data = await res.json();
        return data || [];
    } catch (error) {
        console.warn(`Error fetching data for ${decodedSlug} during build, will load client-side:`, error);
        return [];
    }
}

export default async function Page({ params }) {
    const { slug } = params;
    const initialData = await getProductData(slug);

    return <ProductPage initialData={initialData} />;
} 
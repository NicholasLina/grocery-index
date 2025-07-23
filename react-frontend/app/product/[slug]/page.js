export const metadata = {
    title: 'Product Price History - Canadian Grocery Index',
    description: 'Explore historical price trends for Canadian grocery products. Powered by StatCan data.'
};

import ProductPage from '../../../components/ProductPage';

// Generate static paths for all products at build time
export async function generateStaticParams() {
    try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/statcan';
        const res = await fetch(`${API_BASE}/products`);

        if (!res.ok) {
            console.warn('Failed to fetch products for static generation, using fallback');
            return [];
        }

        const data = await res.json();
        const products = data.products || [];

        // Generate params for each product
        return products.map((product) => ({
            slug: encodeURIComponent(product),
        }));
    } catch (error) {
        console.warn('Error generating static params for products:', error);
        return [];
    }
}

// Fetch data at build time for static generation
async function getProductData(slug) {
    try {
        const decodedSlug = decodeURIComponent(slug);
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/statcan';
        const res = await fetch(`${API_BASE}?geo=Canada&product=${encodeURIComponent(decodedSlug)}`);

        if (!res.ok) {
            throw new Error('Failed to fetch product data');
        }

        const data = await res.json();
        return data || [];
    } catch (error) {
        console.error('Error fetching product data for static generation:', error);
        return [];
    }
}

export default async function Page({ params }) {
    const { slug } = params;
    const initialData = await getProductData(slug);

    return <ProductPage initialData={initialData} />;
} 
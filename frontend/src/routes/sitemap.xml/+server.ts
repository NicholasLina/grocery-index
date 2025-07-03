import type { RequestHandler } from '@sveltejs/kit';

// Fetch all product slugs from the backend API
async function getProductSlugs(): Promise<string[]> {
    const res = await fetch('http://localhost:3000/api/statcan/debug');
    const data = await res.json();
    // Assume data.productSlugs is an array of slugs like ["Milk|Canada", ...]
    return data.productSlugs || [];
}

export const GET: RequestHandler = async () => {
    const baseUrl = 'https://groceryindex.nicklina.com';
    const slugs = await getProductSlugs();

    const urls = [
        `<url><loc>${baseUrl}/</loc></url>`,
        ...slugs.map(
            (slug) =>
                `<url><loc>${baseUrl}/product/${encodeURIComponent(slug)}</loc></url>`
        )
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml'
        }
    });
}; 
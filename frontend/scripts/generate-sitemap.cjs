const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

const BASE_URL = 'https://groceryindex.nicklina.com';

async function main() {
    // Fetch all product slugs from your backend
    const res = await fetch('http://localhost:3000/api/statcan/debug');
    const data = await res.json();
    const slugs = data.productSlugs || [];

    // Build the XML
    const urls = [
        `<url><loc>${BASE_URL}/</loc></url>`,
        ...slugs.map(
            (slug) => `<url><loc>${BASE_URL}/product/${slug}</loc></url>`
        )
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    // Write to static directory
    const outPath = path.join(__dirname, '../static/sitemap.xml');
    fs.writeFileSync(outPath, xml);
    console.log('✅ sitemap.xml generated at', outPath);
}

main().catch((err) => {
    console.error('❌ Failed to generate sitemap:', err);
    process.exit(1);
});
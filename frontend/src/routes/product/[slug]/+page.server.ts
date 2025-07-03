export const prerender = true;

export async function entries() {
    // Fetch all product slugs from the backend debug endpoint
    const res = await fetch('http://localhost:3000/api/statcan/debug');
    const data = await res.json();
    // data.productSlugs is an array of URL-encoded slugs
    return (data.productSlugs as string[]).map((slug: string) => ({ slug }));
} 
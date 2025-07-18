// @ts-ignore: JSON import for prerender entries
import slugs from '$lib/product-slugs.json';

export const prerender = true;

export function entries() {
    return slugs.map(slug => ({ slug }));
} 
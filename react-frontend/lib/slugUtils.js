// Utility functions to convert between product names and URL-friendly slugs

/**
 * Convert a product name to a URL-friendly slug
 * @param {string} productName - The original product name
 * @returns {string} - URL-friendly slug
 */
function productToSlug(productName) {
    return productName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Convert a slug back to a product name
 * @param {string} slug - The URL-friendly slug
 * @returns {string} - The original product name (approximation)
 */
function slugToProduct(slug) {
    // This is a simplified conversion - for exact mapping, we'd need a lookup table
    // For now, we'll convert hyphens back to spaces and capitalize
    return slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Create a mapping of slugs to original product names
 * @param {string[]} products - Array of product names
 * @returns {Object} - Mapping of slug to original product name
 */
function createSlugMapping(products) {
    const mapping = {};
    products.forEach(product => {
        const slug = productToSlug(product);
        mapping[slug] = product;
    });
    return mapping;
}

/**
 * Get the original product name from a slug using a mapping
 * @param {string} slug - The URL-friendly slug
 * @param {Object} slugMapping - Mapping of slug to original product name
 * @returns {string|null} - The original product name or null if not found
 */
function getProductFromSlug(slug, slugMapping) {
    return slugMapping[slug] || null;
}

module.exports = {
    productToSlug,
    slugToProduct,
    createSlugMapping,
    getProductFromSlug
}; 
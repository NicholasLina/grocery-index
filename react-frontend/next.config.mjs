/** @type {import('next').NextConfig} */
const nextConfig = {
    // Vercel optimizations
    // Remove static export for full Next.js features
    // output: 'export', // Keep commented out for Vercel

    // Enable image optimization for better performance
    images: {
        unoptimized: false, // Enable image optimization
        domains: [], // Add your image domains here
        formats: ['image/webp', 'image/avif'], // Modern image formats
    },

    // Disable trailing slash for cleaner URLs
    trailingSlash: false,

    // Set base path if needed (leave empty for root domain)
    basePath: '',

    // Asset prefix for static hosting
    assetPrefix: '',

    // Enable server-side features
    serverExternalPackages: [],

    // Webpack configuration for better compatibility
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
            };
        }
        return config;
    },

    // Enable experimental features for better performance
    experimental: {
        // Enable server actions if needed
        serverActions: {},
        // Optimize bundle size
        optimizePackageImports: ['recharts'],
    },

    // Vercel-specific optimizations
    compress: true,
    poweredByHeader: false,
    generateEtags: false,
};

export default nextConfig;

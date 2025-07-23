/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable static export
    output: 'export',

    // Disable image optimization for static export
    images: {
        unoptimized: true,
    },

    // Disable trailing slash for cleaner URLs
    trailingSlash: false,

    // Set base path if needed (leave empty for root domain)
    basePath: '',

    // Asset prefix for static hosting
    assetPrefix: '',

    // Disable server-side features that don't work with static export
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
};

export default nextConfig;

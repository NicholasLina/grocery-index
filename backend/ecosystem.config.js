module.exports = {
    apps: [
        {
            name: 'grocery-index-backend',
            script: 'dist/app.js', // Use 'src/app.ts' if using ts-node, or 'dist/app.js' if transpiled
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            }
        }
    ]
}; 
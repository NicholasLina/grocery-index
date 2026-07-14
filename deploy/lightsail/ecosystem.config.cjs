module.exports = {
  apps: [
    {
      name: 'grocery-index-api',
      script: 'dist/server.js',
      cwd: __dirname + '/../../backend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        SQLITE_PATH: '/home/ubuntu/data/grocery-index.db',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
    },
  ],
};

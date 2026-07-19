module.exports = {
  apps: [
    {
      name: 'animplay-server',
      cwd: './server',
      script: 'dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      max_memory_restart: '500M',
      instances: 1,
      autorestart: true,
      watch: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/animplay-error.log',
      out_file: './logs/animplay-out.log',
    },
  ],
};

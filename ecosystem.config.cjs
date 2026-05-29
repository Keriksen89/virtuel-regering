// PM2 process definition.
// Secrets live in a .env file on the server — never committed to git.
// See .env.example for required variables.
module.exports = {
  apps: [
    {
      name: 'virtuel-regering',
      script: 'server/index.js',
      interpreter: 'node',
      interpreter_args: '--experimental-vm-modules',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
      },
    },
  ],
};

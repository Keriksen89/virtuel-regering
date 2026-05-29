// PM2 process definition.
// Secrets live in a .env file alongside this config — never committed to git.
// See .env.example for the required variables.
//
// The .env file is loaded two ways for robustness:
//   1. Node's native --env-file flag (Node >= 20.6) — the primary mechanism.
//   2. PM2's env_file option — fallback for older Node.
const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'virtuel-regering',
      script: 'server/index.js',
      cwd: __dirname,
      node_args: '--env-file=.env',
      env_file: '.env',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
      },
    },
  ],
};

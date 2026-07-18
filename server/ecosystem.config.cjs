module.exports = {
  apps: [
    {
      name: 'mockpad',
      script: 'index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      // Restart before the 256MB Fly.io VM OOMs
      max_memory_restart: '160M',
      node_args: '--max-old-space-size=128',
      exp_backoff_restart_delay: 1000,
      max_restarts: 20,
      min_uptime: '5s',
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 1234,
      },
    },
  ],
}

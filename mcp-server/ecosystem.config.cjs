module.exports = {
  apps: [{
    name: 'jlceda-mcp-server',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      JLCEDA_BRIDGE_PORT: '8765'
    },
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    // 自动重启延迟
    restart_delay: 3000,
    // 最大重启次数（10次/1分钟）
    max_restarts: 10,
    min_uptime: '10s'
  }]
};

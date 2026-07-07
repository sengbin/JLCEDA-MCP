#!/usr/bin/env node
/**
 * 检查 MCP 服务器状态
 */

import { WebSocket } from 'ws';

console.log('🔍 检查 JLCEDA MCP 服务器状态...\n');

const PORT = process.env.JLCEDA_BRIDGE_PORT || '8765';
const URL = `ws://127.0.0.1:${PORT}/bridge/ws`;

console.log(`服务器地址: ${URL}`);

const ws = new WebSocket(URL);

ws.on('open', () => {
  console.log('\n✅ MCP 服务器在线！');
  console.log('   状态: 运行中');
  console.log('   端口:', PORT);
  ws.close();
  process.exit(0);
});

ws.on('error', (err) => {
  console.log('\n❌ MCP 服务器离线');
  console.log('   错误:', err.message);
  console.log('\n💡 解决方案:');
  console.log('   1. 检查服务器是否启动: pm2 status');
  console.log('   2. 启动服务器: pm2 start ecosystem.config.cjs');
  console.log('   3. 查看日志: pm2 logs jlceda-mcp-server');
  process.exit(1);
});

setTimeout(() => {
  console.log('\n❌ 连接超时');
  console.log('   服务器可能未运行或端口不正确');
  ws.close();
  process.exit(1);
}, 5000);

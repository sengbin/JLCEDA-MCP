#!/usr/bin/env node
/**
 * 多客户端测试脚本
 * 用于验证多个MCP Server实例可以同时运行
 */

import { spawn } from 'child_process';

const serverPath = './dist/index.js';

console.log('启动多客户端测试...\n');

// 启动第一个服务器实例
console.log('启动服务器实例 #1...');
const server1 = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

server1.stderr.on('data', (data) => {
  console.log(`[Server #1] ${data.toString().trim()}`);
});

// 等待1秒后启动第二个实例
setTimeout(() => {
  console.log('\n启动服务器实例 #2...');
  const server2 = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  server2.stderr.on('data', (data) => {
    console.log(`[Server #2] ${data.toString().trim()}`);
  });

  // 再等待1秒后启动第三个实例
  setTimeout(() => {
    console.log('\n启动服务器实例 #3...');
    const server3 = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    server3.stderr.on('data', (data) => {
      console.log(`[Server #3] ${data.toString().trim()}`);
    });

    // 运行5秒后清理
    setTimeout(() => {
      console.log('\n\n测试完成，清理进程...');
      server1.kill();
      server2.kill();
      server3.kill();

      setTimeout(() => {
        console.log('所有服务器已停止。');
        process.exit(0);
      }, 500);
    }, 5000);
  }, 1000);
}, 1000);

// 错误处理
server1.on('error', (err) => {
  console.error('Server #1 错误:', err);
});

process.on('SIGINT', () => {
  console.log('\n\n收到中断信号，清理进程...');
  server1.kill();
  process.exit(0);
});

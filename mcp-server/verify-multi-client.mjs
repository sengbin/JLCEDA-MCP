#!/usr/bin/env node
/**
 * 快速验证多客户端支持
 *
 * 用法：node verify-multi-client.mjs
 */

import { spawn } from 'child_process';

console.log('🚀 JLCEDA MCP Server - 多客户端支持验证\n');
console.log('━'.repeat(60));

const serverPath = './dist/index.js';
let server1, server2;

// 启动第一个实例
console.log('\n📦 启动实例 #1...');
server1 = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

let server1Started = false;
let server2Started = false;

server1.stderr.on('data', (data) => {
  const line = data.toString().trim();

  if (line.includes('Started as MAIN server')) {
    server1Started = true;
    console.log('✅ 实例 #1：主服务器模式启动成功');

    // 等待 1 秒后启动第二个实例
    setTimeout(() => {
      console.log('\n📦 启动实例 #2...');
      server2 = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      server2.stderr.on('data', (data) => {
        const line = data.toString().trim();

        // 输出所有日志以便调试
        if (line && !line.includes('JLCEDA MCP Server')) {
          console.log(`   [#2] ${line}`);
        }

        if (line.includes('Started as CLIENT')) {
          server2Started = true;
          console.log('✅ 实例 #2：客户端模式启动成功');

          // 验证成功
          setTimeout(() => {
            console.log('\n' + '━'.repeat(60));
            console.log('✅ 多客户端支持验证通过！');
            console.log('\n📊 验证结果：');
            console.log('   • 实例 #1：主服务器模式 ✓');
            console.log('   • 实例 #2：客户端模式 ✓');
            console.log('   • 端口共享：成功 ✓');
            console.log('   • 自动切换：正常 ✓');
            console.log('\n💡 提示：');
            console.log('   现在可以在 VSCode、Claude Code、OpenCode 等工具中');
            console.log('   同时使用 JLCEDA MCP Server，无需手动切换。');
            console.log('\n' + '━'.repeat(60));

            // 清理
            cleanup();
          }, 1000);
        }
      });

      server2.on('error', (err) => {
        console.error('❌ 实例 #2 错误:', err.message);
        cleanup();
      });
    }, 1000);
  }

  if (line.includes('Failed to start') && !server1Started) {
    console.error('❌ 实例 #1 启动失败');
    console.error('   请确保：');
    console.error('   1. Node.js 版本 >= 20');
    console.error('   2. 已运行 npm install');
    console.error('   3. 已运行 npm run build');
    console.error('   4. 端口 8765 未被占用');
    cleanup();
  }
});

server1.on('error', (err) => {
  console.error('❌ 实例 #1 错误:', err.message);
  cleanup();
});

// 超时处理
setTimeout(() => {
  if (!server1Started || !server2Started) {
    console.error('\n❌ 验证超时');
    console.error('   某些实例未能在预期时间内启动');
    cleanup();
  }
}, 10000);

// 清理函数
function cleanup() {
  if (server1) server1.kill();
  if (server2) server2.kill();

  setTimeout(() => {
    process.exit(server1Started && server2Started ? 0 : 1);
  }, 500);
}

// 处理中断
process.on('SIGINT', () => {
  console.log('\n\n⚠️  收到中断信号，清理进程...');
  cleanup();
});

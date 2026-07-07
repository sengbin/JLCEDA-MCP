#!/usr/bin/env node
/**
 * ------------------------------------------------------------------------
 * JLCEDA MCP Server
 * 说明：嘉立创EDA的Model Context Protocol服务器
 *      通过stdio与MCP客户端通信，通过WebSocket调用EDA插件执行操作
 * ------------------------------------------------------------------------
 */

import { createStdioTransport } from './mcp/transport.js';
import { RpcHandler } from './mcp/rpc-handler.js';
import { ToolDispatcher } from './mcp/tool-dispatcher.js';
import { EdaBridgeServer } from './mcp/bridge-client.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取版本号
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const SERVER_VERSION = packageJson.version || '2.0.0';

// 从环境变量或默认值获取端口
const BRIDGE_PORT = parseInt(process.env.JLCEDA_BRIDGE_PORT || '8765', 10);

async function main() {
  process.stderr.write(`JLCEDA MCP Server v${SERVER_VERSION}\n`);
  process.stderr.write(`Starting WebSocket server on port ${BRIDGE_PORT}...\n`);

  // 初始化WebSocket服务器
  const bridgeServer = new EdaBridgeServer(BRIDGE_PORT);

  try {
    await bridgeServer.start();
    const mode = bridgeServer.getMode();
    if (mode === 'main') {
      process.stderr.write(`Started as MAIN server\n`);
    } else if (mode === 'client') {
      process.stderr.write(`Started as CLIENT (connected to main server)\n`);
    }
  } catch (error) {
    process.stderr.write(`Failed to start: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }

  // 初始化工具分发器
  const toolDispatcher = new ToolDispatcher(bridgeServer);

  // 初始化RPC处理器
  const rpcHandler = new RpcHandler(toolDispatcher, SERVER_VERSION);

  // 创建stdio传输层
  const transport = createStdioTransport(async (line: string) => {
    try {
      // 解析JSON-RPC请求
      const request = rpcHandler.parseRequestBody(line);

      // 处理请求
      const response = await rpcHandler.handleRequest(request);

      // 如果有响应，写回stdout
      if (response) {
        transport.write(response);
      }
    } catch (error) {
      // 发送错误响应
      const errorResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: error instanceof Error ? error.message : String(error),
        },
      };
      transport.write(errorResponse);
    }
  });

  // 启动传输层
  transport.start();

  // 输出启动日志到stderr（不影响stdio通信）
  process.stderr.write(`MCP Server started successfully\n`);
  process.stderr.write(`Listening on stdio for JSON-RPC requests\n`);

  // 清理函数
  const cleanup = () => {
    process.stderr.write(`Shutting down...\n`);
    bridgeServer.close();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

// 错误处理
process.on('uncaughtException', (error) => {
  process.stderr.write(`Uncaught exception: ${error.message}\n`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  process.stderr.write(`Unhandled rejection: ${reason}\n`);
  process.exit(1);
});

// 启动服务器
main().catch((error) => {
  process.stderr.write(`Failed to start server: ${error.message}\n`);
  process.exit(1);
});

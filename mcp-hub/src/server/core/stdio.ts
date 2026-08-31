/**
 * ------------------------------------------------------------------------
 * 名称：stdio 定义构造器
 * 说明：集中生成 VS Code 与 Cursor 共用的 stdio MCP 服务定义。
 * 作者：Lion
 * 邮箱：chengbin@3578.cn
 * 日期：2026-03-10
 * 备注：统一维护运行时命令、参数与标识，避免宿主分流逻辑重复。
 * ------------------------------------------------------------------------
 */

import * as path from 'path';
import * as vscode from 'vscode';
import { DEBUG_SWITCH } from '../../debug';
import { getRuntimeStatusFilePath, STATUS_FILE_FLAG } from '../../state/runtime-status';
import type { ServerConfig } from '../../state/status';

const STORAGE_DIRECTORY_FLAG = '--storage-directory';
const SESSION_ID_FLAG = '--session-id';
const EXTENSION_VERSION_FLAG = '--extension-version';
const DEBUG_ENABLE_SYSTEM_LOG_FLAG = '--enable-system-log';
const DEBUG_ENABLE_CONNECTION_LIST_FLAG = '--enable-connection-list';

// Cursor 侧注册使用的 MCP 服务名称。
export const JLC_MCP_SERVER_NAME = 'chengbin.jlceda-mcp-hub';

export interface CursorStdioServerConfig {
  name: string;
  server: {
    command: string;
    args: string[];
    env: Record<string, string>;
  };
}

// 获取当前扩展的本地 Node 运行时命令。
function getRuntimeCommand(): string {
  return process.execPath;
}

// Cursor/VS Code 通过 process.execPath（Electron）拉起 runtime.js。
// MCP 子进程需以 Node 模式运行，否则 macOS 上会报 Unable to find helper app 并立即退出。
function getRuntimeEnv(): Record<string, string> {
  return { ELECTRON_RUN_AS_NODE: '1' };
}

// 获取 MCP stdio 运行时入口脚本绝对路径。
function getRuntimeScriptPath(extensionPath: string): string {
  return path.join(extensionPath, 'out', 'server', 'runtime.js');
}

// 统一构造 stdio 运行时启动参数。
function getRuntimeArgs(extensionPath: string, storageDirectoryPath: string, sessionId: string, config: ServerConfig, extensionVersion: string, httpPort: number): string[] {
  const statusFilePath = getRuntimeStatusFilePath(storageDirectoryPath, config, sessionId);
  const args = [
    getRuntimeScriptPath(extensionPath),
    STORAGE_DIRECTORY_FLAG,
    storageDirectoryPath,
    SESSION_ID_FLAG,
    sessionId,
    '--host',
    config.host,
    '--port',
    String(config.port),
    STATUS_FILE_FLAG,
    statusFilePath,
    EXTENSION_VERSION_FLAG,
    extensionVersion,
    DEBUG_ENABLE_SYSTEM_LOG_FLAG,
    String(DEBUG_SWITCH.enableSystemLog),
    DEBUG_ENABLE_CONNECTION_LIST_FLAG,
    String(DEBUG_SWITCH.enableConnectionList),
  ];
  if (httpPort > 0) {
    args.push('--http-port', String(httpPort));
  }
  return args;
}

/**
 * 创建 VS Code 使用的 stdio MCP 服务定义。
 * @param extensionPath 扩展目录绝对路径。
 * @param config 当前桥接监听配置。
 * @param version 服务定义版本号。
 * @param httpPort HTTP MCP 传输监听端口，0 表示禁用。
 * @returns VS Code stdio MCP 服务定义。
 */
export function createVscodeStdioServerDefinition(
  extensionPath: string,
  storageDirectoryPath: string,
  sessionId: string,
  config: ServerConfig,
  version: string,
  httpPort: number
): vscode.McpStdioServerDefinition {
  const definition = new vscode.McpStdioServerDefinition(
    '嘉立创 EDA',
    getRuntimeCommand(),
    getRuntimeArgs(extensionPath, storageDirectoryPath, sessionId, config, version, httpPort),
    getRuntimeEnv(),
    version
  );
  definition.cwd = vscode.Uri.file(extensionPath);
  return definition;
}

/**
 * 创建 Cursor 使用的 stdio MCP 服务定义。
 * @param extensionPath 扩展目录绝对路径。
 * @param config 当前桥接监听配置。
 * @param version 服务定义版本号。
 * @param httpPort HTTP MCP 传输监听端口，0 表示禁用。
 * @returns Cursor stdio MCP 服务定义。
 */
export function createCursorStdioServerConfig(
  extensionPath: string,
  storageDirectoryPath: string,
  sessionId: string,
  config: ServerConfig,
  version: string,
  httpPort: number
): CursorStdioServerConfig {
  return {
    name: JLC_MCP_SERVER_NAME,
    server: {
      command: getRuntimeCommand(),
      args: getRuntimeArgs(extensionPath, storageDirectoryPath, sessionId, config, version, httpPort),
      env: getRuntimeEnv()
    }
  };
}
/**
 * ------------------------------------------------------------------------
 * 名称：JSON-RPC 处理器
 * 说明：处理 stdio JSON-RPC 请求并分发 MCP 工具调用
 * ------------------------------------------------------------------------
 */

import type { ToolDispatcher } from './tool-dispatcher.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载AI助手指令
const DEFAULT_AGENT_INSTRUCTIONS = readFileSync(
  join(__dirname, '..', 'resources', 'agent-instructions.md'),
  'utf8'
).trimEnd();

interface RpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: unknown;
}

export interface RpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

function isPlainObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export class RpcHandler {
  constructor(
    private readonly toolDispatcher: ToolDispatcher,
    private readonly serverVersion: string,
  ) {}

  /**
   * 解析 JSON-RPC 请求
   */
  public parseRequestBody(body: string): RpcRequest {
    const parsed = JSON.parse(body) as RpcRequest;
    if (parsed.jsonrpc !== '2.0' || typeof parsed.method !== 'string') {
      throw new Error('无效 JSON-RPC 请求');
    }
    return parsed;
  }

  /**
   * 处理 JSON-RPC 请求
   */
  public async handleRequest(payload: RpcRequest): Promise<RpcResponse | null> {
    const requestId = payload.id ?? null;
    const needsResponse = payload.id !== undefined;

    if (payload.method === 'initialize') {
      if (!needsResponse) {
        return null;
      }
      return this.createSuccessResponse(requestId, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        instructions: DEFAULT_AGENT_INSTRUCTIONS,
        serverInfo: {
          name: 'jlceda-mcp-server',
          version: this.serverVersion,
        },
      });
    }

    if (payload.method === 'notifications/initialized') {
      return null;
    }

    if (payload.method === 'tools/list') {
      if (!needsResponse) {
        return null;
      }
      return this.createSuccessResponse(requestId, {
        tools: this.toolDispatcher.getToolDefinitions(),
      });
    }

    if (payload.method === 'tools/call') {
      if (!isPlainObjectRecord(payload.params)) {
        return needsResponse ? this.createErrorResponse(requestId, -32602, 'tools/call 参数必须是对象') : null;
      }

      const toolName = String(payload.params.name ?? '').trim();
      if (toolName.length === 0) {
        return needsResponse ? this.createErrorResponse(requestId, -32602, 'tools/call 缺少 name 参数') : null;
      }

      try {
        const result = await this.toolDispatcher.dispatch({
          name: toolName,
          arguments: isPlainObjectRecord(payload.params.arguments) ? payload.params.arguments : undefined,
        });
        return needsResponse ? this.createSuccessResponse(requestId, result) : null;
      } catch (error: unknown) {
        return needsResponse ? this.createErrorResponse(requestId, -32000, toSafeErrorMessage(error)) : null;
      }
    }

    return needsResponse ? this.createErrorResponse(requestId, -32601, `不支持的方法: ${payload.method}`) : null;
  }

  private createSuccessResponse(id: string | number | null, result: unknown): RpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  private createErrorResponse(id: string | number | null, code: number, message: string): RpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
      },
    };
  }
}

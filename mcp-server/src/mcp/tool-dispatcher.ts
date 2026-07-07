/**
 * ------------------------------------------------------------------------
 * 名称：MCP 工具分发器
 * 说明：将MCP工具调用通过WebSocket转发到EDA插件执行
 * ------------------------------------------------------------------------
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { EdaBridgeServer } from './bridge-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载工具定义
const toolDefinitionsPath = join(__dirname, '..', 'resources', 'mcp-tool-definitions.json');
const rawToolDefinitions = JSON.parse(readFileSync(toolDefinitionsPath, 'utf8'));

export interface ToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

function isPlainObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// 加载工具定义
function loadToolDefinitions(): readonly ToolDefinition[] {
  const parsed: unknown = rawToolDefinitions;
  if (!Array.isArray(parsed)) {
    throw new Error('工具定义文件格式非法：根节点必须是数组');
  }

  const definitions: ToolDefinition[] = [];
  for (const item of parsed) {
    if (!isPlainObjectRecord(item)) {
      throw new Error('工具定义项必须为对象');
    }

    const name = String(item.name ?? '').trim();
    const description = String(item.description ?? '').trim();
    if (name.length === 0 || description.length === 0) {
      throw new Error('工具定义项缺少 name 或 description');
    }
    if (!isPlainObjectRecord(item.inputSchema)) {
      throw new Error(`工具 ${name} 缺少 inputSchema 对象`);
    }

    definitions.push({
      name,
      description,
      inputSchema: item.inputSchema,
    });
  }
  return definitions;
}

const TOOL_DEFINITIONS = loadToolDefinitions();

export class ToolDispatcher {
  constructor(private readonly bridgeServer: EdaBridgeServer) {}

  /**
   * 返回工具定义列表
   */
  public getToolDefinitions(): readonly ToolDefinition[] {
    return TOOL_DEFINITIONS;
  }

  /**
   * 分发工具调用到EDA插件
   */
  public async dispatch(toolCallParams: ToolCallParams): Promise<unknown> {
    const args = isPlainObjectRecord(toolCallParams.arguments) ? toolCallParams.arguments : {};
    
    try {
      // 获取桥接路径
      const bridgePath = this.getBridgePath(toolCallParams.name);
      
      // 通过WebSocket发送到EDA插件执行
      const result = await this.bridgeServer.request(bridgePath, args);
      
      // 包装为MCP响应格式
      return this.toToolContent(result);
    } catch (error) {
      throw new Error(`工具 ${toolCallParams.name} 执行失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 根据工具名获取桥接路径
   */
  private getBridgePath(toolName: string): string {
    const pathMap: Record<string, string> = {
      'schematic_read': '/bridge/jlceda/schematic/read',
      'schematic_review': '/bridge/jlceda/schematic/review',
      'component_select': '/bridge/jlceda/component/select',
      'component_place': '/bridge/jlceda/component/place',
      'component_place_auto': '/bridge/jlceda/component/place-auto',
      'netlabel_place': '/bridge/jlceda/netlabel/place',
      'netlabel_modify': '/bridge/jlceda/netlabel/modify',
      'schematic_auto_layout': '/bridge/jlceda/auto/layout',
      'schematic_auto_routing': '/bridge/jlceda/auto/routing',
      'api_index': '/bridge/jlceda/api/index',
      'api_search': '/bridge/jlceda/api/search',
      'api_invoke': '/bridge/jlceda/api/invoke',
      'eda_context': '/bridge/jlceda/context',
    };

    const path = pathMap[toolName];
    if (!path) {
      throw new Error(`未知工具: ${toolName}`);
    }

    return path;
  }

  /**
   * 包装为MCP tools/call响应格式
   */
  private toToolContent(result: unknown): { 
    content: Array<{ type: 'text'; text: string }>; 
    structuredContent: unknown;
  } {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
      structuredContent: result,
    };
  }
}

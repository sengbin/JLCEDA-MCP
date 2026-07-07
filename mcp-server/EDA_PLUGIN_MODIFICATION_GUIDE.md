# EDA插件调整说明

## 当前状态

原来的 `mcp-bridge` 插件是作为**客户端**连接到 `mcp-hub` 的WebSocket服务器。

```
mcp-bridge (客户端) → WebSocket → mcp-hub (服务器)
```

## 需要调整的架构

现在需要将 `mcp-bridge` 改为**服务器**，接受来自 `JLCEDA-MCP-Server` 的连接。

```
JLCEDA-MCP-Server (客户端) → WebSocket → mcp-bridge (服务器)
```

## 具体修改步骤

### 1. 修改 `mcp-bridge/src/runtime/bridge-transport.ts`

**原来的代码**（客户端）：
```typescript
export class BridgeTransport {
  private ws: WebSocket | null = null;
  
  public connect(url: string): void {
    this.ws = new WebSocket(url); // 作为客户端连接
    this.ws.on('message', this.handleMessage);
  }
}
```

**修改为**（服务器）：
```typescript
import { WebSocketServer } from 'ws';

export class BridgeTransport {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  
  public startServer(port: number = 8765): void {
    this.wss = new WebSocketServer({ port, path: '/bridge/ws' });
    
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log('MCP Server connected');
      
      ws.on('message', (data) => {
        this.handleMessage(data, ws);
      });
      
      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('MCP Server disconnected');
      });
    });
  }
  
  private handleMessage(data: Buffer, ws: WebSocket): void {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'bridge/task') {
        // 执行任务
        this.executeTask(message, ws);
      }
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  }
  
  private async executeTask(message: any, ws: WebSocket): Promise<void> {
    const { requestId, path, payload } = message;
    
    try {
      // 调用对应的handler
      const handler = this.getHandler(path);
      const result = await handler(payload);
      
      // 返回结果
      ws.send(JSON.stringify({
        type: 'bridge/result',
        requestId,
        result,
      }));
    } catch (error) {
      // 返回错误
      ws.send(JSON.stringify({
        type: 'bridge/result',
        requestId,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }
  
  private getHandler(path: string): (payload: any) => Promise<any> {
    // 返回对应的handler函数
    const handlers: Record<string, any> = {
      '/bridge/jlceda/schematic/read': handleSchematicReadTask,
      '/bridge/jlceda/schematic/review': handleSchematicReviewTask,
      '/bridge/jlceda/component/select': handleComponentSelectTask,
      // ... 其他handlers
    };
    
    return handlers[path] || (() => Promise.reject(new Error('Unknown path')));
  }
}
```

### 2. 修改 `mcp-bridge/src/runtime/bridge-runtime.ts`

**原来的代码**：
```typescript
export function startBridgeRuntime(): void {
  const transport = new BridgeTransport();
  transport.connect('ws://127.0.0.1:8765/bridge/ws'); // 连接到mcp-hub
}
```

**修改为**：
```typescript
export function startBridgeRuntime(): void {
  const transport = new BridgeTransport();
  transport.startServer(8765); // 启动WebSocket服务器
  console.log('Bridge server started on ws://127.0.0.1:8765/bridge/ws');
}
```

### 3. 简化配置

**移除以下内容**：
- 不再需要配置 `mcp-hub` 的连接地址
- 不再需要 `hello`/`welcome` 握手协议
- 不再需要 `role`（active/standby）角色系统
- 不再需要心跳保活机制

**保留以下内容**：
- 所有的 handler 实现（`src/mcp/` 目录下的11个文件）
- 任务执行逻辑
- 结果序列化

## 消息协议

### MCP服务器 → EDA插件（请求）

```json
{
  "type": "bridge/task",
  "requestId": "req_123_1234567890",
  "path": "/bridge/jlceda/schematic/read",
  "payload": {
    // 工具参数
  }
}
```

### EDA插件 → MCP服务器（响应）

```json
{
  "type": "bridge/result",
  "requestId": "req_123_1234567890",
  "result": {
    // 执行结果
  }
}
```

或错误响应：

```json
{
  "type": "bridge/result",
  "requestId": "req_123_1234567890",
  "error": "错误消息"
}
```

## 测试步骤

1. **修改并重新构建EDA插件**
   ```bash
   cd mcp-bridge
   npm run build
   ```

2. **在EDA中安装更新后的插件**

3. **启动EDA** - 插件会自动启动WebSocket服务器

4. **启动MCP服务器**
   ```bash
   cd JLCEDA-MCP-Server
   npm start
   ```
   应该看到 "Connected to EDA bridge" 消息

5. **配置Claude Desktop** 并测试工具调用

## 文件对照表

| 原文件 | 用途 | 是否需要修改 |
|--------|------|------------|
| `src/index.ts` | 插件入口 | ❌ 保持不变 |
| `src/runtime/bridge-runtime.ts` | 启动WebSocket服务器 | ✅ 改为服务器模式 |
| `src/runtime/bridge-transport.ts` | WebSocket通信 | ✅ 改为服务器实现 |
| `src/mcp/*.ts` | 11个handler | ❌ 保持不变 |
| `src/bridge/protocol.ts` | 协议定义 | ✅ 简化协议 |

## 注意事项

1. **端口冲突** - 如果8765端口被占用，可以修改为其他端口（需同步修改MCP服务器的环境变量）

2. **防火墙** - 确保8765端口允许本地连接

3. **错误处理** - 增强错误处理，确保异常不会导致服务器崩溃

4. **日志** - 保留日志输出，便于调试

## 环境变量

MCP服务器支持通过环境变量配置桥接地址：

```bash
# 默认值
JLCEDA_BRIDGE_URL=ws://127.0.0.1:8765/bridge/ws

# 自定义端口
JLCEDA_BRIDGE_URL=ws://127.0.0.1:9999/bridge/ws
```

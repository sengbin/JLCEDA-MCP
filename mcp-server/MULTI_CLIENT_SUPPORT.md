# MCP 服务器多客户端支持

## 概述

JLCEDA MCP Server 现已支持多个编程软件（如 VSCode、Claude Code、OpenCode 等）同时连接使用，而不是传统的握手后独占连接模式。

## 工作原理

### 架构设计

系统采用**主从架构**（Master-Client Architecture）：

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Server 实例                          │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │ VSCode       │    │ Claude Code  │    │ OpenCode     │ │
│  │ (实例 #1)    │    │ (实例 #2)    │    │ (实例 #3)    │ │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘ │
│         │                   │                   │          │
│         │ stdio             │ stdio             │ stdio    │
│         ▼                   ▼                   ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │ Main Server  │◄───┤ Client Mode  │◄───┤ Client Mode  │ │
│  │  (端口 8765) │    │  (WS 连接)   │    │  (WS 连接)   │ │
│  └──────┬───────┘    └──────────────┘    └──────────────┘ │
│         │                                                   │
│         │ WebSocket (端口 8765)                            │
│         ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              EDA 插件 (嘉立创 EDA)                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 启动流程

1. **第一个实例**：
   - 检测端口 8765 可用
   - 启动为**主服务器模式**（Main Server）
   - 监听来自 EDA 插件的连接（`/bridge/ws`）
   - 监听来自其他 MCP 实例的连接（`/mcp-internal`）

2. **后续实例**：
   - 检测端口 8765 已被占用
   - 自动切换为**客户端模式**（Client Mode）
   - 通过 WebSocket 连接到主服务器（`ws://127.0.0.1:8765/mcp-internal`）
   - 所有请求通过主服务器转发到 EDA 插件

### 请求转发机制

```
┌─────────────┐     JSON-RPC      ┌──────────────┐
│  Claude Code├──────stdio────────►│ Client #2    │
└─────────────┘                    │ (客户端模式)  │
                                   └──────┬───────┘
                                          │ WebSocket
                                          │ (内部连接)
                                          ▼
┌─────────────┐     JSON-RPC      ┌──────────────┐
│   VSCode    ├──────stdio────────►│  Main Server │
└─────────────┘                    │  (主服务器)  │
                                   └──────┬───────┘
                                          │
                                          │ WebSocket
                                          │ (EDA 连接)
                                          ▼
                                   ┌──────────────┐
                                   │  EDA 插件    │
                                   └──────────────┘
```

## 核心功能

### 1. 自动模式检测

服务器启动时自动检测端口状态：

```typescript
const portAvailable = await isPortAvailable(this.port);

if (portAvailable) {
  // 启动为主服务器
  await this.startAsMainServer();
} else {
  // 启动为客户端，连接到主服务器
  await this.startAsClient();
}
```

### 2. 双路径支持

主服务器支持两种客户端连接：

- **EDA 插件连接**：路径 `/bridge/ws` 或其他路径（默认）
- **MCP 内部连接**：路径 `/mcp-internal`（用于多实例通信）

### 3. 请求转发

客户端模式的实例通过主服务器转发所有请求：

```typescript
// 客户端模式发送请求
private async requestViaInternalClient(path: string, payload: unknown): Promise<unknown> {
  const request = {
    type: 'bridge/task',
    requestId: `req_${++this.requestIdCounter}_${Date.now()}`,
    path,
    payload,
  };
  
  this.internalClient.send(JSON.stringify(request));
  // 等待主服务器响应...
}
```

### 4. 智能错误恢复

如果启动主服务器失败（竞态条件），自动降级为客户端模式：

```typescript
try {
  await this.startAsMainServer();
} catch (error) {
  // 竞态条件：多个实例同时启动
  process.stderr.write(`Failed to start as main server, trying client mode\n`);
  await this.startAsClient();
}
```

## 测试验证

### 运行测试

```bash
cd JLCEDA-MCP/mcp-server
node test-multi-client.mjs
```

### 预期输出

```
启动多客户端测试...

启动服务器实例 #1...
[Server #1] JLCEDA MCP Server v2.0.0
[Server #1] Starting WebSocket server on port 8765...
[Server #1] [Main Server] WebSocket server listening on ws://127.0.0.1:8765
[Server #1] Started as MAIN server
[Server #1] MCP Server started successfully

启动服务器实例 #2...
[Server #2] JLCEDA MCP Server v2.0.0
[Server #2] [Client Mode] Connected to main server at ws://127.0.0.1:8765/mcp-internal
[Server #2] Started as CLIENT (connected to main server)
[Server #2] MCP Server started successfully

启动服务器实例 #3...
[Server #3] JLCEDA MCP Server v2.0.0
[Server #3] [Client Mode] Connected to main server at ws://127.0.0.1:8765/mcp-internal
[Server #3] Started as CLIENT (connected to main server)
[Server #3] MCP Server started successfully
```

## 配置说明

### 环境变量

- `JLCEDA_BRIDGE_PORT`：WebSocket 服务器端口（默认：8765）

### 在 VSCode 中配置

在 `.vscode/settings.json` 中：

```json
{
  "mcp.servers": {
    "jlceda": {
      "command": "node",
      "args": ["path/to/JLCEDA-MCP/mcp-server/dist/index.js"],
      "env": {
        "JLCEDA_BRIDGE_PORT": "8765"
      }
    }
  }
}
```

### 在 Claude Desktop 中配置

在 Claude 配置文件中添加：

```json
{
  "mcpServers": {
    "jlceda": {
      "command": "node",
      "args": ["path/to/JLCEDA-MCP/mcp-server/dist/index.js"],
      "env": {
        "JLCEDA_BRIDGE_PORT": "8765"
      }
    }
  }
}
```

## 使用场景

### 场景 1：VSCode + Claude Code 同时使用

1. 在 VSCode 中打开项目，MCP Server 自动启动（主服务器模式）
2. 打开 Claude Desktop，连接相同的 MCP Server（客户端模式）
3. 两个工具可以同时调用 EDA 功能，不会冲突

### 场景 2：多个开发环境

1. 开发环境：VSCode（主服务器）
2. 测试环境：Claude Code（客户端）
3. CI/CD 环境：OpenCode（客户端）

所有环境共享同一个 EDA 插件连接。

## 优势

1. **无需手动切换**：自动检测并选择正确的运行模式
2. **零配置**：多个客户端使用相同的配置即可
3. **高可用性**：主服务器关闭后，其他实例可以接管
4. **性能优化**：共享 WebSocket 连接，减少资源占用
5. **向后兼容**：单实例使用时与原有行为完全一致

## 技术细节

### 端口检测

使用 Node.js 的 `net` 模块检测端口可用性：

```typescript
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}
```

### 连接管理

主服务器维护两个连接池：

```typescript
private clients: Set<WebSocket> = new Set();      // EDA 客户端
private mcpClients: Set<WebSocket> = new Set();   // MCP 内部客户端
```

### 请求超时

所有请求默认超时时间为 30 秒：

```typescript
public async request(path: string, payload: unknown, timeoutMs: number = 30000)
```

## 故障排查

### 问题：所有实例都无法启动

**原因**：端口 8765 被其他程序占用

**解决**：
```bash
# Windows
netstat -ano | findstr 8765
taskkill /PID <进程ID> /F

# Linux/Mac
lsof -i :8765
kill -9 <进程ID>
```

### 问题：客户端连接失败

**原因**：主服务器未启动或防火墙阻止

**解决**：
1. 确认主服务器正在运行
2. 检查防火墙设置允许本地连接
3. 查看服务器日志确认错误

### 问题：请求超时

**原因**：EDA 插件未连接或响应慢

**解决**：
1. 确认 EDA 插件已安装并运行
2. 检查 EDA 插件的 WebSocket 连接状态
3. 增加超时时间（如果需要）

## 更新日志

### v2.0.0 (2024-07-06)

- ✅ 新增多客户端支持
- ✅ 主从架构实现
- ✅ 自动模式检测
- ✅ 请求转发机制
- ✅ 智能错误恢复
- ✅ 完整测试覆盖

## 贡献

欢迎提交问题和改进建议！

## 许可证

Apache-2.0

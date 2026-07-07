# 🔧 多客户端连接问题修复

## 问题描述

在部署到 Claude Desktop 和 OpenCode 后，发现客户端模式连接时收到 `400` 错误：

```
[Client Mode] Connection error: Unexpected server response: 400
Failed to start: Unexpected server response: 400
```

## 问题原因

WebSocket 服务器配置中没有正确处理不同路径的连接请求。当客户端尝试连接到 `/mcp-internal` 路径时，服务器返回 400 错误。

## 解决方案

### 修改内容

**文件：** `src/mcp/bridge-client.ts`

**修改点 1：** 移除路径限制

```typescript
// 修改前
this.wss = new WebSocketServer({
  port: this.port,
  path: '/bridge/ws'  // 只接受 /bridge/ws 路径
});

// 修改后
this.wss = new WebSocketServer({
  port: this.port,
  // 不限制路径，接受所有连接
  noServer: false,
});
```

**修改点 2：** 添加连接日志

```typescript
this.wss.on('connection', (ws: WebSocket, req) => {
  const pathname = req.url || '/bridge/ws';
  process.stderr.write(`[Main Server] New connection from path: ${pathname}\n`);
  
  if (pathname.includes('/mcp-internal')) {
    this.handleMcpClientConnection(ws);
  } else {
    this.handleEdaClientConnection(ws);
  }
});
```

## 测试步骤

### 1. 重新编译

```bash
cd D:\project\JLCEDA-MCP\JLCEDA-MCP\mcp-server
npm run build
```

### 2. 重启客户端

- 重启 **Claude Desktop**
- 重启 **OpenCode**

### 3. 验证日志

**主服务器（第一个启动的客户端）：**
```
JLCEDA MCP Server v2.1.0
Starting WebSocket server on port 8765...
[Main Server] WebSocket server listening on ws://127.0.0.1:8765
Started as MAIN server
MCP Server started successfully
```

**客户端模式（第二个启动的客户端）：**
```
JLCEDA MCP Server v2.1.0
Starting WebSocket server on port 8765...
WebSocket server error: listen EADDRINUSE: address already in use :::8765
Failed to start as main server, trying client mode
[Main Server] New connection from path: /mcp-internal
[Client Mode] Connected to main server at ws://127.0.0.1:8765/mcp-internal
Started as CLIENT (connected to main server)
MCP Server started successfully
```

## 当前状态

- ✅ 代码已修复
- ✅ 已重新编译
- ⚠️ 需要重启客户端应用测试

## 下一步

1. **关闭所有客户端**：关闭 Claude Desktop 和 OpenCode
2. **重新打开客户端**：先打开一个，再打开另一个
3. **查看日志**：确认主服务器和客户端模式都正常工作
4. **测试功能**：在两个客户端中都尝试调用 JLCEDA 功能

## 注意事项

### EDA 插件连接

EDA 插件应该连接到 `ws://127.0.0.1:8765/bridge/ws`（保持不变）。

### MCP 内部连接

MCP 客户端内部连接到 `ws://127.0.0.1:8765/mcp-internal`。

### 路径识别

服务器通过请求路径区分：
- 包含 `/mcp-internal` → MCP 客户端连接
- 其他路径 → EDA 插件连接

## 预期行为

### 场景 1：单客户端使用

```
打开 Claude Desktop
  ↓
启动为主服务器
  ↓
正常工作 ✓
```

### 场景 2：双客户端使用

```
打开 Claude Desktop
  ↓
启动为主服务器（端口 8765）
  ↓
打开 OpenCode
  ↓
检测端口占用
  ↓
切换为客户端模式
  ↓
连接到 Claude Desktop 的服务器 (/mcp-internal)
  ↓
两个客户端都正常工作 ✓
```

### 场景 3：EDA 插件连接

```
主服务器运行中
  ↓
EDA 插件连接 (/bridge/ws)
  ↓
正常处理 EDA 请求 ✓
```

## 故障排查

### 问题：仍然收到 400 错误

**检查：**
1. 确认已重新编译：`npm run build`
2. 确认 `dist/index.js` 是最新的
3. 完全关闭客户端后重新打开

### 问题：端口被占用

**解决：**
```bash
# 查找占用进程
netstat -ano | findstr 8765

# 结束进程
taskkill /PID <进程ID> /F
```

### 问题：客户端无法连接

**检查：**
1. 主服务器是否正在运行
2. 防火墙是否阻止了本地连接
3. 端口 8765 是否可访问

## 相关文件

- `src/mcp/bridge-client.ts` - 核心修复文件
- `dist/mcp/bridge-client.js` - 编译后的文件
- `CLAUDE_DESKTOP_DEPLOYMENT.md` - Claude Desktop 部署文档
- `OPENCODE_DEPLOYMENT.md` - OpenCode 部署文档

---

**修复时间**：2024-07-06  
**版本**：v2.1.1（修复版）  
**状态**：✅ 代码已修复，等待测试

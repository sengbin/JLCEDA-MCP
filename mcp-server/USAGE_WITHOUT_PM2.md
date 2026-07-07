# 多客户端使用说明（无需单独启动服务器）

## 🎯 重要说明

**你不需要单独启动 MCP 服务器！**

保持原有的客户端配置即可，系统会自动处理多客户端连接。

---

## 🚀 使用方式（零配置）

### 1. 保持原有配置

**VSCode** (`.vscode/settings.json`):
```json
{
  "mcp.servers": {
    "jlceda": {
      "command": "node",
      "args": ["D:/project/JLCEDA-MCP/JLCEDA-MCP/mcp-server/dist/index.js"]
    }
  }
}
```

**Claude Desktop** (配置文件):
```json
{
  "mcpServers": {
    "jlceda": {
      "command": "node",
      "args": ["D:/project/JLCEDA-MCP/JLCEDA-MCP/mcp-server/dist/index.js"]
    }
  }
}
```

### 2. 正常使用

```
打开 VSCode
  ↓
VSCode 自动启动 MCP 服务器（主服务器模式）
  ↓
打开 Claude Desktop
  ↓
Claude Desktop 自动启动 MCP 服务器
  ↓
检测到端口被占用，自动切换为客户端模式
  ↓
连接到 VSCode 的服务器
  ↓
两个工具同时工作 ✓
```

### 3. 验证是否工作

**VSCode 日志（第一个启动）：**
```
JLCEDA MCP Server v2.1.0
Starting WebSocket server on port 8765...
[Main Server] WebSocket server listening on ws://127.0.0.1:8765
Started as MAIN server
MCP Server started successfully
```

**Claude Desktop 日志（第二个启动）：**
```
JLCEDA MCP Server v2.1.0
Starting WebSocket server on port 8765...
WebSocket server error: listen EADDRINUSE: address already in use :::8765
Failed to start as main server, trying client mode
[Client Mode] Connected to main server at ws://127.0.0.1:8765/mcp-internal
Started as CLIENT (connected to main server)
MCP Server started successfully
```

---

## 📊 不同场景说明

### 场景 1：只使用一个客户端

```
打开 VSCode
  ↓
VSCode 启动服务器（主服务器模式）
  ↓
正常使用 ✓
```

**行为**：与原来完全一致，无任何变化。

### 场景 2：同时使用两个客户端

```
打开 VSCode（第一个）
  ↓
VSCode 启动服务器（主服务器模式）
  ↓
打开 Claude Desktop（第二个）
  ↓
Claude Desktop 启动服务器（客户端模式）
  ↓
两个工具同时工作 ✓
```

**行为**：自动协调，互不干扰。

### 场景 3：关闭第一个客户端

```
VSCode（主服务器）关闭
  ↓
服务器停止
  ↓
Claude Desktop 失去连接
  ↓
可以重启 Claude Desktop（会成为新的主服务器）
```

**说明**：主服务器关闭后，需要重启客户端工具来重新建立主服务器。

### 场景 4：先开 Claude Desktop，后开 VSCode

```
打开 Claude Desktop（第一个）
  ↓
Claude Desktop 启动服务器（主服务器模式）
  ↓
打开 VSCode（第二个）
  ↓
VSCode 启动服务器（客户端模式）
  ↓
两个工具同时工作 ✓
```

**说明**：谁先启动谁就是主服务器，后续的都自动成为客户端。

---

## ❓ 常见问题

### Q1: 我需要手动启动服务器吗？

**A:** 不需要！保持原有配置，客户端工具会自动启动。

### Q2: 两个工具会冲突吗？

**A:** 不会！第一个启动的成为主服务器，第二个自动切换为客户端模式。

### Q3: 如果我只用一个工具，会有影响吗？

**A:** 完全没有影响，行为与之前完全一致。

### Q4: 主服务器关闭后怎么办？

**A:** 客户端会失去连接，重启客户端工具即可重新建立主服务器。

### Q5: 我能看到服务器在哪种模式吗？

**A:** 可以查看客户端工具的日志：
- 主服务器日志：`Started as MAIN server`
- 客户端模式日志：`Started as CLIENT (connected to main server)`

### Q6: 什么时候需要使用 PM2？

**A:** 只有在以下情况才需要：
- 希望服务器永久在线（即使关闭所有客户端）
- 需要服务器开机自启动
- 需要稳定的生产环境

**大多数情况下，使用默认的客户端自动启动即可。**

---

## 🔍 如何检查是否正常工作

### 方法 1：查看客户端日志

在客户端工具中查看 MCP 服务器的启动日志，确认显示 `Started as MAIN server` 或 `Started as CLIENT`。

### 方法 2：测试多客户端

1. 打开 VSCode（或其他支持 MCP 的工具）
2. 打开 Claude Desktop
3. 在两个工具中都尝试调用 EDA 功能
4. 如果都能正常工作，说明多客户端支持已生效

### 方法 3：运行验证脚本

```bash
cd JLCEDA-MCP/mcp-server
node verify-multi-client.mjs
```

---

## 💡 总结

### 你需要做的：

✅ **什么都不用做！**

保持原有配置，正常使用即可。系统会自动：
- 第一个客户端启动主服务器
- 后续客户端自动切换为客户端模式
- 所有客户端通过主服务器协同工作

### 可选操作：

如果你希望服务器永久在线（即使关闭所有客户端工具），可以使用 PM2：

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

但这**不是必须的**，大多数情况下客户端自动启动就足够了。

---

## 🎯 推荐使用方式

### 日常开发（推荐）

**使用客户端自动启动（默认）**

- ✅ 零配置
- ✅ 自动管理
- ✅ 按需启动
- ✅ 多客户端支持

### 生产环境 / 长期运行

**使用 PM2 独立运行**

- ✅ 永久在线
- ✅ 开机自启动
- ✅ 自动重启
- ✅ 日志管理

---

**版本：** v2.1.0  
**更新时间：** 2024-07-06  
**关键点：** 无需单独启动服务器，保持原有配置即可

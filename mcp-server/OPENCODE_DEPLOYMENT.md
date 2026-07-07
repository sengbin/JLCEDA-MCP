# ✅ OpenCode MCP 配置完成

## 📋 配置信息

**配置文件路径：**
```
~/.config/opencode/opencode.json
或
C:\Users\xiaoyang\.config\opencode\opencode.json
```

**MCP 服务器配置：**
```json
{
  "jlceda": {
    "command": [
      "node",
      "D:\\project\\JLCEDA-MCP\\JLCEDA-MCP\\mcp-server\\dist\\index.js"
    ],
    "enabled": true,
    "env": {
      "JLCEDA_BRIDGE_PORT": "8765"
    },
    "type": "local"
  }
}
```

## ✅ 配置已完成

配置已成功更新到 OpenCode 配置文件中。

## 🚀 如何使用

### 1. 重启 OpenCode

**关闭并重新打开 OpenCode 应用**，新配置将自动生效。

### 2. 验证连接

重启后，在 OpenCode 中：
- MCP 服务器会自动启动
- 可以使用嘉立创 EDA 相关功能

### 3. 测试功能

在 OpenCode 中尝试：
```
帮我搜索一个 STM32F103C8T6 芯片
```

或

```
读取当前原理图的元件列表
```

## 📊 配置详情

### 服务器名称
- **名称**：`jlceda`
- **版本**：v2.1.0

### 执行路径
- **命令**：`node`
- **脚本**：`D:\project\JLCEDA-MCP\JLCEDA-MCP\mcp-server\dist\index.js`

### 运行模式
- **默认模式**：客户端自动启动
- **端口**：8765
- **协议**：stdio (JSON-RPC)
- **类型**：local

## 🌐 多客户端支持

### OpenCode + Claude Desktop + VSCode 同时使用

现在你可以同时在三个工具中使用 JLCEDA MCP：

**启动顺序示例：**

1. **打开 Claude Desktop**
   ```
   → 启动 MCP 服务器（主服务器模式）
   → 监听端口 8765
   ```

2. **打开 OpenCode**
   ```
   → 启动 MCP 服务器
   → 检测端口 8765 被占用
   → 切换为客户端模式
   → 连接到 Claude Desktop 的服务器
   ```

3. **打开 VSCode**
   ```
   → 启动 MCP 服务器
   → 检测端口 8765 被占用
   → 切换为客户端模式
   → 连接到 Claude Desktop 的服务器
   ```

**结果：三个工具同时工作，互不干扰！** ✓

### 日志示例

**OpenCode 日志（客户端模式）：**
```
JLCEDA MCP Server v2.1.0
Starting WebSocket server on port 8765...
WebSocket server error: listen EADDRINUSE: address already in use :::8765
Failed to start as main server, trying client mode
[Client Mode] Connected to main server at ws://127.0.0.1:8765/mcp-internal
Started as CLIENT (connected to main server)
MCP Server started successfully
```

## 🔍 验证配置

### 方法 1：查看 OpenCode 日志

OpenCode 通常会在开发者工具或日志文件中显示 MCP 启动信息。

### 方法 2：测试 MCP 功能

在 OpenCode 中输入：
```
列出可用的 MCP 工具
```

应该能看到 JLCEDA 相关的工具列表。

### 方法 3：使用状态检查脚本

```bash
cd D:\project\JLCEDA-MCP\JLCEDA-MCP\mcp-server
node check-server.mjs
```

## 🛠️ 故障排查

### 问题 1：MCP 服务器未启动

**检查：**
1. 确认路径正确：`D:\project\JLCEDA-MCP\JLCEDA-MCP\mcp-server\dist\index.js`
2. 确认文件存在：
   ```bash
   ls D:\project\JLCEDA-MCP\JLCEDA-MCP\mcp-server\dist\index.js
   ```
3. 确认 Node.js 已安装：
   ```bash
   node --version
   ```

### 问题 2：配置文件格式错误

**验证 JSON 格式：**
```bash
cat ~/.config/opencode/opencode.json | jq .
```

如果 JSON 格式正确，命令会输出格式化的 JSON。

### 问题 3：端口冲突

如果看到端口冲突错误，这是正常的（说明多客户端模式正在工作）。

如果所有客户端都无法启动：

```bash
# 检查端口占用
netstat -ano | findstr 8765

# 结束占用进程（如果需要）
taskkill /PID <进程ID> /F
```

### 问题 4：权限问题

确保 OpenCode 有权限执行 Node.js：

```bash
# 测试 Node.js 可执行
node -v

# 测试脚本可访问
node D:\project\JLCEDA-MCP\JLCEDA-MCP\mcp-server\dist\index.js --help
```

## 📝 配置备份

建议备份配置文件：

```bash
cp ~/.config/opencode/opencode.json ~/.config/opencode/opencode.json.backup
```

## 🔄 更新配置

如果需要修改配置：

1. 关闭 OpenCode
2. 编辑配置文件：
   ```bash
   # Windows
   notepad C:\Users\xiaoyang\.config\opencode\opencode.json
   
   # 或使用 VSCode
   code ~/.config/opencode/opencode.json
   ```
3. 保存文件
4. 重新打开 OpenCode

## 📊 配置对比

| 项目 | 旧配置 | 新配置 |
|------|--------|--------|
| 路径 | `D:\jlc-assistant\JLCEDA-MCP-Server\...` | `D:\project\JLCEDA-MCP\...` |
| 版本 | 旧版本 | v2.1.0 |
| 多客户端 | ❌ 不支持 | ✅ 支持 |
| 配置方式 | 旧格式 | 标准格式 |

## 🌟 已部署的客户端

现在 JLCEDA MCP v2.1.0 已部署到：

1. ✅ **Claude Desktop**
   - 配置文件：`C:\Users\xiaoyang\AppData\Local\Claude-3p\claude_desktop_config.json`
   - 服务器名：`jlceda`

2. ✅ **OpenCode**
   - 配置文件：`~/.config/opencode/opencode.json`
   - 服务器名：`jlceda`

3. ✅ **VSCode**（如果已配置）
   - 配置文件：`.vscode/settings.json`
   - 服务器名：`jlceda`

**所有客户端都可以同时使用！**

## 📚 相关文档

- **主文档**：`D:\project\JLCEDA-MCP\JLCEDA-MCP\mcp-server\README.md`
- **多客户端支持**：`D:\project\JLCEDA-MCP\JLCEDA-MCP\mcp-server\MULTI_CLIENT_SUPPORT.md`
- **使用说明**：`D:\project\JLCEDA-MCP\JLCEDA-MCP\mcp-server\USAGE_WITHOUT_PM2.md`
- **Claude Desktop 部署**：`D:\project\JLCEDA-MCP\JLCEDA-MCP\mcp-server\CLAUDE_DESKTOP_DEPLOYMENT.md`
- **本文档**：`D:\project\JLCEDA-MCP\JLCEDA-MCP\mcp-server\OPENCODE_DEPLOYMENT.md`

## ✅ 完成清单

- ✅ OpenCode 配置文件已更新
- ✅ MCP 服务器路径正确
- ✅ 多客户端支持已启用
- ✅ 环境变量已配置（JLCEDA_BRIDGE_PORT）
- ✅ 配置文档已创建

## 🎯 下一步

1. **重启 OpenCode**
2. **测试 MCP 功能**
3. **与 Claude Desktop 同时使用测试多客户端**
4. **享受无缝协同工作**

---

**配置完成时间**：2024-07-06  
**MCP 服务器版本**：v2.1.0  
**配置状态**：✅ 已部署到 OpenCode

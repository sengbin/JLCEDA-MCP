# 🚀 快速启动指南 - 保持 MCP 服务器在线

## 📋 前提条件

- ✅ Node.js 已安装（版本 20+）
- ✅ 项目已构建（运行过 `npm run build`）

---

## 方法一：使用 PM2（推荐生产环境）

### 1. 安装 PM2

```bash
npm install -g pm2
```

### 2. 启动服务器

```bash
cd JLCEDA-MCP/mcp-server
pm2 start ecosystem.config.cjs
```

### 3. 查看状态

```bash
pm2 status
pm2 logs jlceda-mcp-server
```

### 4. 设置开机启动

```bash
pm2 save
pm2 startup
# 按照提示执行返回的命令
```

### 5. 常用命令

```bash
pm2 list                      # 查看所有进程
pm2 restart jlceda-mcp-server # 重启服务器
pm2 stop jlceda-mcp-server    # 停止服务器
pm2 delete jlceda-mcp-server  # 删除服务器
pm2 logs                      # 查看日志
```

---

## 方法二：双击启动（简单方式）

### Windows 用户

**前台运行（带窗口）：**
- 双击 `start-server.bat`
- 服务器会在命令行窗口中运行
- 关闭窗口即停止服务器

**后台运行（无窗口）：**
- 双击 `start-server-background.vbs`
- 服务器在后台静默运行
- 通过任务管理器结束 `node.exe` 进程来停止

---

## 方法三：命令行直接启动

```bash
cd JLCEDA-MCP/mcp-server
node dist/index.js
```

按 `Ctrl+C` 停止服务器。

---

## 📊 检查服务器状态

运行状态检查脚本：

```bash
node check-server.mjs
```

**预期输出（在线）：**
```
✅ MCP 服务器在线！
   状态: 运行中
   端口: 8765
```

**预期输出（离线）：**
```
❌ MCP 服务器离线
   错误: connect ECONNREFUSED 127.0.0.1:8765
```

---

## 🔧 客户端配置

### 情况 1：服务器独立运行（推荐）

如果使用 PM2 或后台脚本保持服务器在线，客户端配置**保持不变**：

**VSCode** `.vscode/settings.json`：
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

**Claude Desktop** 配置：
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

**工作原理：**
- 独立运行的服务器成为主服务器
- 客户端启动时检测到端口被占用，自动切换为客户端模式
- 所有客户端通过主服务器工作

### 情况 2：仅使用独立服务器

如果你只想使用 PM2 运行的主服务器，不希望客户端再启动任何进程，可以移除客户端配置。

---

## 📝 日志管理

### PM2 日志

```bash
# 查看实时日志
pm2 logs jlceda-mcp-server

# 查看错误日志
pm2 logs jlceda-mcp-server --err

# 查看最近 100 行
pm2 logs jlceda-mcp-server --lines 100

# 清空日志
pm2 flush
```

### 日志文件位置

使用 PM2 时，日志保存在：
- `logs/error.log` - 错误日志
- `logs/output.log` - 输出日志

---

## 🛠️ 故障排查

### 问题：端口被占用

```bash
# Windows - 查找占用端口的进程
netstat -ano | findstr 8765

# 结束进程
taskkill /PID <进程ID> /F
```

### 问题：PM2 命令未找到

```bash
# 重新安装 PM2
npm install -g pm2

# 检查安装
pm2 --version
```

### 问题：服务器频繁重启

```bash
# 查看日志找出原因
pm2 logs jlceda-mcp-server --lines 200
```

---

## ✅ 推荐配置

**日常开发：**
- 使用客户端工具自动启动（默认配置）
- 多客户端支持自动生效

**生产环境/稳定使用：**
```bash
# 1. 使用 PM2 启动主服务器
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

# 2. 客户端配置保持不变
# 3. 所有客户端自动连接到主服务器
```

---

## 📞 需要帮助？

- 查看详细文档：`KEEP_ONLINE_GUIDE.md`
- 检查服务器状态：`node check-server.mjs`
- 查看 PM2 状态：`pm2 status`
- 查看日志：`pm2 logs jlceda-mcp-server`

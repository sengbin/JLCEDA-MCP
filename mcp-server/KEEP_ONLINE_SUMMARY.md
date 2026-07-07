# 📝 保持 MCP 服务器在线 - 完整方案

## 🎯 问题说明

**当前情况：**
- MCP 服务器由客户端工具（VSCode、Claude Desktop）启动
- 工具关闭时，服务器也会停止
- 每次使用都需要重新启动

**需求：**
- MCP 服务器独立运行，始终在线
- 多个客户端可以随时连接
- 服务器崩溃后自动重启
- 系统重启后自动启动

---

## ✅ 解决方案对比

| 方案 | 难度 | 稳定性 | 功能 | 推荐度 |
|------|------|--------|------|--------|
| **PM2** | ⭐ | ⭐⭐⭐⭐⭐ | 完整 | ⭐⭐⭐⭐⭐ |
| **批处理脚本** | ⭐ | ⭐⭐ | 基础 | ⭐⭐⭐ |
| **Windows 服务** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 完整 | ⭐⭐⭐⭐ |
| **forever** | ⭐ | ⭐⭐⭐ | 中等 | ⭐⭐⭐ |

---

## 🚀 推荐方案：PM2

### 优势

✅ **自动重启**：崩溃后立即重启  
✅ **开机启动**：系统启动时自动运行  
✅ **日志管理**：自动记录和轮转日志  
✅ **性能监控**：实时查看 CPU、内存使用  
✅ **零停机重载**：更新代码无需停机  
✅ **多进程管理**：可以管理多个服务

### 快速开始

```bash
# 1. 安装 PM2（全局安装，只需一次）
npm install -g pm2

# 2. 进入项目目录
cd JLCEDA-MCP/mcp-server

# 3. 启动服务器
pm2 start ecosystem.config.cjs

# 4. 查看状态
pm2 status

# 5. 设置开机启动
pm2 save
pm2 startup
# 按照提示执行返回的命令
```

### 日常使用

```bash
# 查看所有进程
pm2 list

# 查看日志
pm2 logs jlceda-mcp-server

# 实时监控
pm2 monit

# 重启服务器
pm2 restart jlceda-mcp-server

# 停止服务器
pm2 stop jlceda-mcp-server

# 删除服务器
pm2 delete jlceda-mcp-server
```

### 配置文件说明

已创建的 `ecosystem.config.cjs`：

```javascript
module.exports = {
  apps: [{
    name: 'jlceda-mcp-server',           // 进程名称
    script: './dist/index.js',           // 启动脚本
    instances: 1,                        // 实例数量
    autorestart: true,                   // 自动重启
    watch: false,                        // 不监听文件变化
    max_memory_restart: '200M',          // 超过200MB自动重启
    env: {
      NODE_ENV: 'production',
      JLCEDA_BRIDGE_PORT: '8765'        // 服务器端口
    },
    error_file: './logs/error.log',     // 错误日志
    out_file: './logs/output.log',      // 输出日志
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    restart_delay: 3000,                 // 重启延迟3秒
    max_restarts: 10,                    // 最大重启次数
    min_uptime: '10s'                    // 最小运行时间
  }]
};
```

---

## 🖱️ 简单方案：双击启动

### 前台运行（带窗口）

**使用文件：** `start-server.bat`

**特点：**
- 双击即可启动
- 显示服务器日志
- 关闭窗口即停止

**适用场景：**
- 临时测试
- 需要查看日志
- 手动控制启停

### 后台运行（无窗口）

**使用文件：** `start-server-background.vbs`

**特点：**
- 静默启动，无窗口
- 后台持续运行
- 通过任务管理器停止

**适用场景：**
- 不想看到窗口
- 长期运行
- 简单部署

**停止方法：**
1. 打开任务管理器 (Ctrl+Shift+Esc)
2. 找到 `node.exe` 进程
3. 结束进程

---

## 🔍 服务器状态检查

### 使用检查脚本

**运行：**
```bash
node check-server.mjs
```

**在线时输出：**
```
🔍 检查 JLCEDA MCP 服务器状态...

服务器地址: ws://127.0.0.1:8765/bridge/ws

✅ MCP 服务器在线！
   状态: 运行中
   端口: 8765
```

**离线时输出：**
```
🔍 检查 JLCEDA MCP 服务器状态...

服务器地址: ws://127.0.0.1:8765/bridge/ws

❌ MCP 服务器离线
   错误: connect ECONNREFUSED 127.0.0.1:8765

💡 解决方案:
   1. 检查服务器是否启动: pm2 status
   2. 启动服务器: pm2 start ecosystem.config.cjs
   3. 查看日志: pm2 logs jlceda-mcp-server
```

---

## 🔧 客户端配置

### 重要说明

使用独立运行方式后，**客户端配置保持不变**！

### 工作原理

```
┌─────────────────────────────────────┐
│  PM2 独立运行的服务器（主服务器）     │
│  端口: 8765                          │
└──────────────┬──────────────────────┘
               │
       ┌───────┼───────┐
       │               │
       ▼               ▼
  VSCode 客户端   Claude Desktop 客户端
  (客户端模式)     (客户端模式)
```

1. PM2 启动的服务器成为**主服务器**
2. VSCode/Claude Desktop 启动时检测到端口被占用
3. 自动切换为**客户端模式**连接到主服务器
4. 所有客户端通过主服务器工作

### VSCode 配置

`.vscode/settings.json` **保持不变**：

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

### Claude Desktop 配置

配置文件 **保持不变**：

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

---

## 📊 完整工作流程

### 初始设置（一次性）

```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 进入项目目录
cd JLCEDA-MCP/mcp-server

# 3. 构建项目（如果还没构建）
npm run build

# 4. 启动服务器
pm2 start ecosystem.config.cjs

# 5. 设置开机启动
pm2 save
pm2 startup
# 执行返回的命令

# 6. 验证状态
pm2 status
node check-server.mjs
```

### 日常使用

```bash
# 早上开机 - 服务器自动启动（已设置 pm2 startup）

# 打开 VSCode - 自动连接到主服务器（客户端模式）

# 打开 Claude Desktop - 自动连接到主服务器（客户端模式）

# 关闭工具 - 主服务器继续运行

# 晚上关机 - 明天开机后服务器自动启动
```

### 更新代码后

```bash
# 1. 重新构建
npm run build

# 2. 重启服务器
pm2 restart jlceda-mcp-server

# 3. 验证
pm2 logs jlceda-mcp-server --lines 20
```

---

## 🛠️ 故障排查

### 问题 1：PM2 命令未找到

**原因：** PM2 未安装或未添加到 PATH

**解决：**
```bash
npm install -g pm2
# 或
npm config set prefix "C:\Users\你的用户名\AppData\Roaming\npm"
```

### 问题 2：端口 8765 被占用

**检查：**
```bash
netstat -ano | findstr 8765
```

**解决：**
```bash
# 结束占用进程
taskkill /PID <进程ID> /F

# 或修改端口
set JLCEDA_BRIDGE_PORT=8766
pm2 restart jlceda-mcp-server
```

### 问题 3：服务器频繁重启

**检查日志：**
```bash
pm2 logs jlceda-mcp-server --lines 200
```

**常见原因：**
- 内存泄漏（已设置 max_memory_restart）
- 未捕获的异常
- 端口冲突

### 问题 4：开机不自动启动

**重新设置：**
```bash
pm2 unstartup
pm2 startup
# 执行返回的命令
pm2 save
```

---

## 📁 项目文件清单

### 配置文件
- ✅ `ecosystem.config.cjs` - PM2 配置
- ✅ `start-server.bat` - Windows 批处理脚本
- ✅ `start-server-background.vbs` - 后台启动脚本

### 工具脚本
- ✅ `check-server.mjs` - 服务器状态检查
- ✅ `verify-multi-client.mjs` - 多客户端验证
- ✅ `test-multi-client.mjs` - 完整测试脚本

### 文档
- ✅ `KEEP_ONLINE_GUIDE.md` - 详细指南
- ✅ `QUICK_START_ONLINE.md` - 快速启动
- ✅ `KEEP_ONLINE_SUMMARY.md` - 本文档
- ✅ `README.md` - 主文档（已更新）

---

## 🎯 推荐配置总结

### 个人开发者

**推荐：PM2**

```bash
# 安装
npm install -g pm2

# 启动
pm2 start ecosystem.config.cjs

# 开机启动
pm2 save && pm2 startup
```

**优势：**
- 稳定可靠
- 自动重启
- 日志管理
- 性能监控

### 团队协作

**推荐：PM2 + 文档**

1. 使用 PM2 保持主服务器在线
2. 团队成员客户端自动连接
3. 统一配置，统一管理

### 临时使用

**推荐：双击启动脚本**

- 简单快速
- 无需安装额外工具
- 适合临时测试

---

## 📞 获取帮助

### 查看文档
- 详细指南：`KEEP_ONLINE_GUIDE.md`
- 快速启动：`QUICK_START_ONLINE.md`
- 多客户端：`MULTI_CLIENT_SUPPORT.md`

### 检查状态
```bash
pm2 status                    # PM2 状态
node check-server.mjs         # 服务器状态
pm2 logs jlceda-mcp-server   # 查看日志
```

### 常用命令
```bash
pm2 restart jlceda-mcp-server # 重启
pm2 stop jlceda-mcp-server    # 停止
pm2 delete jlceda-mcp-server  # 删除
pm2 save                      # 保存配置
```

---

**版本：** v2.1.0  
**更新时间：** 2024-07-06  
**状态：** ✅ 已完成并测试

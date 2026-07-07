# 保持 MCP 服务器一直在线

## 方案 1：使用 PM2（推荐）

### 安装 PM2

```bash
npm install -g pm2
```

### 创建 PM2 配置文件

在 `mcp-server` 目录创建 `ecosystem.config.cjs`：

```javascript
module.exports = {
  apps: [{
    name: 'jlceda-mcp-server',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      JLCEDA_BRIDGE_PORT: '8765'
    },
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
};
```

### 启动服务器

```bash
# 进入项目目录
cd JLCEDA-MCP/mcp-server

# 启动服务器
pm2 start ecosystem.config.cjs

# 查看状态
pm2 status

# 查看日志
pm2 logs jlceda-mcp-server

# 停止服务器
pm2 stop jlceda-mcp-server

# 重启服务器
pm2 restart jlceda-mcp-server
```

### 设置开机自启动

```bash
# 保存当前 PM2 进程列表
pm2 save

# 设置开机启动（Windows）
pm2 startup
# 按照提示执行命令

# Linux/Mac
pm2 startup systemd
# 按照提示执行命令
```

### PM2 常用命令

```bash
pm2 list                  # 查看所有进程
pm2 status                # 查看状态
pm2 logs                  # 查看所有日志
pm2 logs jlceda-mcp-server # 查看特定进程日志
pm2 monit                 # 实时监控
pm2 restart all           # 重启所有进程
pm2 stop all              # 停止所有进程
pm2 delete jlceda-mcp-server # 删除进程
```

---

## 方案 2：创建独立启动脚本

### Windows 批处理脚本

创建 `start-server.bat`：

```batch
@echo off
echo Starting JLCEDA MCP Server...
cd /d "%~dp0"
node dist/index.js
pause
```

双击运行即可启动服务器。

### 后台运行版本

创建 `start-server-background.vbs`：

```vbscript
Set objShell = CreateObject("WScript.Shell")
objShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
objShell.Run "node dist/index.js", 0, False
```

双击运行，服务器会在后台运行（无窗口）。

---

## 方案 3：Windows 服务（高级）

### 使用 node-windows

安装依赖：

```bash
npm install -g node-windows
```

创建 `install-service.js`：

```javascript
const Service = require('node-windows').Service;
const path = require('path');

// 创建服务对象
const svc = new Service({
  name: 'JLCEDA MCP Server',
  description: '嘉立创 EDA MCP 服务器',
  script: path.join(__dirname, 'dist', 'index.js'),
  env: [{
    name: "JLCEDA_BRIDGE_PORT",
    value: "8765"
  }]
});

// 监听安装事件
svc.on('install', function() {
  console.log('服务安装成功！');
  svc.start();
});

// 安装服务
svc.install();
```

运行安装：

```bash
node install-service.js
```

卸载服务：

```javascript
// uninstall-service.js
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'JLCEDA MCP Server',
  script: path.join(__dirname, 'dist', 'index.js')
});

svc.on('uninstall', function() {
  console.log('服务已卸载');
});

svc.uninstall();
```

---

## 方案 4：任务计划程序（Windows）

### 使用 Windows 任务计划程序

1. 打开"任务计划程序"
2. 创建基本任务
3. 触发器：登录时
4. 操作：启动程序
   - 程序：`node.exe` 的完整路径
   - 参数：`dist/index.js` 的完整路径
   - 起始于：项目目录的完整路径

---

## 方案 5：使用 forever

### 安装 forever

```bash
npm install -g forever
```

### 启动服务器

```bash
cd JLCEDA-MCP/mcp-server
forever start dist/index.js
```

### 常用命令

```bash
forever list                    # 查看运行的进程
forever logs                    # 查看日志
forever stop dist/index.js      # 停止服务器
forever restart dist/index.js   # 重启服务器
forever stopall                 # 停止所有进程
```

---

## 修改客户端配置

### 重要：修改为独立启动模式

如果使用独立运行方式，需要修改客户端配置，**不要让客户端启动 MCP 服务器**。

#### VSCode 配置

将配置改为只连接，不启动：

```json
{
  "mcp.servers": {
    "jlceda": {
      "transport": "stdio",
      "command": "echo",
      "args": ["MCP Server should be running independently"]
    }
  }
}
```

或者直接移除配置，手动连接。

#### Claude Desktop 配置

修改配置文件，注释或移除自动启动：

```json
{
  "mcpServers": {
    // "jlceda": {
    //   "command": "node",
    //   "args": ["path/to/dist/index.js"]
    // }
  }
}
```

---

## 推荐配置方案

### 推荐：PM2 + 客户端通过 stdin 连接

1. **使用 PM2 独立运行主服务器**
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```

2. **客户端配置保持不变**
   - 第一个客户端会连接到已运行的主服务器（客户端模式）
   - 所有客户端都通过主服务器工作

### 优势

✅ 服务器始终在线  
✅ 自动重启（崩溃恢复）  
✅ 日志管理  
✅ 开机自启动  
✅ 多客户端无缝连接  
✅ 性能监控

---

## 验证服务器状态

创建 `check-server.mjs`：

```javascript
import { WebSocket } from 'ws';

console.log('检查 MCP 服务器状态...');

const ws = new WebSocket('ws://127.0.0.1:8765/bridge/ws');

ws.on('open', () => {
  console.log('✅ MCP 服务器在线！');
  ws.close();
  process.exit(0);
});

ws.on('error', (err) => {
  console.log('❌ MCP 服务器离线');
  console.log('   错误:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('❌ 连接超时');
  ws.close();
  process.exit(1);
}, 5000);
```

运行检查：

```bash
node check-server.mjs
```

---

## 故障排查

### 问题：端口冲突

**解决：** 修改环境变量

```bash
# Windows
set JLCEDA_BRIDGE_PORT=8766
pm2 restart jlceda-mcp-server

# Linux/Mac
export JLCEDA_BRIDGE_PORT=8766
pm2 restart jlceda-mcp-server
```

### 问题：服务器崩溃

**解决：** PM2 会自动重启，查看日志

```bash
pm2 logs jlceda-mcp-server --lines 100
```

### 问题：内存泄漏

**解决：** PM2 配置中已设置最大内存限制

```javascript
max_memory_restart: '200M'  // 超过 200MB 自动重启
```

---

## 推荐方案总结

| 方案 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **PM2** | 开发/生产 | 功能全面、稳定、易用 | 需要额外安装 |
| **Windows 服务** | 生产环境 | 系统级集成 | 配置复杂 |
| **批处理脚本** | 简单场景 | 无需额外依赖 | 功能有限 |
| **forever** | 开发环境 | 轻量级 | 功能较少 |
| **任务计划** | Windows | 系统原生 | 管理不便 |

**综合推荐：PM2** - 功能强大、易于管理、适合各种场景。

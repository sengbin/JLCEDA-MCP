# JLCEDA MCP Server

> 🎉 首个支持所有MCP客户端的JLCEDA EDA集成方案

将嘉立创EDA专业版集成到MCP生态系统，支持Claude Desktop、OpenCode、Cline等所有MCP客户端。

---

## 📐 架构设计

```
AI客户端 (OpenCode/Claude Desktop/Cline等)
    ↓ stdio/JSON-RPC (MCP协议)
MCP服务器 (Node.js独立进程)
    • WebSocket服务器
    • 监听端口8765
    • 工具分发和结果转换
    ↓ WebSocket通信
EDA插件 v2.0 (WebSocket客户端)
    • 连接到MCP服务器
    • 执行EDA操作
    • 返回结果
    ↓ 全局eda对象
JLCEDA EDA API
```

### 创新特点

- ✅ **反转架构**：EDA插件作为客户端连接到MCP服务器
- ✅ **无需IDE插件**：MCP服务器独立运行，支持所有MCP客户端
- ✅ **多客户端支持**：VSCode、Claude Code、OpenCode 等可同时连接使用
- ✅ **智能检测**：仅在原理图/PCB页面自动连接
- ✅ **自动重连**：连接断开自动恢复

---

## 🚀 快速开始

### 前置要求

- Node.js 20+
- JLCEDA EDA 专业版（最新版）
- 支持MCP的AI客户端（OpenCode/Claude Desktop/Cline等）

### 安装步骤

#### 1. 安装EDA插件

**配套项目**：[JLCEDA-MCP (EDA Bridge)](https://github.com/UR-xiaoyang/JLCEDA-MCP)

**方式一：从 Release 下载（推荐）**

1. 前往 [JLCEDA-MCP Releases](https://github.com/UR-xiaoyang/JLCEDA-MCP/releases) 下载 `.eext` 文件
2. 打开 JLCEDA EDA → 扩展 → 扩展管理
3. 点击"从文件安装"，选择下载的文件
4. 重启 EDA

**方式二：从源码构建**

```bash
git clone https://github.com/UR-xiaoyang/JLCEDA-MCP.git
cd JLCEDA-MCP/mcp-bridge
npm install
npm run build
# 产物：../build/jlceda-mcp-bridge-2.0.0.eext
```

#### 2. 构建MCP服务器

```bash
# 克隆本仓库
git clone https://github.com/UR-xiaoyang/JLCEDA-MCP-Server.git
cd JLCEDA-MCP-Server

# 安装依赖
npm install

# 构建
npm run build
# 产物：dist/index.js
```

**以OpenCode为例：**

编辑 `~/.config/opencode/opencode.json`：

```json
{
  "mcp": {
    "jlceda": {
      "command": ["node", "D:\\jlc-assistant\\JLCEDA-MCP-Server\\dist\\index.js"],
      "enabled": true,
      "type": "local",
      "env": {
        "JLCEDA_BRIDGE_PORT": "8765"
      }
    }
  }
}
```

**Claude Desktop配置：**

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) 或
`%APPDATA%\Claude\claude_desktop_config.json` (Windows)：

```json
{
  "mcpServers": {
    "jlceda": {
      "command": "node",
      "args": ["D:\\jlc-assistant\\JLCEDA-MCP-Server\\dist\\index.js"],
      "env": {
        "JLCEDA_BRIDGE_PORT": "8765"
      }
    }
  }
}
```

#### 3. 启动流程

```
1. 打开JLCEDA EDA
   ↓
2. 打开原理图文件（.sch）
   ↓
   ✅ EDA插件自动连接到MCP服务器
   ✅ 提示：已连接到MCP服务器
   
3. 启动AI客户端（OpenCode/Claude Desktop等）
   ↓
   ✅ MCP服务器自动启动
   ✅ 等待EDA插件连接
   
4. 开始使用
   ↓
   ✅ 在AI客户端中对话使用JLCEDA工具
```

---

## 🛠️ 可用工具

### 基础工具

| 工具 | 功能 | 示例 |
|------|------|------|
| `jlceda_eda_context` | 获取EDA环境信息 | 获取当前项目、文档类型 |
| `jlceda_schematic_read` | 读取当前原理图 | 读取器件列表、网络连接 |
| `jlceda_schematic_review` | 审查全工程原理图 | 多页原理图、完整BOM |

### 器件操作

| 工具 | 功能 | 示例 |
|------|------|------|
| `jlceda_component_select` | 搜索器件库 | 搜索STM32、电容、电阻 |
| `jlceda_component_place_auto` | 自动放置器件 | 放置器件到指定坐标 |

### 自动化工具

| 工具 | 功能 | 示例 |
|------|------|------|
| `jlceda_auto_wire_connect` | 自动连线 | 按网络名连接引脚 |
| `jlceda_schematic_auto_layout` | 自动布局 | 优化器件位置 |
| `jlceda_schematic_auto_routing` | 自动布线 | 自动连接导线 |

### 高级工具

| 工具 | 功能 | 示例 |
|------|------|------|
| `jlceda_api_search` | 搜索EDA API | 查找特定功能的API |
| `jlceda_api_index` | 列出API索引 | 浏览可用模块 |
| `jlceda_api_invoke` | 调用EDA API | 执行原生API操作 |

---

## 💬 使用示例

### 示例1：读取原理图

**对话：**
```
请帮我读取当前原理图
```

**AI返回：**
```
✅ 原理图信息：
- 器件数量：8个
- 器件列表：
  • DC1: 电源插座 (DC-005.1)
  • C1-C3: 钽电容 (100uF)
  • U1-U2: 电源模块
  • U3: ESP32-WROOM-32E
  • U4: CH340G USB转串口
- DRC检查：未通过（有未连接的引脚）
```

### 示例2：搜索并放置器件

**对话：**
```
帮我搜索STM32F103C8T6芯片，然后放置到坐标(3000, 3000)
```

**AI执行：**
1. 搜索STM32F103C8T6
2. 显示候选列表
3. 选择合适的型号
4. 放置到指定位置

**结果：**
```
✅ 成功放置STM32F103C8T6
- 位置：(3000, 3000)
- 封装：LQFP-48
- 制造商：ST意法半导体
```

### 示例3：电路分析

**对话：**
```
分析当前原理图的电路功能
```

**AI返回：**
```
📊 电路分析：

1. 电源方案：
   - DC插座供电
   - 多级电源模块
   - 钽电容滤波

2. 主控芯片：
   - ESP32-WROOM-32E WiFi模块
   - 支持无线通信

3. 通信接口：
   - CH340G USB转串口
   - 用于调试和下载

4. 建议：
   - 未连接的引脚需要处理
   - 建议添加退耦电容
```

### 示例4：批量放置器件

**对话：**
```
帮我放置3个0.1uF电容，使用网格布局
```

**AI执行：**
1. 搜索0.1uF电容
2. 选择合适型号
3. 使用网格布局自动计算位置
4. 批量放置

---

## 🌐 多客户端支持

### 概述

MCP Server 支持多个编程软件（VSCode、Claude Code、OpenCode 等）**同时连接使用**，无需手动切换或独占连接。

**重要：无需单独启动服务器！** 保持原有客户端配置即可，系统自动处理。

### 工作原理

- **第一个启动的客户端**：自动启动服务器并成为主服务器（监听端口 8765）
- **后续启动的客户端**：自动检测端口占用，切换为客户端模式连接到主服务器
- **所有请求**：通过主服务器统一转发到 EDA 插件

### 使用场景

#### 场景 1：VSCode + Claude Desktop 同时使用

```bash
# 1. 打开 VSCode → MCP Server 自动启动（主服务器模式）
# 2. 打开 Claude Desktop → MCP Server 自动启动（客户端模式）
# 3. 两个工具可以同时调用 EDA 功能，不会冲突
```

**无需任何配置更改！**

#### 场景 2：多个开发环境协作

```
开发环境: VSCode (主服务器)
  ├─ 测试环境: Claude Code (客户端)
  └─ CI/CD: OpenCode (客户端)
```

### 启动日志示例

**第一个实例（主服务器）：**
```
JLCEDA MCP Server v2.0.0
Starting WebSocket server on port 8765...
[Main Server] WebSocket server listening on ws://127.0.0.1:8765
Started as MAIN server
MCP Server started successfully
```

**第二个实例（客户端模式）：**
```
JLCEDA MCP Server v2.0.0
Starting WebSocket server on port 8765...
[Client Mode] Connected to main server at ws://127.0.0.1:8765/mcp-internal
Started as CLIENT (connected to main server)
MCP Server started successfully
```

### 配置说明

所有客户端使用相同的配置即可，无需特殊设置。系统会自动检测并选择正确的运行模式。

**详细文档**：查看 [MULTI_CLIENT_SUPPORT.md](./MULTI_CLIENT_SUPPORT.md) 了解完整的技术细节和故障排查。

---

## 🔌 保持服务器在线

### 问题

默认情况下，MCP 服务器由客户端工具（VSCode/Claude Desktop）启动，当工具关闭时服务器也会停止。

### 解决方案

#### 方法 1：使用 PM2（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务器
pm2 start ecosystem.config.cjs

# 设置开机启动
pm2 save
pm2 startup

# 查看状态
pm2 status
pm2 logs jlceda-mcp-server
```

#### 方法 2：双击启动脚本

**Windows 用户：**
- 前台运行：双击 `start-server.bat`
- 后台运行：双击 `start-server-background.vbs`

#### 方法 3：直接运行

```bash
node dist/index.js
```

### 检查服务器状态

```bash
node check-server.mjs
```

### 工作原理

使用 PM2 或脚本独立运行服务器后：
1. 独立服务器成为**主服务器**
2. 客户端工具启动时检测到端口占用，自动切换为**客户端模式**
3. 所有客户端通过主服务器工作
4. 服务器保持在线，随时可用

**详细指南**：查看 [KEEP_ONLINE_GUIDE.md](./KEEP_ONLINE_GUIDE.md) 和 [QUICK_START_ONLINE.md](./QUICK_START_ONLINE.md)

---

## 🔧 EDA插件功能

### 菜单位置

**MCP Bridge** 菜单（在Home/原理图/PCB页面都可见）

### 菜单项

| 菜单项 | 功能 | 说明 |
|--------|------|------|
| **连接状态** | 查看连接详情 | 显示服务器状态、连接时长、请求统计 |
| **重启服务器** | 重启连接 | 断开并重新连接，刷新状态 |
| **连接设置** | 查看配置 | 显示服务器地址和使用说明 |
| **查看调试日志** | 排查问题 | 查看最近100条日志 |
| **清空调试日志** | 清理日志 | 清除所有调试记录 |
| **About** | 版本信息 | 显示插件版本 |

### 连接状态显示

```
═══════════════════════════════════════
  MCP Bridge 客户端状态 (v2.0)
═══════════════════════════════════════

✅ 客户端运行中

服务器地址: ws://127.0.0.1:8765/bridge/ws
运行时长: 15分钟 30秒
总请求数: 25

✅ 已连接到MCP服务器

───────────────────────────────────────
  连接详情
───────────────────────────────────────

连接 #1:
  ID: mcp-server
  连接时长: 15分钟 25秒
  空闲时间: 5秒
  处理请求: 25 个

═══════════════════════════════════════
```

---

## 🔍 故障排除

### 问题1：EDA插件显示"未连接"

**检查：**
1. 确认MCP服务器正在运行
2. 检查端口8765是否被占用：`netstat -ano | findstr 8765`
3. 查看EDA调试日志：`MCP Bridge → 查看调试日志`

**解决：**
```
1. 重启AI客户端（启动MCP服务器）
2. 在EDA中点击：MCP Bridge → 重启服务器
3. 查看连接状态确认
```

### 问题2：工具调用失败

**检查：**
1. 确认在原理图或PCB页面
2. 查看EDA调试日志查找错误
3. 确认连接状态显示"已连接"

**解决：**
```
1. 切换到原理图页面
2. 等待3-5秒自动连接
3. 重试工具调用
```

### 问题3：放置功能报错

**错误：** `EDA 环境未就绪`

**原因：** 使用旧版本插件

**解决：**
```
1. 确认插件版本：时间 2026/7/3 23:25:22 或更新
2. 如果是旧版本，重新安装最新版
3. 重启EDA测试
```

---

## 📊 技术细节

### WebSocket协议

**消息格式：**

```typescript
// 任务请求（MCP服务器 → EDA插件）
{
  type: 'bridge/task',
  requestId: 'req_123',
  path: '/bridge/jlceda/schematic/read',
  payload: { ... }
}

// 任务结果（EDA插件 → MCP服务器）
{
  type: 'bridge/result',
  requestId: 'req_123',
  result: { ... }  // 或 error: '...'
}
```

### 页面检测

**仅在以下页面启动连接：**
- `documentType = 1` (原理图)
- `documentType = 3` (PCB)

**检测间隔：** 每秒检查一次

**延迟启动：** 插件加载后延迟3秒启动（避免阻塞EDA启动）

---

## 🎯 开发指南

### 构建MCP服务器

```bash
cd D:\jlc-assistant\JLCEDA-MCP-Server
npm install
npm run build
```

### 构建EDA插件

```bash
cd D:\jlc-assistant\JLCEDA-MCP\mcp-bridge
npm install
npm run build
# 输出：../build/jlceda-mcp-bridge-2.0.0.eext
```

### 添加新工具

1. 在MCP服务器中定义工具（`src/resources/mcp-tool-definitions.json`）
2. 在EDA插件中实现handler（`mcp-bridge/src/mcp/`）
3. 注册handler到dispatcher（`mcp-bridge/src/runtime/bridge-runtime-client.ts`）
4. 重新构建两边
5. 测试

### 代码规范

**访问EDA API的标准方式：**

```typescript
// ✅ 正确（参考 pro-api-sdk）
if (typeof eda === 'undefined' || !eda) {
    throw new Error('EDA 环境未就绪');
}
const result = eda.sch_PrimitiveComponent.getAll();

// ❌ 错误（不要使用）
const edaGlobal = (globalThis as unknown as { eda?: unknown }).eda;
```

---

## 📝 更新日志

### v2.0.0 (2026-07-03)

**重大更新：反转架构**

- ✅ MCP服务器作为WebSocket服务器
- ✅ EDA插件作为WebSocket客户端
- ✅ 移除VS Code/Cursor插件依赖
- ✅ 支持所有MCP客户端

**功能修复：**

- ✅ 修复放置功能（按pro-api-sdk标准）
- ✅ 修复页面检测（使用documentType）
- ✅ 修复状态显示（双重标记机制）
- ✅ 修复WebSocket API（使用register方法）

**新增功能：**

- ✅ 连接状态监控
- ✅ 手动重启功能
- ✅ 自动重连机制
- ✅ 延迟启动（避免阻塞）

---

## 🤝 贡献

欢迎提交Issue和Pull Request！

**项目地址：**
- MCP服务器：`D:\jlc-assistant\JLCEDA-MCP-Server`
- EDA插件：`D:\jlc-assistant\JLCEDA-MCP\mcp-bridge`

---

## 📄 许可证

本项目遵循JLCEDA EDA扩展开发协议。

---

## 🎉 致谢

- 感谢JLCEDA EDA团队提供的专业版API
- 感谢Anthropic的MCP协议规范
- 感谢所有测试和反馈的用户

---

**JLCEDA MCP Server - 让AI助手拥有硬件设计能力！** 🚀

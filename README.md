# JLCEDA MCP v2.0

> 🎉 首个支持所有 MCP 客户端的嘉立创 EDA 集成方案

将嘉立创 EDA 专业版集成到 MCP 生态系统，支持 Claude Desktop、OpenCode、Cline 等所有 MCP 客户端。

## 📐 架构设计（v2.0）

```
AI 客户端（Claude Desktop / OpenCode / Cline 等）
    ↓ stdio/JSON-RPC (MCP 协议)
原生 MCP 服务器（独立 Node.js 进程）
    • WebSocket 服务器（端口 8765）
    • 工具分发和结果转换
    ↓ WebSocket 通信
EDA Bridge 插件 v2.0（WebSocket 客户端）
    • 智能页面检测
    • 自动连接和重连
    • 执行 EDA 操作
    ↓ 全局 eda 对象
JLCEDA EDA API
```

### 🚀 创新特点

- ✅ **反转架构**：EDA 插件作为客户端，MCP 服务器作为服务端
- ✅ **支持所有 MCP 客户端**：Claude Desktop、OpenCode、Cline 等
- ✅ **无需 IDE 插件**：MCP 服务器独立运行，不依赖 VS Code/Cursor
- ✅ **智能检测**：仅在原理图/PCB 页面自动连接
- ✅ **自动重连**：连接断开自动恢复

## 📦 仓库结构

```text
JLCEDA-MCP/
├─ mcp-server/       原生 MCP 服务器（Node.js 独立进程）
├─ mcp-bridge/       EDA Bridge 插件（WebSocket 客户端）
├─ build/            构建产物输出目录（EEXT）
└─ tool/             离线文档与资源生成辅助脚本
```

**两个组件缺一不可，需要配合使用。**

---

## 🚀 快速开始

### 前置要求

- Node.js 20+
- JLCEDA EDA 专业版（最新版）
- 支持 MCP 的 AI 客户端（Claude Desktop / OpenCode / Cline 等）

### 安装步骤

#### 1. 克隆仓库

```bash
git clone https://github.com/UR-xiaoyang/JLCEDA-MCP.git
cd JLCEDA-MCP
```

#### 2. 构建 MCP 服务器

```bash
cd mcp-server
npm install
npm run build
# 产物：dist/index.js
```

#### 3. 构建 EDA Bridge 插件

```bash
cd ../mcp-bridge
npm install
npm run build
# 产物：../build/jlceda-mcp-bridge-2.0.0.eext
```

或者直接从 [Releases](https://github.com/UR-xiaoyang/JLCEDA-MCP/releases) 下载构建好的 `.eext` 文件。

#### 4. 安装 EDA Bridge 插件

1. 打开嘉立创 EDA → 扩展 → 扩展管理
2. 点击"从文件安装"
3. 选择 `build/jlceda-mcp-bridge-2.0.0.eext`
4. 重启 EDA

#### 5. 配置 MCP 客户端

**Claude Desktop 配置**：

编辑 `%APPDATA%\Claude\claude_desktop_config.json` (Windows) 或 
`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)：

```json
{
  "mcpServers": {
    "jlceda": {
      "command": "node",
      "args": ["D:\\path\\to\\JLCEDA-MCP\\mcp-server\\dist\\index.js"],
      "env": {
        "JLCEDA_BRIDGE_PORT": "8765"
      }
    }
  }
}
```

**OpenCode 配置**：

编辑 `~/.config/opencode/opencode.json`：

```json
{
  "mcp": {
    "jlceda": {
      "command": ["node", "D:\\path\\to\\JLCEDA-MCP\\mcp-server\\dist\\index.js"],
      "enabled": true,
      "type": "local",
      "env": {
        "JLCEDA_BRIDGE_PORT": "8765"
      }
    }
  }
}
```

#### 6. 启动使用

1. 启动 AI 客户端（如 Claude Desktop）→ MCP 服务器自动启动
2. 打开嘉立创 EDA，切换到原理图或 PCB 页面 → EDA 插件自动连接
3. 在 AI 客户端中开始对话，使用 JLCEDA 工具

---

## 🛠️ 可用工具

### 基础工具

| 工具                   | 说明                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `jlceda_eda_context` | 获取 EDA 环境信息（当前项目、文档类型） |
| `jlceda_schematic_read`   | 读取当前原理图的完整电路语义快照，返回器件列表、引脚→网络名映射、网络连接关系与 DRC 检查结果 |
| `jlceda_schematic_review` | 读取全工程所有原理图页面的网表文件，覆盖多页电路，适合全局审查、BOM 核查与跨页信号追踪       |
| `jlceda_component_select` | 在 EDA 系统库中搜索候选器件，返回候选列表供 AI 选择                |
| `jlceda_component_place_auto`  | 自动放置器件到指定坐标                         |
| `jlceda_netlabel_place`   | 在指定器件引脚位置放置网络标签，通过网络标签代替导线实现电气连接，自动识别电源/地符号类型     |
| `jlceda_netlabel_modify`  | 修改已放置的网络标签名称，支持按引脚位置或图元 ID 查找并修改                      |

### 自动化工具

| 工具                   | 说明                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `jlceda_auto_wire_connect` | 自动连线功能，按网络名连接引脚 |
| `jlceda_schematic_auto_layout` | 原理图自动布局，优化器件位置 |
| `jlceda_schematic_auto_routing` | 原理图自动布线，自动连接导线 |

### 高级工具

| 工具           | 说明                                                                |
| ------------ | ------------------------------------------------------------------- |
| `jlceda_api_index`  | 列出所有可用的 EDA API 模块名称，用于浏览 API 命名空间全貌               |
| `jlceda_api_search` | 按关键词搜索具体 API 方法及其参数说明，便于 AI 定位所需接口           |
| `jlceda_api_invoke` | 直接调用任意 EDA API 并将结果透传给 AI，适用于核心工具未覆盖的定制化任务           |

---

## 💡 使用说明

1. **启动流程**：
   - 先启动 MCP 客户端（如 Claude Desktop）→ MCP 服务器自动启动
   - 打开嘉立创 EDA，切换到原理图或 PCB 页面 → EDA 插件自动连接

2. **推荐使用网络标签连接**：AI 会使用 `jlceda_netlabel_place` 在器件引脚位置放置网络标签（如 VCC、GND、信号名等），通过相同网络名实现电气连接，避免绘制复杂导线路径。电源/地符号会自动识别并放置。

3. **连接状态查看**：在 EDA 中点击菜单 **MCP Bridge → 连接状态**，查看连接详情和统计信息。

4. **调试日志**：如遇问题，点击 **MCP Bridge → 查看调试日志** 排查。

---

## 💬 使用示例

### 示例 1：读取原理图

**对话：**
```
请帮我读取当前原理图
```

**AI 返回：**
```
✅ 原理图信息：
- 器件数量：8 个
- 器件列表：
  • DC1: 电源插座 (DC-005.1)
  • C1-C3: 钽电容 (100uF)
  • U1-U2: 电源模块
  • U3: ESP32-WROOM-32E
  • U4: CH340G USB 转串口
- DRC 检查：未通过（有未连接的引脚）
```

### 示例 2：搜索并放置器件

**对话：**
```
帮我搜索 STM32F103C8T6 芯片，然后放置到坐标 (3000, 3000)
```

**AI 执行：**
1. 搜索 STM32F103C8T6
2. 显示候选列表
3. 选择合适的型号
4. 放置到指定位置

### 示例 3：电路分析

**对话：**
```
分析当前原理图的电路功能
```

**AI 返回详细的电路分析和改进建议。**

---

## 📝 注意事项

1. **必须同时安装**：MCP 服务器和 EDA Bridge 插件必须配合使用。
2. **端口配置**：默认使用端口 8765，如需修改需在两边同步更新。
3. **页面检测**：仅在原理图（documentType=1）或 PCB（documentType=3）页面自动连接。
4. **连接异常**：如遇连接问题，可点击 **MCP Bridge → 重启服务器** 手动重连。
5. **多页面场景**：同时打开多个 EDA 页面时，只有活动页面会连接，属正常现象。

---

## 🔍 故障排除

### 问题 1：EDA 插件显示"未连接"

**检查：**
1. 确认 MCP 服务器正在运行
2. 检查端口 8765 是否被占用：`netstat -ano | findstr 8765`
3. 查看 EDA 调试日志：**MCP Bridge → 查看调试日志**

**解决：**
1. 重启 AI 客户端（启动 MCP 服务器）
2. 在 EDA 中点击：**MCP Bridge → 重启服务器**
3. 查看连接状态确认

### 问题 2：工具调用失败

**检查：**
1. 确认在原理图或 PCB 页面
2. 查看 EDA 调试日志查找错误
3. 确认连接状态显示"已连接"

**解决：**
1. 切换到原理图页面
2. 等待 3-5 秒自动连接
3. 重试工具调用

---

## 🎯 v2.0 更新日志

### 架构变更

- ✅ **反转架构**：MCP 服务器作为 WebSocket 服务端，EDA 插件作为客户端
- ✅ **移除 mcp-hub**：不再需要 VS Code/Cursor 扩展
- ✅ **支持所有 MCP 客户端**：Claude Desktop、OpenCode、Cline 等
- ✅ **统一仓库**：MCP 服务器和 EDA 插件放在同一仓库，缺一不可

### 新增功能

- ✅ `netlabel_place` / `netlabel_modify` - 网络标签放置和修改
- ✅ `auto_wire_connect` - 自动连线
- ✅ `schematic_auto_layout` - 自动布局
- ✅ `schematic_auto_routing` - 自动布线  
- ✅ `component_place_auto` - 自动放置器件
- ✅ 连接状态监控和手动重启
- ✅ 智能页面检测
- ✅ 自动重连机制

### 修复问题

- ✅ 修复器件放置功能（按 pro-api-sdk 标准）
- ✅ 修复页面检测（使用 documentType）
- ✅ 修复状态显示（双重标记机制）
- ✅ 修复 WebSocket API（使用 register 方法）

---

## 🛠️ 开发说明

### 开发环境要求

- Node.js 20+
- npm
- 嘉立创 EDA 专业版

### 本地开发

**开发 MCP 服务器：**

```bash
cd mcp-server
npm install
npm run build
```

**开发 EDA Bridge 插件：**

```bash
cd mcp-bridge
npm install
npm run build
```

### 添加新工具

1. 在 MCP 服务器中定义工具（`mcp-server/src/resources/mcp-tool-definitions.json`）
2. 在 EDA 插件中实现 handler（`mcp-bridge/src/mcp/`）
3. 注册 handler 到 dispatcher
4. 重新构建两边
5. 测试

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

本项目采用 [Apache License 2.0](LICENSE) 许可证。

---

## 🎉 致谢

- 感谢嘉立创 EDA 团队提供的专业版 API
- 感谢 Anthropic 的 MCP 协议规范
- 感谢所有测试和反馈的用户
- 基于 [sengbin/JLCEDA-MCP](https://github.com/sengbin/JLCEDA-MCP) 项目进行重大架构改进

---

**JLCEDA MCP - 让 AI 助手拥有硬件设计能力！** 🚀

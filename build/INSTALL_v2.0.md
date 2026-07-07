# 🎉 JLCEDA MCP 2.0 - 安装指南

## 📦 新版插件

**文件名：** `jlceda-mcp-bridge-2.0.0.eext`  
**位置：** `D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-2.0.0.eext`  
**版本：** 2.0.0（服务器模式）  
**大小：** 4.2 MB  
**构建时间：** 2026年7月3日 15:28

---

## 🎯 主要变化

### 从客户端到服务器
```
旧版 1.x：EDA插件 → 连接到 → mcp-hub
新版 2.0：EDA插件 ← 接收来自 ← MCP服务器
```

### 核心改动
- ✅ **WebSocket服务器模式** - 监听端口8765
- ❌ **移除客户端连接** - 不再连接mcp-hub
- ❌ **移除复杂协议** - 握手、心跳、角色系统
- ✅ **保留所有功能** - 11个工具handler完整保留
- ✅ **简化配置** - 无需配置连接地址

---

## 📥 安装步骤

### 1. 打开JLCEDA EDA Professional

### 2. 进入扩展管理器
- 菜单：**扩展 → 扩展管理**

### 3. 安装插件
- 点击 **"从文件安装"** 或 **"安装本地扩展"**
- 选择文件：`D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-2.0.0.eext`
- 点击安装

### 4. 重启EDA
- 如果提示重启，请重启JLCEDA EDA

### 5. 验证安装
启动EDA后，应该看到提示：
```
✅ MCP Bridge服务器已启动 (端口:8765)
```

---

## 🧪 测试流程

### 完整测试步骤

1. **启动JLCEDA EDA**
   - 插件会自动启动
   - 看到提示：`MCP Bridge服务器已启动`

2. **启动OpenCode**
   - OpenCode已配置为自动启动MCP服务器

3. **测试对话**
   ```
   你：读取当前原理图
   AI：[调用schematic_read工具并分析]
   
   你：搜索STM32F103
   AI：[调用component_select工具搜索]
   ```

### 预期MCP服务器日志

OpenCode的输出窗口应该显示：
```
JLCEDA MCP Server v2.0.0
Connecting to EDA bridge at ws://127.0.0.1:8765/bridge/ws...
Connected to EDA bridge ✅
MCP Server started successfully
Listening on stdio for JSON-RPC requests
```

---

## 🏗️ 最终架构

```
┌─────────────────────────┐
│   OpenCode (AI客户端)    │
└────────────┬────────────┘
             │ stdio/JSON-RPC
             ↓
┌─────────────────────────┐
│   JLCEDA MCP Server     │
│   (Node.js独立进程)      │
│   无需IDE插件 ✅         │
└────────────┬────────────┘
             │ WebSocket
             │ ws://127.0.0.1:8765/bridge/ws
             ↓
┌─────────────────────────┐
│   EDA插件 v2.0          │
│   WebSocket服务器 ✅     │
│   (本文件)              │
└────────────┬────────────┘
             │ 全局eda对象
             ↓
┌─────────────────────────┐
│   JLCEDA EDA API        │
└─────────────────────────┘
```

---

## ⚙️ OpenCode配置（已完成）

配置文件：`C:\Users\xiaoyang\.config\opencode\opencode.json`

```json
"jlceda": {
  "command": ["node", "D:\\jlc-assistant\\JLCEDA-MCP-Server\\dist\\index.js"],
  "enabled": true,
  "type": "local"
}
```

✅ 已自动配置完成

---

## 🛠️ 可用工具（11个）

| 工具 | 说明 |
|------|------|
| schematic_read | 读取当前原理图 |
| schematic_review | 全工程审查 |
| component_select | 搜索器件 |
| component_place | 交互式放置 |
| component_place_auto | 自动放置 |
| schematic_auto_layout | 自动布局 |
| schematic_auto_routing | 自动布线 |
| api_index | API索引 |
| api_search | API搜索 |
| eda_context | 上下文读取 |
| api_invoke | API调用 |

---

## 🐛 故障排除

### 问题1：插件启动失败

**检查：**
```powershell
# 检查8765端口是否被占用
netstat -ano | findstr 8765
```

**解决：** 关闭占用端口的程序

### 问题2：MCP服务器连接超时

**现象：** `Connection timeout`

**检查：**
1. EDA是否已启动
2. 插件是否已加载
3. 防火墙是否阻止

**解决：** 先启动EDA，等待提示出现后再启动OpenCode

### 问题3：工具调用失败

**检查：**
- 在EDA菜单中：`MCP Bridge → 查看调试日志`
- 查看是否有错误信息

---

## 📝 版本对比

| 特性 | 1.x版本 | 2.0版本 |
|------|---------|---------|
| 模式 | 客户端（连接mcp-hub） | 服务器（等待连接） |
| 需要mcp-hub | ✅ 是 | ❌ 否 |
| 需要VS Code | ✅ 是 | ❌ 否 |
| 协议复杂度 | 高（握手/心跳/角色） | 低（简单请求/响应） |
| 配置 | 需要配置连接地址 | 无需配置 |
| AI客户端兼容 | 仅VS Code/Cursor | 所有MCP客户端 ✅ |

---

## 🎊 完成清单

- ✅ MCP服务器已构建（v2.0.0）
- ✅ OpenCode已配置
- ✅ EDA插件v2.0已构建
- ✅ 文档已完成

---

**现在可以安装并测试完整流程了！** 🚀

安装此文件：
```
D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-2.0.0.eext
```

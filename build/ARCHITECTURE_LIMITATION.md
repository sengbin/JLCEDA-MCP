# ⚠️ 重要发现：架构限制

## 🚫 技术限制

**问题：**
```
MCP Bridge服务器启动失败: Failed to resolve module specifier 'ws'
```

**根本原因：**
1. ❌ EDA插件环境**不支持**动态导入Node.js模块（`import('ws')`）
2. ❌ EDA只提供 `eda.sys_WebSocket` API，但这是**客户端**API，不是服务器API
3. ❌ **无法在EDA插件中创建WebSocket服务器**

## 📊 架构对比

### 原架构（可行）✅
```
AI客户端 → VS Code插件(WebSocket服务器) → EDA插件(WebSocket客户端)
```
- ✅ VS Code插件可以使用Node.js的ws模块
- ✅ EDA插件使用 eda.sys_WebSocket 作为客户端

### 尝试的新架构（不可行）❌
```
AI客户端 → MCP服务器 → EDA插件(WebSocket服务器) ❌
```
- ❌ EDA插件无法创建WebSocket服务器
- ❌ 无法使用Node.js的ws模块

## 🎯 可行的解决方案

### 方案A：保持原架构（推荐）

回到原来的双扩展模式：
```
AI客户端 
  ↓ stdio/MCP
MCP服务器 (独立Node.js进程)
  ↓ WebSocket (作为服务器)
EDA插件 (作为客户端)
  ↓
JLCEDA EDA API
```

**特点：**
- ✅ 技术可行
- ✅ 无需IDE插件
- ✅ MCP服务器作为WebSocket服务器
- ✅ EDA插件作为WebSocket客户端连接MCP服务器

### 方案B：独立的WebSocket服务器

创建第三个独立进程：
```
AI客户端 
  ↓ stdio/MCP
MCP服务器
  ↓ HTTP/IPC
WebSocket Bridge服务器 (独立Node.js进程)
  ↓ WebSocket
EDA插件 (客户端)
  ↓
JLCEDA EDA API
```

**特点：**
- ✅ 技术可行
- ❌ 更复杂（3个进程）
- ❌ 需要额外配置

## 💡 推荐方案：方案A

### 修改内容

1. **MCP服务器** - 已经实现了WebSocket服务器功能 ✅
2. **EDA插件** - 改回客户端模式，连接到MCP服务器

### 架构图

```
┌──────────────────┐
│  AI客户端         │
│  (OpenCode等)     │
└────────┬─────────┘
         │ stdio/JSON-RPC
         ↓
┌──────────────────┐
│  MCP服务器        │
│  (Node.js)        │
│  • WebSocket服务器│ ← 监听8765端口
│  • 工具分发       │
└────────┬─────────┘
         │ WebSocket
         ↓
┌──────────────────┐
│  EDA插件          │
│  (WebSocket客户端)│ ← 连接到MCP服务器
│  • Handler执行    │
└────────┬─────────┘
         │ 全局eda对象
         ↓
┌──────────────────┐
│  JLCEDA EDA       │
└──────────────────┘
```

### 好处

- ✅ **无需VS Code/Cursor插件** - 实现了主要目标
- ✅ 技术可行 - 不违反EDA限制
- ✅ MCP服务器已实现 - 无需修改
- ✅ EDA插件改动小 - 用回原来的客户端代码

## 🔄 下一步

### 选项1：使用方案A（推荐）

我可以立即修改EDA插件，让它作为客户端连接到MCP服务器。

### 选项2：放弃纯MCP方案

继续使用原来的双扩展架构（mcp-hub + mcp-bridge）。

---

**请告诉我你的选择，我会立即实施。** 🔧

**我推荐方案A**，这样可以：
- 移除VS Code/Cursor插件 ✅
- 支持所有MCP客户端 ✅
- 技术可行 ✅

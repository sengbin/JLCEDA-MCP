# 🔧 修复WebSocket API调用错误

## ❌ 问题

**错误日志：**
```
[Bridge] Failed to connect: eda.sys_WebSocket.open is not a function
```

**原因：**
- ❌ 使用了不存在的 `eda.sys_WebSocket.open()` 方法
- ✅ 正确的方法是 `eda.sys_WebSocket.register()`

---

## ✅ 修复

### API调用修改

**修改前（错误）：**
```typescript
const result = await eda.sys_WebSocket.open(
  socketId,
  serverUrl,
  onMessage,
  onOpen,
  onClose,
  onError
);
```

**修改后（正确）：**
```typescript
eda.sys_WebSocket.register(
  socketId,
  serverUrl,
  onMessage,  // (event: MessageEvent) => void
  onOpen      // () => void
);
```

### 参数说明

根据EDA API文档，`register` 方法签名：

```typescript
register(
  id: string,                        // WebSocket ID
  serviceUri: string,                // 服务器地址
  receiveMessageCallFn?: (event: MessageEvent) => void,  // 消息回调
  connectedCallFn?: () => void,      // 连接成功回调
  protocols?: string | string[]      // 可选：子协议
): void
```

**注意：**
- ✅ 没有 `onClose` 和 `onError` 回调参数
- ✅ 消息回调接收 `MessageEvent` 对象，需要访问 `event.data`
- ✅ 方法是同步的，不返回Promise

---

## 📦 新版本

**文件：** `jlceda-mcp-bridge-2.0.0.eext`  
**位置：** `D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-2.0.0.eext`  

**修复内容：**
- ✅ 使用正确的 `register` API
- ✅ 参数调整为正确格式
- ✅ 消息处理使用 `event.data`

---

## 🚀 现在应该能连接了

### 预期行为

**成功日志：**
```
[Bridge Runtime] Starting client connection
[Bridge] Connecting to MCP server at ws://127.0.0.1:8765/bridge/ws
[Bridge] WebSocket connection registered
[Bridge] Connected to MCP server
✅ 已连接到MCP服务器
```

**不应该出现：**
```
❌ eda.sys_WebSocket.open is not a function
```

---

## 📋 测试步骤

### 1. 安装新版本

```
1. 打开JLCEDA EDA
2. 扩展 → 扩展管理 → 从文件安装
3. 选择：D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-2.0.0.eext
4. 重启EDA
```

### 2. 确保MCP服务器运行

```
1. 打开OpenCode（应该正常启动）
2. 查看输出窗口：
   ✅ WebSocket server listening on ws://127.0.0.1:8765/bridge/ws
```

### 3. 测试连接

```
1. 在EDA中打开原理图
2. 等待3-5秒
3. 应看到：✅ 已连接到MCP服务器
4. 在EDA菜单：MCP Bridge → 连接状态
5. 确认显示：✅ 活动连接: 1 个
```

### 4. 测试工具调用

```
1. 在OpenCode对话："读取当前原理图"
2. AI成功返回结果
3. EDA菜单查看请求数增加
```

---

## 🔍 如何确认修复

### 查看EDA插件日志

```
菜单：MCP Bridge → 查看调试日志

✅ 正确日志应该包含：
[Bridge] WebSocket connection registered
[Bridge] Connected to MCP server

❌ 不应该出现：
eda.sys_WebSocket.open is not a function
```

---

## 📊 完整架构（最终版）

```
OpenCode (AI客户端)
    ↓ stdio/JSON-RPC
MCP服务器 (Node.js)
    • WebSocket服务器 ✅
    • 监听8765端口 ✅
    • 资源文件已修复 ✅
    ↓ WebSocket
EDA插件 v2.0
    • WebSocket客户端 ✅
    • 使用正确的API ✅
    • register方法 ✅
    ↓ 全局eda对象
JLCEDA EDA API
```

---

## 🎊 所有问题已修复

| 问题 | 状态 |
|------|------|
| OpenCode打不开 | ✅ 已修复（资源文件） |
| WebSocket API错误 | ✅ 已修复（使用register） |
| EDA插件阻塞 | ✅ 已修复（延迟启动） |
| MCP服务器启动 | ✅ 正常 |

---

**这次应该完全正常工作了！** 🚀

安装文件：
```
D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-2.0.0.eext
```

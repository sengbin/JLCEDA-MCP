# ⚠️ 需要重新安装最新版本

## 问题分析

**日志显示：**
```
[Bridge] Failed to connect: eda.sys_WebSocket.open is not a function
```

**这说明：**
- ❌ 当前安装的是**旧版本**插件
- ❌ 还在使用错误的 `open()` 方法
- ✅ 需要重新安装**最新版本**

---

## 📦 最新版本信息

**文件：** `jlceda-mcp-bridge-2.0.0.eext`  
**位置：** `D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-2.0.0.eext`  
**更新时间：** 2026年7月3日 22:11:54  
**大小：** 4,203,878 字节  

**此版本包含：**
- ✅ 正确的 `register()` API调用
- ✅ 延迟3秒启动机制
- ✅ 非阻塞连接
- ✅ 自动重连

---

## 🔄 重新安装步骤

### 1. 卸载旧版本（可选）

```
1. 打开JLCEDA EDA
2. 扩展 → 扩展管理
3. 找到 "MCP Bridge"
4. 点击卸载或禁用
```

### 2. 安装最新版本

```
1. 扩展 → 扩展管理
2. 从文件安装
3. 选择：D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-2.0.0.eext
4. 确认安装
```

### 3. 重启EDA

```
完全关闭EDA → 重新打开
```

### 4. 验证版本

打开原理图后，查看调试日志应该看到：

**✅ 正确的日志：**
```
[Bridge] Connecting to MCP server at ws://127.0.0.1:8765/bridge/ws
[Bridge] WebSocket connection registered
[Bridge] Connected to MCP server
```

**❌ 不应该看到：**
```
eda.sys_WebSocket.open is not a function
```

---

## 🔍 如何确认版本

### 方法1：查看调试日志

```
菜单：MCP Bridge → 查看调试日志

✅ 最新版本日志：
[Bridge] WebSocket connection registered

❌ 旧版本日志：
eda.sys_WebSocket.open is not a function
```

### 方法2：查看About

```
菜单：MCP Bridge → About

应该显示版本信息
```

---

## ⏱️ 时间线对比

| 你安装的版本 | 最新版本 |
|-------------|----------|
| 可能是17:01或更早 | **22:11:54** ✅ |
| 使用open()方法 ❌ | 使用register()方法 ✅ |
| 连接失败 ❌ | 应该成功 ✅ |

---

## 🎯 预期结果

安装最新版本后：

```
1. 打开原理图
   ↓
2. 等待3-5秒
   ↓
3. ✅ 提示：已连接到MCP服务器
   ↓
4. 菜单查看：连接状态 → 活动连接: 1 个
   ↓
5. OpenCode测试："读取当前原理图"
   ↓
6. ✅ 成功返回结果
```

---

**请重新安装最新版本的插件！** 🔄

安装文件（确认是这个最新的）：
```
D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-2.0.0.eext
更新时间：2026/7/3 22:11:54
大小：4,203,878 字节
```

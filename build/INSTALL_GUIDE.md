# EDA插件构建完成

## ✅ 新版插件信息

**文件位置：**
```
D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-1.6.0.eext
```

**文件大小：** 4.2 MB  
**构建时间：** 2026年7月3日 15:23  
**版本：** 1.6.0（服务器模式）

## 🔄 主要改动

### 新增文件
1. `src/runtime/bridge-transport-server.ts` - WebSocket服务器传输层
2. `src/runtime/bridge-runtime-server.ts` - 服务器模式运行时

### 修改文件
1. `src/index.ts` - 使用新的服务器模式运行时

### 核心变化
- ❌ 移除：客户端连接逻辑（连接mcp-hub）
- ❌ 移除：握手协议（hello/welcome）
- ❌ 移除：心跳保活
- ❌ 移除：角色系统（active/standby）
- ✅ 新增：WebSocket服务器（监听端口8765）
- ✅ 保留：所有11个handler实现
- ✅ 保留：任务执行逻辑

## 📦 安装步骤

1. **打开JLCEDA EDA Professional**

2. **打开扩展管理器**
   - 菜单：扩展 → 扩展管理
   - 或快捷键

3. **安装插件**
   - 点击"从文件安装"
   - 选择：`D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-1.6.0.eext`
   - 确认安装

4. **重启EDA**（如果需要）

5. **验证启动**
   - 打开EDA后，应该看到提示：`MCP Bridge服务器已启动 (端口:8765)`
   - 如果没有看到，查看控制台是否有错误

## 🧪 测试连接

### 测试1：直接测试WebSocket服务器

可以使用工具测试WebSocket服务器是否启动：
```powershell
# 使用wscat测试（需要先安装：npm install -g wscat）
wscat -c ws://127.0.0.1:8765/bridge/ws
```

### 测试2：启动MCP服务器

1. 启动JLCEDA EDA（插件自动启动WebSocket服务器）
2. 启动OpenCode（会自动启动MCP服务器）
3. MCP服务器应该输出：
   ```
   JLCEDA MCP Server v2.0.0
   Connecting to EDA bridge at ws://127.0.0.1:8765/bridge/ws...
   Connected to EDA bridge ✅
   MCP Server started successfully
   ```

### 测试3：调用工具

在OpenCode中测试：
- "读取当前原理图"
- "搜索电阻"

## ⚠️ 注意事项

1. **端口占用**：确保8765端口未被占用
2. **启动顺序**：必须先启动EDA，再启动OpenCode
3. **防火墙**：确保本地回环连接未被阻止
4. **EDA版本**：需要JLCEDA EDA Professional
5. **Node.js**：MCP服务器需要Node.js 20+

## 🐛 故障排除

### 问题1：插件启动失败

**现象：** 没有看到启动成功提示

**排查：**
1. 查看EDA控制台错误
2. 检查是否有旧版插件冲突
3. 确认EDA版本兼容性

### 问题2：MCP服务器连接失败

**现象：** `Failed to connect to EDA bridge: Connection timeout`

**排查：**
1. 确认EDA已启动且插件已加载
2. 使用 `netstat -ano | findstr 8765` 检查端口
3. 查看EDA插件日志

### 问题3：工具调用超时

**现象：** 工具调用一直等待

**排查：**
1. 查看EDA插件调试日志
2. 确认handler是否正常执行
3. 检查WebSocket连接状态

## 📊 架构确认

```
OpenCode (AI客户端)
    ↓ stdio/JSON-RPC
MCP服务器 (Node.js)
    ↓ WebSocket (ws://127.0.0.1:8765/bridge/ws)
EDA插件 (新版服务器模式) ✅
    ↓ 全局eda对象
JLCEDA EDA API
```

---

**下一步：** 在JLCEDA EDA中安装此插件，然后测试完整流程！

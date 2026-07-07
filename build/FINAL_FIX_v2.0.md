# 🔧 EDA插件 v2.0 - 最终修复版

## ✅ 完全移除 sys_Context

**问题：**
```
TypeError: Cannot read properties of undefined (reading 'getActivePageType')
```

**原因：**
- `eda.sys_Context` 不存在
- 代码中多处调用了 `sys_Context.getActivePageType()`

**解决：**
- ✅ 完全移除所有 `sys_Context` 调用
- ✅ 只使用 `dmt_SelectControl.getCurrentDocumentInfo()`
- ✅ 只检查 `documentType` 枚举值（1=原理图，3=PCB）

---

## 📦 最终版本

**文件：** `jlceda-mcp-bridge-2.0.0.eext`  
**位置：** `D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-2.0.0.eext`

---

## 🔍 修复的代码位置

### 1. isValidPageType() - 同步检测

```typescript
function isValidPageType(): boolean {
  try {
    // 只使用 getCurrentDocumentInfo
    const docInfo = eda.dmt_SelectControl.getCurrentDocumentInfo();
    if (docInfo && docInfo.documentType !== undefined) {
      return [1, 3].includes(docInfo.documentType);
    }
    return false;
  } catch (e) {
    return false;
  }
}
```

### 2. isValidPageTypeAsync() - 异步检测

```typescript
async function isValidPageTypeAsync(): Promise<boolean> {
  try {
    const docInfo = await eda.dmt_SelectControl.getCurrentDocumentInfo();
    return docInfo && [1, 3].includes(docInfo.documentType);
  } catch (e) {
    return false;
  }
}
```

### 3. startServer() - 移除调试日志

```typescript
function startServer(): void {
  // 之前：debugLog('Starting server (page type: ' + eda.sys_Context.getActivePageType() + ')');
  // 现在：debugLog('[Bridge Runtime] Starting server');
}
```

---

## 🧪 测试步骤

### 1. 安装新版本

```
扩展 → 扩展管理 → 从文件安装
→ jlceda-mcp-bridge-2.0.0.eext
→ 重启EDA
```

### 2. 测试启动

```
1. 打开原理图文件
   ↓
   ✅ 应该看到：MCP Bridge服务器已启动
```

### 3. 测试重启

```
1. 在原理图页面
2. 菜单：MCP Bridge → 重启服务器
   ↓
   ✅ 应该成功重启
   ❌ 不应该再出现 TypeError
```

### 4. 测试页面切换

```
1. 从原理图切换到Home
   ↓
   ⚠️ 服务器自动停止
   
2. 从Home切换回原理图
   ↓
   ✅ 服务器自动启动
```

---

## 📊 检测逻辑流程

```
检查页面类型
    ↓
调用 getCurrentDocumentInfo()
    ↓
获取 documentType 值
    ↓
    ├─ documentType = 1 → ✅ 原理图，启动服务器
    ├─ documentType = 3 → ✅ PCB，启动服务器
    └─ 其他值 → ❌ 不启动
```

---

## 🎯 预期行为

### ✅ 正常情况

| 页面类型 | documentType | 服务器状态 |
|---------|--------------|-----------|
| 原理图 | 1 | ✅ 启动 |
| PCB | 3 | ✅ 启动 |
| Home | -1 | ❌ 停止 |
| 工程 | 5 | ❌ 停止 |
| 元件符号 | 2 | ❌ 停止 |

### ✅ 重启功能

- **在原理图/PCB：** 正常重启
- **在其他页面：** 提示当前文档类型

---

## 🐛 如果仍有问题

### 查看调试日志

```
菜单：MCP Bridge → 查看调试日志

查找关键信息：
[Bridge Runtime] Document type (async): 1
[Bridge Runtime] Document type (sync): 1
[Bridge Runtime] Starting server
```

### 可能的问题

**问题1：getCurrentDocumentInfo() 返回 undefined**

可能原因：
- EDA版本过旧
- API不可用

解决：升级JLCEDA EDA到最新版

**问题2：documentType 是其他值**

可能原因：
- 文档类型不是标准原理图/PCB

解决：检查文件类型，确保是 .sch 或 .pcb 文件

---

## 📝 API参考

### getCurrentDocumentInfo()

返回值类型：
```typescript
interface IDMT_EditorDocumentItem {
  documentType: EDMT_EditorDocumentType;  // 文档类型枚举
  uuid: string;                           // 文档UUID
  tabId: string;                          // 标签页ID
  // ... 其他属性
}
```

### EDMT_EditorDocumentType 枚举

```typescript
enum EDMT_EditorDocumentType {
  HOME = -1,              // 开始页
  BLANK = 0,              // 空白
  SCHEMATIC_PAGE = 1,     // 原理图图页 ✅
  SYMBOL_COMPONENT = 2,   // 元件符号
  PCB = 3,                // PCB ✅
  PROJECT = 5,            // 工程
  // ... 其他类型
}
```

---

**这个版本彻底移除了 sys_Context，应该不会再出错了！** ✅

安装文件：
```
D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-2.0.0.eext
```

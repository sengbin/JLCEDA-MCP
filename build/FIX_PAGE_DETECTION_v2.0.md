# 🔧 EDA插件 v2.0 - 修复页面检测

## ✅ 问题根源

**发现问题：**
- ❌ 原代码使用 `eda.sys_Context.getActivePageType()`
- ❌ 但这个API可能不存在或返回值不是 `'sch'` / `'pcb'`

**正确方法：**
- ✅ 使用 `eda.dmt_SelectControl.getCurrentDocumentInfo()`
- ✅ 检查 `documentType` 属性
- ✅ `SCHEMATIC_PAGE = 1`，`PCB = 3`

## 📝 文档类型枚举

根据SDK类型定义 `EDMT_EditorDocumentType`：

| 值 | 常量名 | 说明 | 是否启动服务器 |
|----|--------|------|---------------|
| -1 | HOME | 开始页 | ❌ |
| 0 | BLANK | 空白 | ❌ |
| 1 | SCHEMATIC_PAGE | 原理图图页 | ✅ **是** |
| 3 | PCB | PCB | ✅ **是** |
| 5 | PROJECT | 工程 | ❌ |
| 2 | SYMBOL_COMPONENT | 元件符号 | ❌ |
| 12 | PCB_2D_PREVIEW | PCB 2D预览 | ❌ |
| 15 | PCB_3D_PREVIEW | PCB 3D预览 | ❌ |

## 🔄 新实现方式

### 同步检查（用于定时器）

```typescript
function isValidPageType(): boolean {
  // 方法1：尝试同步获取
  const docInfo = eda.dmt_SelectControl.getCurrentDocumentInfo();
  if (docInfo && docInfo.documentType !== undefined) {
    return [1, 3].includes(docInfo.documentType);
  }
  
  // 方法2：备用sys_Context（如果存在）
  if (eda.sys_Context?.getActivePageType) {
    const pageType = eda.sys_Context.getActivePageType();
    return pageType === 'sch' || pageType === 'pcb';
  }
  
  return false;
}
```

### 异步检查（用于重启）

```typescript
async function isValidPageTypeAsync(): Promise<boolean> {
  const docInfo = await eda.dmt_SelectControl.getCurrentDocumentInfo();
  return docInfo && [1, 3].includes(docInfo.documentType);
}
```

## 🎯 重启功能改进

现在重启服务器时会显示：

```
═══════════════════════════════
MCP Bridge 重启
═══════════════════════════════

当前不在原理图或PCB页面

当前文档类型: [具体类型]
• Home（开始页）
• Schematic Page（原理图）✅
• PCB ✅
• Project（工程）
等...

服务器将在打开原理图/PCB时自动启动。
```

## 📦 新版本信息

**文件：** `jlceda-mcp-bridge-2.0.0.eext`  
**位置：** `D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-2.0.0.eext`

## 🧪 测试步骤

### 1️⃣ 安装新版本

在JLCEDA EDA中安装此版本并重启。

### 2️⃣ 测试原理图页面

1. 打开原理图文件（.sch）
2. 应看到：`✅ MCP Bridge服务器已启动`
3. 点击：`MCP Bridge → 重启服务器`
4. 应看到：重启成功提示

### 3️⃣ 测试Home页面

1. 切换到Home页面
2. 点击：`MCP Bridge → 重启服务器`
3. 应看到：`当前文档类型: Home（开始页）`

### 4️⃣ 测试PCB页面

1. 打开PCB文件（.pcb）
2. 应看到：`✅ MCP Bridge服务器已启动`
3. 点击：`MCP Bridge → 重启服务器`
4. 应看到：重启成功提示

## ✅ 预期结果

### 在原理图/PCB页面

```
1. 打开原理图或PCB
   ↓
   ✅ Toast提示：MCP Bridge服务器已启动
   
2. 点击"重启服务器"
   ↓
   ✅ Toast提示：正在重启...
   ↓
   ✅ Toast提示：MCP Bridge服务器已启动
   
3. 查看连接状态
   ↓
   ✅ 显示：服务器运行中
```

### 在其他页面

```
1. 在Home页面
   ↓
   ❌ 没有启动提示（正常）
   
2. 点击"重启服务器"
   ↓
   ℹ️ 弹窗显示：当前文档类型: Home（开始页）
   
3. 打开原理图
   ↓
   ✅ 自动启动服务器
```

## 🔍 调试日志

如果仍有问题，查看调试日志：

```
菜单：MCP Bridge → 查看调试日志

查找：
[Bridge Runtime] Document type (async): 1
[Bridge Runtime] Document type (sync): 1
[Bridge Runtime] Page type (sys_Context): sch
```

## 📊 改进对比

| 方法 | 旧版本 | 新版本 |
|------|--------|--------|
| API | `sys_Context.getActivePageType()` ❌ | `dmt_SelectControl.getCurrentDocumentInfo()` ✅ |
| 检测值 | `'sch'` / `'pcb'` | `1` / `3` (枚举值) |
| 可靠性 | 低（API可能不存在） | 高（标准API） |
| 备用方案 | 无 | 有（双重检测） |
| 错误提示 | 模糊 | 详细（显示具体类型） |

---

**这个版本应该能正确检测页面类型了！** ✅

文件位置：
```
D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-2.0.0.eext
```

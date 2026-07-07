# JLCEDA MCP 用户使用指南

> 本指南面向初次使用 JLCEDA MCP 的用户，提供从安装到实际使用的完整教程。

## 目录

- [什么是 JLCEDA MCP](#什么是-jlceda-mcp)
- [安装步骤](#安装步骤)
- [配置 MCP 客户端](#配置-mcp-客户端)
- [验证安装](#验证安装)
- [使用示例](#使用示例)
- [常见问题](#常见问题)
- [故障排查](#故障排查)

---

## 什么是 JLCEDA MCP

JLCEDA MCP 是一套让 AI 助手（如 GitHub Copilot、Cursor Chat）能够直接操作嘉立创 EDA 的工具系统。

### 工作原理

```
你的问题
   ↓
AI 助手（Copilot/Cursor）
   ↓
MCP Hub（VS Code/Cursor 扩展）← 桥接服务器
   ↓
MCP Bridge（嘉立创 EDA 扩展）
   ↓
嘉立创 EDA 执行操作
```

### 为什么需要两个扩展？

- **MCP Hub**：安装在 VS Code/Cursor 中，负责接收 AI 的指令并转发
- **MCP Bridge**：安装在嘉立创 EDA 中，负责实际执行 EDA 操作

两个扩展通过 WebSocket 连接，缺一不可。

### 能做什么？

- 📖 **读取原理图**：分析当前电路的器件、连接关系、DRC 检查结果
- 🔍 **审查整个工程**：检查所有原理图页面的网表、BOM、跨页信号
- 🔧 **选择器件**：让 AI 在 EDA 库中搜索合适的器件，由你确认
- 📌 **放置器件**：AI 引导你在原理图中放置器件
- ⚙️ **高级功能**：直接调用 EDA 底层 API（需开启）

---

## 安装步骤

### 第一步：安装 MCP Hub（VS Code/Cursor）

#### 方式一：从扩展商店安装（推荐）

**VS Code 用户：**
1. 打开 VS Code
2. 点击左侧活动栏的扩展图标（或按 `Ctrl+Shift+X`）
3. 搜索 "JLCEDA MCP Hub"
4. 点击安装

**Cursor 用户：**
1. 打开 Cursor
2. 点击左侧活动栏的扩展图标
3. 搜索 "JLCEDA MCP Hub"
4. 点击安装

#### 方式二：从 VSIX 文件安装

如果扩展商店找不到，可以从 [GitHub Releases](https://github.com/sengbin/JLCEDA-MCP/releases) 下载 `.vsix` 文件：

1. 下载最新的 `jlceda-mcp-hub-x.x.x.vsix`
2. 在 VS Code/Cursor 中打开命令面板（`Ctrl+Shift+P`）
3. 输入 "Install from VSIX"
4. 选择下载的文件

### 第二步：安装 MCP Bridge（嘉立创 EDA）

1. 打开嘉立创 EDA 专业版
2. 点击顶部菜单 **扩展 > 扩展管理器**
3. 在搜索框输入 "MCP Bridge"
4. 找到扩展后点击 **安装**
5. 安装完成后，点击 **设置** 按钮

### 第三步：检查连接地址

安装完成后，需要确认两个扩展的连接地址一致：

**在 VS Code/Cursor 中：**
1. 点击左侧活动栏的 JLCEDA 图标
2. 查看侧边栏顶部显示的桥接地址，默认是：
   ```
   ws://127.0.0.1:8765/bridge/ws
   ```

**在嘉立创 EDA 中：**
1. 打开 **扩展 > 扩展管理器**
2. 找到 MCP Bridge，点击 **设置**
3. 确认桥接地址与 VS Code/Cursor 中显示的一致
4. 如果不一致，修改后点击 **保存**

---

## 配置 MCP 客户端

安装扩展后，还需要配置 AI 客户端（Copilot/Cursor）才能使用工具。

### 配置 GitHub Copilot（VS Code）

如果你使用 VS Code 的 GitHub Copilot：

1. 打开 VS Code 设置（`Ctrl+,`）
2. 搜索 "github.copilot.chat.localhostAccess"
3. 确保该选项为 **启用**（Enable）

或者，打开命令面板（`Ctrl+Shift+P`），运行：
```
GitHub Copilot: Enable Local Server Access
```

### 配置 Cursor Chat

Cursor 默认支持 MCP 协议，但需要确保：

1. Cursor 版本 >= 0.42（建议更新到最新版）
2. 打开 Cursor 设置（`Ctrl+,`）
3. 搜索 "MCP"，确保 "Enable MCP" 选项已勾选

### 首次使用时信任 MCP 服务

当你第一次在聊天中使用 MCP 工具时，会弹出提示：

```
是否信任此 MCP 服务？
```

点击 **信任** 或 **Trust**，否则工具无法使用。

---

## 验证安装

完成安装和配置后，让我们验证一切正常：

### 1. 检查扩展状态

**在 VS Code/Cursor 中：**
- 点击左侧 JLCEDA 图标
- 侧边栏应显示 "等待连接" 或类似状态

**在嘉立创 EDA 中：**
- 打开任意原理图或 PCB 项目
- 打开 **扩展 > 扩展管理器 > MCP Bridge > 设置**
- 应该看到连接状态：
  - ✅ "已连接" - 说明连接成功
  - ⚠️ "连接中" - 正在尝试连接
  - ❌ "连接失败" - 需要排查问题

### 2. 测试工具调用

在 VS Code/Cursor 的聊天窗口中输入：

```
请读取当前原理图的电路信息
```

如果一切正常，AI 会：
1. 调用 `schematic_read` 工具
2. 返回当前原理图的器件列表、网络连接等信息

如果看不到工具调用，请查看[常见问题](#常见问题)部分。

---

## 使用示例

以下是实际使用场景和对话示例：

### 示例 1：分析当前原理图

**你的问题：**
```
帮我检查一下当前原理图，看看有没有悬空引脚或 DRC 错误
```

**AI 的操作：**
1. 调用 `schematic_read` 读取原理图
2. 分析器件连接关系
3. 检查 DRC 结果
4. 报告发现的问题

### 示例 2：添加新器件

**你的问题：**
```
我想添加一个 LED 和一个 330Ω 的限流电阻，请帮我选择合适的器件
```

**AI 的操作：**
1. 调用 `component_select` 搜索 LED
2. 在 VS Code/Cursor 侧边栏弹出器件选择面板
3. 你从列表中选择具体的 LED 型号
4. 重复步骤搜索电阻
5. 调用 `component_place` 引导你在原理图中放置这些器件

**注意：** 你需要手动在 EDA 中点击放置位置，AI 会在侧边栏提示当前应放置哪个器件。

### 示例 3：审查整个工程

**你的问题：**
```
这个项目有多页原理图，帮我生成完整的 BOM 清单
```

**AI 的操作：**
1. 调用 `schematic_review` 读取所有原理图页面
2. 汇总所有器件
3. 生成 BOM 清单

### 示例 4：使用高级 API（需开启）

**开启步骤：**
1. 在 VS Code/Cursor 的 JLCEDA 侧边栏
2. 点击 "功能设置"
3. 勾选 "暴露透传 EDA API 工具"

**你的问题：**
```
帮我查找 EDA 中所有跟 DRC 检查相关的 API
```

**AI 的操作：**
1. 调用 `api_search` 搜索 DRC 相关 API
2. 返回可用的 API 列表和说明

---

## 常见问题

### Q1: 聊天中看不到工具调用怎么办？

**可能原因：**
1. MCP 服务未被信任
2. 工具开关被关闭
3. 桥接连接失败

**解决方法：**
1. 在聊天窗口查看是否有信任提示，点击信任
2. 检查 Copilot/Cursor 设置中 MCP 相关选项是否启用
3. 确认嘉立创 EDA 中的连接状态为 "已连接"

### Q2: EDA 连接状态显示 "连接失败"

**可能原因：**
1. 桥接地址不匹配
2. VS Code/Cursor 未启动或 MCP Hub 扩展未加载
3. 端口被占用

**解决方法：**
1. 对比 VS Code/Cursor 和 EDA 中的桥接地址，确保完全一致
2. 确保 VS Code/Cursor 正在运行
3. 尝试修改端口号（例如改为 8766），两边同步修改
4. 重启 VS Code/Cursor 和嘉立创 EDA

### Q3: AI 说读不到原理图内容

**可能原因：**
1. 当前页面不是原理图或 PCB
2. 桥接连接未建立
3. 项目未打开

**解决方法：**
1. 确保在嘉立创 EDA 中打开了原理图或 PCB 文件
2. 检查 EDA 中的连接状态
3. 尝试切换到其他原理图页面再切回来

### Q4: 器件放置时 EDA 没反应

**可能原因：**
1. EDA 窗口未激活
2. 多个 EDA 页面同时打开，活动页面不一致

**解决方法：**
1. 点击嘉立创 EDA 窗口使其激活
2. 关闭其他 EDA 页面，只保留当前工作的页面
3. 在 EDA 的 MCP Bridge 设置页点击 "刷新连接"

### Q5: 修改了端口后还是连不上

**检查清单：**
- [ ] VS Code/Cursor 侧边栏显示的地址已更新
- [ ] EDA MCP Bridge 设置中的地址已修改并保存
- [ ] 两边的地址完全一致（包括端口号）
- [ ] 重启了 VS Code/Cursor
- [ ] 重启了嘉立创 EDA

### Q6: 能放置器件，但电源和地符号没有添加

这是正常现象。AI **不会自动放置**电源符号（VCC、GND 等），你需要：
1. 手动在嘉立创 EDA 中添加电源和地符号
2. 手动连接器件到电源/地网络

---

## 故障排查

### 完整的排查流程

如果遇到问题，按以下顺序排查：

#### 1. 检查扩展安装

```
□ VS Code/Cursor 中已安装 JLCEDA MCP Hub
□ 嘉立创 EDA 中已安装 MCP Bridge
□ 两个扩展版本都是最新的
```

#### 2. 检查桥接连接

**在 VS Code/Cursor 中：**
- 打开 JLCEDA 侧边栏
- 查看 "连接列表" 区域是否有 EDA 客户端

**在嘉立创 EDA 中：**
- 打开 MCP Bridge 设置页
- 查看连接状态和 WebSocket 状态

#### 3. 检查 MCP 客户端配置

**Copilot 用户：**
```bash
# 检查本地服务器访问权限
设置 → 搜索 "copilot.chat.localhostAccess" → 确保启用
```

**Cursor 用户：**
```bash
# 检查 MCP 功能
设置 → 搜索 "MCP" → 确保 "Enable MCP" 已勾选
```

#### 4. 重启服务

如果上述都正常但仍有问题：

1. **重启 VS Code/Cursor**（重要）
   - 完全关闭窗口
   - 重新打开

2. **重启嘉立创 EDA**
   - 关闭所有 EDA 窗口
   - 重新打开项目

3. **重新建立连接**
   - 在 EDA 的 MCP Bridge 设置页点击 "刷新"

#### 5. 查看日志

**VS Code/Cursor 日志：**
1. 打开命令面板（`Ctrl+Shift+P`）
2. 输入 "Developer: Show Logs"
3. 选择 "Extension Host"
4. 查找 "JLCEDA" 相关的日志

**EDA 日志：**
- 在 MCP Bridge 设置页查看连接状态详情

### 端口冲突解决

如果默认端口 8765 被占用：

1. **在 VS Code/Cursor 中：**
   - 打开 JLCEDA 侧边栏
   - 点击 "功能设置"
   - 修改端口号（例如改为 8766）

2. **在嘉立创 EDA 中：**
   - 打开 MCP Bridge 设置
   - 将桥接地址改为 `ws://127.0.0.1:8766/bridge/ws`
   - 点击保存

3. **重启两边的程序**

---

## 进阶技巧

### 1. 自动关闭侧边栏

如果你觉得侧边栏占用空间：

1. 在 VS Code/Cursor 的 JLCEDA 侧边栏
2. 点击 "功能设置"
3. 勾选 "打开 EDA 时关闭侧边栏"

这样，当你打开 EDA 或完成器件操作后，侧边栏会自动收起。

### 2. 使用透传 API

如果你熟悉嘉立创 EDA 的 API，可以让 AI 直接调用：

1. 在侧边栏功能设置中开启 "暴露透传 EDA API 工具"
2. 询问 AI：
   ```
   列出所有跟原理图相关的 API
   ```
3. AI 会使用 `api_index` 和 `api_search` 查找
4. 然后可以用 `api_invoke` 调用具体的 API

### 3. 多页原理图工作流

对于复杂项目：

```
请帮我检查整个工程的以下问题：
1. 是否有未连接的引脚
2. 电源网络是否正确
3. 生成完整的 BOM 清单
```

AI 会自动使用 `schematic_review` 读取所有页面。

---

## 反馈与支持

如果遇到问题或有建议：

- **项目地址**：https://github.com/sengbin/JLCEDA-MCP
- **QQ 交流群**：9041389
- **提交 Issue**：https://github.com/sengbin/JLCEDA-MCP/issues
- **观看视频教程**：https://www.bilibili.com/video/BV11QwuzxEDy/

---

## 版本要求

- **Node.js**: 20+（仅开发时需要）
- **VS Code**: 1.105+
- **Cursor**: 0.42+（建议最新版）
- **嘉立创 EDA**: 专业版

---

## 更新日志

查看各版本的更新内容：
- [mcp-hub CHANGELOG](./mcp-hub/CHANGELOG.md)
- [mcp-bridge CHANGELOG](./mcp-bridge/CHANGELOG.md)

---

## 许可证

本项目采用 [Apache License 2.0](LICENSE) 许可证。

# 🚀 JLCEDA MCP 快速开始

> 5分钟内开始使用JLCEDA EDA的AI集成

---

## 📋 准备工作

### 需要的软件

- ✅ Node.js 20+ 
- ✅ JLCEDA EDA 专业版
- ✅ OpenCode / Claude Desktop / Cline（任选一个）

---

## 🎯 三步安装

### 第1步：安装EDA插件 (2分钟)

1. **下载插件文件**
   ```
   D:\jlc-assistant\JLCEDA-MCP\build\jlceda-mcp-bridge-2.0.0.eext
   ```

2. **安装到EDA**
   - 打开JLCEDA EDA
   - 菜单：`扩展 → 扩展管理`
   - 点击：`从文件安装`
   - 选择上述文件
   - 重启EDA

3. **验证安装**
   - 打开任意原理图
   - 应该看到Toast提示：`✅ 已连接到MCP服务器`

---

### 第2步：配置MCP客户端 (2分钟)

**OpenCode配置：**

编辑 `C:\Users\你的用户名\.config\opencode\opencode.json`

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

编辑 `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

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

💡 **提示：** 路径改为你实际的安装路径

---

### 第3步：开始使用 (1分钟)

1. **启动流程**
   ```
   打开JLCEDA EDA → 打开原理图 → 启动AI客户端
   ```

2. **测试连接**
   
   在AI客户端中对话：
   ```
   请读取当前原理图
   ```

3. **成功标志**
   
   AI能返回原理图信息 = 安装成功！ 🎉

---

## 💬 快速示例

### 示例1：读取原理图

**你说：**
```
读取当前原理图
```

**AI返回：**
```
✅ 原理图信息
- 器件数：8个
- 包含：ESP32、CH340G、电源模块
```

---

### 示例2：搜索器件

**你说：**
```
搜索STM32F103C8T6芯片
```

**AI返回：**
```
找到3个候选：
1. STM32F103C8T6 (C8734)
   - 制造商：ST意法半导体
   - 封装：LQFP-48
```

---

### 示例3：放置器件

**你说：**
```
放置一个0.1uF电容到坐标(2000, 2000)
```

**AI返回：**
```
✅ 成功放置
- 器件：0.1uF电容
- 位置：(2000, 2000)
```

---

## 🔍 验证连接

### 在EDA中检查

**菜单：** `MCP Bridge → 连接状态`

**应该显示：**
```
✅ 客户端运行中
✅ 已连接到MCP服务器
```

**如果显示未连接：**
1. 确认AI客户端已启动
2. 点击：`MCP Bridge → 重启服务器`
3. 查看调试日志排查问题

---

## ⚠️ 常见问题

### Q1: 提示"未连接"？

**A:** 
1. 确认在原理图或PCB页面（不是Home页面）
2. 等待3-5秒自动连接
3. 重启AI客户端

---

### Q2: 工具调用失败？

**A:**
1. 检查EDA连接状态
2. 查看调试日志：`MCP Bridge → 查看调试日志`
3. 尝试重启：`MCP Bridge → 重启服务器`

---

### Q3: 端口被占用？

**A:**
```bash
# 查看占用端口的进程
netstat -ano | findstr 8765

# 结束占用的进程
taskkill /PID <进程ID> /F
```

---

## 🎯 下一步

### 学习更多

- 📖 [完整文档](./README.md)
- 🛠️ [可用工具列表](./README.md#可用工具)
- 💬 [更多示例](./README.md#使用示例)

### 尝试高级功能

- 🎨 自动布局器件
- 🔌 自动连线
- 📊 电路分析
- 🔍 API透传

---

## 📞 获取帮助

遇到问题？

1. 查看 [故障排除](./README.md#故障排除)
2. 查看EDA调试日志
3. 提交Issue

---

**开始你的AI辅助硬件设计之旅！** 🚀

配置好后，只需对AI说话，就能操作JLCEDA EDA！

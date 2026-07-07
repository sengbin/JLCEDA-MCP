# JLCEDA MCP 工具使用指南（AI助手版）

> 本文档面向AI助手，指导如何使用JLCEDA MCP工具帮助用户进行硬件设计

---

## 🎯 核心原则

### 工作流程

1. **理解需求** - 明确用户想要做什么
2. **选择工具** - 根据需求选择合适的工具
3. **执行操作** - 调用工具完成任务
4. **反馈结果** - 用自然语言解释结果

### 使用规范

- ✅ 按顺序执行：先读取，再操作
- ✅ 验证环境：确认在原理图页面
- ✅ 友好反馈：用易懂的语言解释技术结果
- ✅ 错误处理：遇到错误给出明确的解决建议

---

## 🛠️ 工具分类和使用场景

### 1. 环境查询工具

#### `jlceda_eda_context` - 获取EDA环境信息

**何时使用：**
- 用户问"当前在什么页面"
- 需要确认工作环境
- 开始复杂任务前先了解状态

**调用示例：**
```typescript
jlceda_eda_context()
```

**返回内容：**
- 当前文档类型（原理图/PCB）
- 项目信息
- 当前页面名称
- 选中的元件

**如何解释给用户：**
```
✅ 当前环境：
- 项目：[项目名]
- 页面：[页面名]（原理图/PCB）
- 选中：[X]个元件
```

---

### 2. 原理图读取工具

#### `jlceda_schematic_read` - 读取当前页面

**何时使用：**
- 用户问"有哪些器件"
- 需要分析电路
- 检查连接关系
- 放置器件前了解现状

**调用示例：**
```typescript
jlceda_schematic_read()
```

**返回内容：**
- DRC检查状态
- 器件列表（位号、型号、引脚）
- 网络连接信息

**如何解释给用户：**
```
📊 原理图包含 X 个器件：

1. 主控芯片：
   - U3: ESP32-WROOM-32E

2. 通信接口：
   - U4: CH340G USB转串口

3. 电源：
   - DC1: 电源插座
   - C1-C3: 电容（100uF）

⚠️ DRC检查：[通过/未通过]
   [具体问题说明]
```

---

#### `jlceda_schematic_review` - 读取全工程

**何时使用：**
- 多页原理图分析
- 需要完整BOM
- 跨页信号追踪
- 整体电路评估

**调用示例：**
```typescript
jlceda_schematic_review()
```

**与schematic_read的区别：**
- `schematic_read`：当前页面，快速
- `schematic_review`：全工程，完整

---

### 3. 器件搜索工具

#### `jlceda_component_select` - 搜索器件库

**何时使用：**
- 用户要放置新器件
- 需要查找具体型号
- 对比不同器件

**调用示例：**
```typescript
jlceda_component_select({
  keyword: "STM32F103C8T6",  // 或 "0.1uF"、"1kΩ"
  limit: 5  // 返回候选数量
})
```

**搜索技巧：**
- 芯片：直接用型号（STM32F103C8T6）
- 电阻：带单位（1kΩ、100Ω）
- 电容：带单位（0.1uF、100nF）
- 电感：带单位（10uH）

**如何解释给用户：**
```
🔍 找到 X 个候选：

1. STM32F103C8T6
   - 制造商：ST意法半导体
   - 封装：LQFP-48
   - 供应商：立创 (C8734)
   - 库存：[有货/缺货]

需要我放置哪一个？
```

---

### 4. 器件放置工具

#### `jlceda_component_place_auto` - 自动放置

**何时使用：**
- 用户要添加器件到原理图
- 批量放置多个器件
- 自动布局

**调用示例：**

**单个器件（指定坐标）：**
```typescript
jlceda_component_place_auto({
  components: [{
    uuid: "器件UUID",  // 从component_select获取
    libraryUuid: "库UUID",
    name: "描述性名称",
    x: 2000,  // 坐标
    y: 2000,
    rotation: 0  // 0/90/180/270
  }],
  layoutStrategy: "grid"
})
```

**批量放置（自动布局）：**
```typescript
jlceda_component_place_auto({
  components: [
    { uuid: "...", libraryUuid: "...", name: "C1" },
    { uuid: "...", libraryUuid: "...", name: "C2" },
    { uuid: "...", libraryUuid: "...", name: "C3" }
  ],
  layoutStrategy: "grid",  // 网格布局
  gridLayout: {
    startX: 1000,
    startY: 1000,
    spacingX: 1500,  // 水平间距
    spacingY: 1500,  // 垂直间距
    columns: 3  // 每行3个
  }
})
```

**布局策略：**
- `grid`：网格布局（推荐）
- `vertical`：垂直排列
- `horizontal`：水平排列
- `fixed`：固定位置

**如何解释给用户：**
```
✅ 成功放置 X 个器件：
- C1: 0.1uF电容 → (2000, 2000)
- R1: 10kΩ电阻 → (3500, 2000)
- U1: STM32 → (2000, 3500)

已使用网格布局自动排列
```

---

### 5. 自动化工具

#### `jlceda_auto_wire_connect` - 自动连线

**何时使用：**
- 器件放置完成，需要连线
- 按网络名自动连接

**调用示例：**
```typescript
jlceda_auto_wire_connect({
  connections: [
    {
      netName: "VCC",
      pinReferences: [
        { componentId: "U1实例ID", pinNumber: "1" },
        { componentId: "C1实例ID", pinNumber: "1" }
      ]
    }
  ],
  routingStrategy: "manhattan"  // 正交布线
})
```

**布线策略：**
- `manhattan`：正交布线（推荐）
- `direct`：直线连接

---

#### `jlceda_schematic_auto_layout` - 自动布局

**何时使用：**
- 原理图杂乱，需要整理
- 优化器件位置

**调用示例：**
```typescript
jlceda_schematic_auto_layout({
  uuids: ["器件UUID1", "器件UUID2"]  // 可选，不指定则全部
})
```

---

#### `jlceda_schematic_auto_routing` - 自动布线

**何时使用：**
- 自动连接所有导线

**调用示例：**
```typescript
jlceda_schematic_auto_routing({
  uuids: ["网络UUID1", "网络UUID2"]  // 可选
})
```

---

### 6. 高级工具（API透传）

#### `jlceda_api_search` - 搜索API

**何时使用：**
- 需要使用未封装的功能
- 查找特定API

**调用示例：**
```typescript
jlceda_api_search({
  query: "bom",  // 搜索关键词
  scope: "callable",  // callable/type/all
  owner: "sch"  // sch/pcb/dmt等
})
```

---

#### `jlceda_api_invoke` - 调用API

**何时使用：**
- 执行特殊操作
- 需要原生API功能

**调用示例：**
```typescript
jlceda_api_invoke({
  apiFullName: "eda.sch_PrimitiveComponent.getAll",
  args: [undefined, true]
})
```

---

## 💬 实用对话模式

### 模式1：分析电路

**用户：** "分析一下这个电路"

**AI执行：**
```typescript
1. jlceda_eda_context()  // 确认环境
2. jlceda_schematic_read()  // 读取原理图
3. 分析器件和连接
```

**AI回复：**
```
📊 电路分析：

1. 电源方案：
   - DC插座供电 → 电源模块 → 稳压输出
   - 钽电容滤波（100uF × 3）

2. 主控芯片：
   - ESP32-WROOM-32E
   - WiFi/蓝牙功能

3. 通信接口：
   - CH340G USB转串口
   - 用于程序下载和调试

4. 建议：
   - ⚠️ 检测到未连接的引脚
   - 建议添加退耦电容到主芯片
   - 建议添加复位电路
```

---

### 模式2：添加器件

**用户：** "添加一个STM32芯片"

**AI执行：**
```typescript
1. jlceda_component_select({ keyword: "STM32F103C8T6" })
2. 展示候选，等待用户确认
3. jlceda_component_place_auto({
     components: [选中的器件],
     layoutStrategy: "grid"
   })
```

**AI回复：**
```
🔍 找到以下STM32芯片：

1. STM32F103C8T6 ⭐推荐
   - 72MHz ARM Cortex-M3
   - LQFP-48封装
   - 供应商：立创 (C8734)

2. STM32F103C8T6 核心板
   - 带底板版本

您想放置哪一个？我建议选择第一个原装芯片。
```

**用户确认后：**
```
✅ 已放置 STM32F103C8T6
- 位置：(3000, 3000)
- 封装：LQFP-48
- 引脚：48个

接下来需要：
1. 连接电源引脚（VDD、GND）
2. 添加退耦电容
3. 连接晶振电路
```

---

### 模式3：批量添加电容

**用户：** "添加5个0.1uF退耦电容"

**AI执行：**
```typescript
1. jlceda_component_select({ keyword: "0.1uF", limit: 3 })
2. 选择最常用的型号
3. jlceda_component_place_auto({
     components: [同一个器件 × 5],
     layoutStrategy: "grid",
     gridLayout: {
       startX: 2000,
       startY: 2000,
       spacingX: 1000,
       columns: 5
     }
   })
```

**AI回复：**
```
✅ 已放置 5 个 0.1uF 电容

布局：
C5 - C6 - C7 - C8 - C9
(横向排列，间距1000)

规格：
- 容值：0.1uF (100nF)
- 封装：0603
- 耐压：16V

建议：
将这些电容分别放置在各芯片电源引脚附近
```

---

### 模式4：检查和修复

**用户：** "检查有没有问题"

**AI执行：**
```typescript
1. jlceda_schematic_read()
2. 分析DRC结果
3. 检查网络连接
```

**AI回复：**
```
⚠️ 发现以下问题：

1. 未连接的引脚（5处）：
   - U3.VDD (引脚16) - 需要连接到VCC
   - U3.GND (引脚15,23,35,43) - 需要连接到GND

2. 缺少元件：
   - 未发现晶振电路
   - 未发现复位电路

3. 建议改进：
   - 添加电源滤波电容
   - 添加防护电路

需要我帮你修复这些问题吗？
```

---

## ⚠️ 注意事项

### 执行顺序

**推荐流程：**
```
1. 了解环境 (eda_context)
2. 读取现状 (schematic_read)
3. 搜索器件 (component_select)
4. 放置器件 (component_place_auto)
5. 连接线路 (auto_wire_connect)
6. 验证结果 (schematic_read)
```

### 常见错误

**错误1：未在原理图页面**
```
用户在Home页面 → 工具无法使用
解决：提示用户打开原理图
```

**错误2：坐标超出范围**
```
坐标太大或太小 → 放置失败
解决：使用合理的坐标（1000-10000）
```

**错误3：UUID错误**
```
使用了错误的UUID → 找不到器件
解决：必须从component_select返回值中获取UUID
```

### 用户体验

**好的做法：**
- ✅ 主动解释结果
- ✅ 给出明确建议
- ✅ 预判下一步需求
- ✅ 友好的错误提示

**避免：**
- ❌ 只返回原始JSON
- ❌ 使用过多技术术语
- ❌ 不解释为什么
- ❌ 不给后续建议

---

## 📋 快速参考

### 工具选择决策树

```
用户需求
    ├─ "有哪些器件" → schematic_read
    ├─ "分析电路" → schematic_read + 分析
    ├─ "添加器件" → component_select → component_place_auto
    ├─ "连线" → auto_wire_connect
    ├─ "整理布局" → schematic_auto_layout
    └─ "自动布线" → schematic_auto_routing
```

### 参数快速查询

**component_select：**
- keyword：型号或规格（必填）
- limit：返回数量（默认5）

**component_place_auto：**
- components：器件列表（必填）
- layoutStrategy：布局策略（grid/vertical/horizontal）
- x, y：坐标（可选，自动布局时不需要）

**auto_wire_connect：**
- connections：连接定义（必填）
- routingStrategy：布线策略（manhattan推荐）

---

## 🎯 成功案例

### 案例1：从零开始设计

**用户任务：** "帮我设计一个ESP32最小系统"

**AI执行步骤：**
1. 理解需求（ESP32 + 电源 + USB）
2. 搜索并放置ESP32模块
3. 搜索并放置电源芯片
4. 搜索并放置USB转串口
5. 批量放置退耦电容
6. 自动连接电源网络
7. 验证连接

**关键对话：**
- 每步都解释在做什么
- 展示候选让用户选择
- 放置后说明下一步
- 最后总结完成情况

### 案例2：分析和优化

**用户任务：** "优化这个电路"

**AI执行步骤：**
1. 读取原理图
2. 分析设计问题
3. 给出具体建议
4. 征得同意后执行修改
5. 再次验证

---

## 🎓 学习建议

### 熟悉工具

1. 先掌握基础工具（read, select, place）
2. 再学习自动化工具
3. 最后了解API透传

### 提升技巧

1. 多用自然语言解释
2. 预判用户需求
3. 主动给出建议
4. 友好的错误处理

### 调试方法

遇到问题时：
1. 先调用 `eda_context` 确认环境
2. 读取 `schematic_read` 了解状态
3. 检查返回的错误信息
4. 给用户明确的解决步骤

---

**使用本指南，你将能够流畅地帮助用户完成硬件设计任务！** 🚀

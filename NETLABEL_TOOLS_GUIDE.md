# 网络标签工具使用指南

> 本指南面向 AI 助手，说明如何使用 `netlabel_place` 和 `netlabel_modify` 工具。

## 概述

网络标签工具用于在原理图中通过网络标签（NetLabel）代替导线实现电气连接。这种方式比绘制导线更简单、更清晰，特别适合 AI 自动化操作。

### 核心优势

- ✅ **无需计算路径**：只需指定引脚位置，无需计算导线路径
- ✅ **自动连接**：相同网络名的标签自动形成电气连接
- ✅ **智能识别**：自动识别电源/地网络，放置对应符号
- ✅ **专业实践**：符合电路设计规范，清晰易读

---

## 工具 1：netlabel_place（主要工具）

### 功能描述

在指定器件引脚位置放置网络标签，实现电气连接。

### 调用路径

```
/bridge/jlceda/netlabel/place
```

### 参数说明

```typescript
{
  placements: Array<{
    componentId: string;      // 器件图元 ID（从 component_place 或 schematic_read 获取）
    pinIdentifier: string;    // 引脚标识符（引脚编号如 "1" 或引脚名如 "VCC"）
    netName: string;          // 网络名称（如 "VCC", "GND", "UART_TX" 等）
  }>
}
```

**参数限制**：
- `placements` 数组长度：1-100
- `componentId`、`pinIdentifier`、`netName` 均不能为空

### 网络类型自动识别

工具会根据 `netName` 自动判断放置的符号类型：

| 网络名模式 | 符号类型 | 示例 |
|-----------|---------|------|
| `VCC`, `VDD`, `V+`, `+5V`, `+3V3`, `VBUS`, `VIN` | 电源符号 (Power) | VCC, +5V, VDD |
| `GND`, `VSS`, `V-`, `DGND` | 地符号 (Ground) | GND, VSS |
| `AGND`, `GND_A` | 模拟地 (AnalogGround) | AGND |
| `PE`, `PGND` | 保护地 (ProtectGround) | PE |
| 其他 | 普通网络标签 | UART_TX, SPI_CLK, LED_ANODE |

### 使用示例

#### 示例 1：简单 LED 电路

```json
{
  "placements": [
    { "componentId": "gge123", "pinIdentifier": "1", "netName": "+5V" },
    { "componentId": "gge123", "pinIdentifier": "2", "netName": "LED_ANODE" },
    { "componentId": "gge456", "pinIdentifier": "+", "netName": "LED_ANODE" },
    { "componentId": "gge456", "pinIdentifier": "-", "netName": "GND" }
  ]
}
```

**结果**：
- R1 引脚1：放置 `+5V` 电源符号
- R1 引脚2：放置 `LED_ANODE` 网络标签
- LED1 正极：放置 `LED_ANODE` 网络标签（与 R1 引脚2 自动连接）
- LED1 负极：放置 `GND` 地符号

#### 示例 2：UART 通信

```json
{
  "placements": [
    { "componentId": "gge_mcu", "pinIdentifier": "TX", "netName": "UART_TX" },
    { "componentId": "gge_mcu", "pinIdentifier": "RX", "netName": "UART_RX" },
    { "componentId": "gge_module", "pinIdentifier": "RX", "netName": "UART_TX" },
    { "componentId": "gge_module", "pinIdentifier": "TX", "netName": "UART_RX" }
  ]
}
```

**结果**：MCU 的 TX 与 Module 的 RX 通过 `UART_TX` 网络连接，实现交叉连线。

#### 示例 3：电源分配

```json
{
  "placements": [
    { "componentId": "gge_u1", "pinIdentifier": "VCC", "netName": "+3V3" },
    { "componentId": "gge_u2", "pinIdentifier": "VCC", "netName": "+3V3" },
    { "componentId": "gge_u3", "pinIdentifier": "VCC", "netName": "+3V3" },
    { "componentId": "gge_u1", "pinIdentifier": "GND", "netName": "GND" },
    { "componentId": "gge_u2", "pinIdentifier": "GND", "netName": "GND" },
    { "componentId": "gge_u3", "pinIdentifier": "GND", "netName": "GND" }
  ]
}
```

**结果**：所有器件的 VCC 引脚连接到 +3V3 电源网，所有 GND 引脚连接到地网。

### 返回值

```typescript
{
  ok: true,
  successCount: number,     // 成功放置的数量
  failureCount: number,     // 失败的数量
  total: number,            // 总数
  results: Array<{
    index: number,          // 序号
    componentId: string,
    pinIdentifier: string,
    netName: string,
    success: boolean,
    type?: string,          // 符号类型：Power/Ground/NetLabel
    position?: { x, y },    // 放置坐标
    error?: string          // 失败原因
  }>,
  message: string
}
```

### 常见错误

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| `未找到器件引脚` | componentId 不正确 | 确认器件 ID，可从 schematic_read 获取 |
| `未找到引脚 "X"` | pinIdentifier 不存在 | 检查引脚编号或名称，可从 getAllPinsByPrimitiveId 获取 |
| `placements 不能为空` | 数组为空 | 至少提供一个放置项 |
| `API 返回空结果` | EDA 环境问题 | 检查 EDA 连接状态 |

---

## 工具 2：netlabel_modify（备用工具）

### 功能描述

修改已放置的网络标签名称，用于纠正错误或调整设计。

### 调用路径

```
/bridge/jlceda/netlabel/modify
```

### 参数说明

```typescript
{
  target: {
    type: "primitiveId" | "pin",
    
    // type="primitiveId" 时：
    primitiveId?: string,           // 网络标签的图元 ID
    
    // type="pin" 时：
    componentId?: string,           // 器件图元 ID
    pinIdentifier?: string          // 引脚标识符
  },
  newNetName: string                // 新的网络名称
}
```

### 使用示例

#### 方式 1：按图元 ID 修改

```json
{
  "target": {
    "type": "primitiveId",
    "primitiveId": "gge_attr_789"
  },
  "newNetName": "CORRECTED_NAME"
}
```

#### 方式 2：按引脚位置查找修改

```json
{
  "target": {
    "type": "pin",
    "componentId": "gge123",
    "pinIdentifier": "1"
  },
  "newNetName": "NEW_SIGNAL"
}
```

**说明**：工具会在引脚附近 30 mil 范围内搜索网络标签并修改。

### 返回值

```typescript
{
  ok: boolean,
  primitiveId?: string,    // 修改的图元 ID
  oldNetName?: string,     // 修改前的网络名
  newNetName?: string,     // 修改后的网络名
  message?: string,
  error?: string          // 错误信息（如果失败）
}
```

---

## AI 使用指南

### 典型工作流程

```
用户：设计一个 LED 电路

AI 操作顺序：
1. component_select - 搜索 LED、电阻
2. component_place - 放置器件
3. netlabel_place - 建立连接 ⭐ 使用网络标签代替导线
4. (可选) netlabel_modify - 如果需要修改网络名
```

### 何时使用 netlabel_place

✅ **推荐使用的场景**：
- 所有需要电气连接的情况
- 电源、地连接
- 信号线连接
- 总线连接
- 跨页连接

❌ **不要使用的场景**：
- 没有器件需要连接
- 器件尚未放置

### 网络命名建议

**电源网络**：
- 使用标准名称：`VCC`, `VDD`, `+5V`, `+3V3`
- 明确电压等级：`+5V`, `+3.3V`, `+12V`

**地网络**：
- 统一使用：`GND`
- 区分类型：`AGND`（模拟地）, `DGND`（数字地）

**信号网络**：
- 使用描述性名称：`UART_TX`, `SPI_CLK`, `LED_ANODE`
- 避免使用：`NET1`, `NET2`（除非临时使用）

### 引脚标识符查找

如果不确定引脚编号或名称：

1. **从器件选型结果获取**：`component_select` 返回的器件信息中包含引脚
2. **从原理图读取获取**：`schematic_read` 返回的器件列表中包含引脚信息
3. **常见引脚名**：VCC, GND, TX, RX, SCL, SDA, MOSI, MISO, CLK

### 错误处理

如果 `netlabel_place` 失败：

1. **检查 componentId**：确认器件已放置，ID 正确
2. **检查 pinIdentifier**：确认引脚编号/名称正确
3. **使用 netlabel_modify**：如果网络名错误，可用 modify 修正
4. **查看 results**：检查具体哪个放置项失败及原因

---

## 技术细节

### 坐标计算

工具自动根据引脚旋转角度计算标签偏移位置：

- 引脚向右（0°）：标签在引脚右侧 15 mil
- 引脚向上（90°）：标签在引脚上方 15 mil
- 引脚向左（180°）：标签在引脚左侧 15 mil
- 引脚向下（270°）：标签在引脚下方 15 mil

### EDA API 调用

内部使用以下 API：
- `eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId` - 获取引脚
- `eda.sch_PrimitiveAttribute.createNetLabel` - 创建网络标签
- `eda.sch_PrimitiveComponent.createNetFlag` - 创建电源/地符号
- `eda.sch_PrimitiveAttribute.modify` - 修改网络标签

---

## 最佳实践

### ✅ 推荐做法

1. **先放置器件，再添加网络标签**
2. **使用有意义的网络名称**
3. **电源和地使用标准名称**
4. **批量放置相同类型的连接**
5. **优先使用 netlabel_place，仅在需要修正时使用 netlabel_modify**

### ❌ 避免的做法

1. **不要在器件放置前调用 netlabel_place**
2. **不要使用无意义的网络名（如 NET1, X, A）**
3. **不要混淆引脚编号和引脚名**
4. **不要重复调用相同的放置操作**

---

## 示例：完整 LED 电路设计

```javascript
// 步骤 1：选择器件（component_select）
// 用户确认：R1 = 330Ω 电阻, LED1 = 红色 LED

// 步骤 2：放置器件（component_place）
// 结果：R1 (gge_r1), LED1 (gge_led1)

// 步骤 3：建立连接（netlabel_place）
{
  "placements": [
    // 电阻 R1 引脚1 连接到 +5V 电源
    { 
      "componentId": "gge_r1", 
      "pinIdentifier": "1", 
      "netName": "+5V" 
    },
    
    // 电阻 R1 引脚2 连接到 LED 阳极
    { 
      "componentId": "gge_r1", 
      "pinIdentifier": "2", 
      "netName": "LED_ANODE" 
    },
    
    // LED1 阳极连接到 LED_ANODE 网络
    { 
      "componentId": "gge_led1", 
      "pinIdentifier": "+", 
      "netName": "LED_ANODE" 
    },
    
    // LED1 阴极连接到地
    { 
      "componentId": "gge_led1", 
      "pinIdentifier": "-", 
      "netName": "GND" 
    }
  ]
}

// 结果：
// - +5V 电源符号放置在 R1 引脚1
// - LED_ANODE 网络标签连接 R1 引脚2 和 LED1 阳极
// - GND 地符号放置在 LED1 阴极
// - 电路连接完成，无需绘制导线
```

---

## 故障排查

### 问题：调用工具后无反应

**可能原因**：
- EDA 桥接连接断开
- 当前不在原理图页面
- 器件 ID 不正确

**解决方法**：
1. 检查 EDA 中 MCP Bridge 连接状态
2. 确认当前在原理图编辑页面
3. 使用 `schematic_read` 获取正确的器件 ID

### 问题：网络标签位置不合适

**可能原因**：
- 引脚旋转角度导致标签偏移方向不理想

**解决方法**：
- 用户可在 EDA 中手动调整标签位置
- 或使用 `netlabel_modify` 工具重新放置

### 问题：电源符号未自动识别

**可能原因**：
- 网络名不符合识别规则

**解决方法**：
- 使用标准名称：VCC, VDD, +5V, GND 等
- 或在 netName 中明确包含电压信息：+3V3, +12V

---

## 版本信息

- **工具版本**：2.0.0
- **更新日期**：2026-07-04
- **适用范围**：嘉立创 EDA 专业版原理图设计

---

**记住**：网络标签是专业电路设计的标准做法，比导线更清晰、更易维护！

# tool-dispatcher.ts 修改指南

## 修改位置

文件：`mcp-hub/src/server/mcp/tool-dispatcher.ts`

## 步骤 1：替换 handleComponentSelect 方法（第 525-641 行）

找到这个方法：
```typescript
// 桥接执行器件搜索。
private async handleComponentSelect(argumentsObject: Record<string, unknown>): Promise<unknown> {
```

**完整替换为以下代码：**

```typescript
// 桥接执行器件搜索。（简化版：无侧栏交互）
private async handleComponentSelect(argumentsObject: Record<string, unknown>): Promise<unknown> {
	const keyword = String(argumentsObject.keyword ?? '').trim();
	if (keyword.length === 0) {
		throw new Error('component_select 缺少 keyword 参数。');
	}

	// 硬拦截：VCC/GND 等电源/地符号不进选型流程
	if (ToolDispatcher.NET_FLAG_KEYWORDS.has(keyword.toLowerCase())) {
		return {
			ok: false,
			errorCode: 'NET_FLAG_NOT_SELECTABLE',
			message: `电源/地符号（${keyword}）不需要选型。电源/地符号需要用户在 EDA 中手动放置。`,
		};
	}

	const limit = parseBoundedIntegerValue(argumentsObject.limit, 5, 2, 20);
	const searchResult = await enqueueBridgeRequest('/bridge/jlceda/component/select', {
		keyword,
		limit,
		page: 1,
	}, DEFAULT_BRIDGE_TIMEOUT_MS);
	
	const payload = this.parseComponentSelectBridgePayload(searchResult);
	if (!payload) {
		return searchResult;
	}

	// 返回候选列表供 AI 选择
	if (payload.candidates.length === 0) {
		return {
			ok: false,
			errorCode: 'NO_CANDIDATES_FOUND',
			message: `未找到匹配"${keyword}"的器件。建议：1) 检查拼写；2) 尝试型号或厂商名；3) 电阻/电容/电感需带单位（如 1kΩ、100nF）。`,
		};
	}

	return {
		ok: true,
		keyword,
		totalFound: payload.candidates.length,
		candidates: payload.candidates.slice(0, 5),
		message: `找到 ${payload.candidates.length} 个候选。请根据规格、库存(lcscInventory)、价格(lcscPrice)选择最合适的，然后使用 uuid 和 libraryUuid 调用 component_place_auto 放置。`,
	};
}
```

## 步骤 2：添加 handleComponentPlaceAuto 方法（在 handleComponentSelect 之后）

在 `handleComponentSelect` 方法后面添加：

```typescript
// 自动放置器件到指定坐标（新工具）
private async handleComponentPlaceAuto(argumentsObject: Record<string, unknown>): Promise<unknown> {
	const components = argumentsObject.components;
	if (!Array.isArray(components) || components.length === 0) {
		return {
			ok: false,
			errorCode: 'EMPTY_COMPONENTS',
			message: '器件列表为空',
		};
	}

	const results = [];
	
	// 解析布局策略
	const layoutStrategy = String(argumentsObject.layoutStrategy || 'grid');
	const positions = this.calculateComponentPositions(
		components,
		layoutStrategy,
		argumentsObject.gridLayout,
		argumentsObject.linearLayout,
		argumentsObject.fixedPosition
	);

	// 逐个放置器件
	for (let i = 0; i < components.length; i++) {
		const comp = components[i];
		const pos = positions[i];

		try {
			const result = await enqueueBridgeRequest('/bridge/jlceda/api/invoke', {
				apiFullName: 'eda.sch_PrimitiveComponent.create',
				args: [
					{
						libraryUuid: String(comp.libraryUuid || ''),
						uuid: String(comp.uuid || ''),
					},
					pos.x,
					pos.y,
					String(comp.subPartName || '') || undefined,
					Number(comp.rotation || 0),
					Boolean(comp.mirror || false),
					true,  // addIntoBom
					true,  // addIntoPcb
				],
			}, DEFAULT_BRIDGE_TIMEOUT_MS);

			if (result && result.ok !== false) {
				results.push({
					success: true,
					component: String(comp.name || comp.uuid),
					position: pos,
				});
			} else {
				results.push({
					success: false,
					component: String(comp.name || comp.uuid),
					error: '创建失败',
					position: pos,
				});
			}
		} catch (error) {
			results.push({
				success: false,
				component: String(comp.name || comp.uuid),
				error: toSafeErrorMessage(error),
				position: pos,
			});
		}

		// 短暂延迟避免 EDA 过载
		await new Promise(resolve => setTimeout(resolve, 100));
	}

	const successCount = results.filter(r => r.success).length;

	return {
		ok: true,
		totalComponents: components.length,
		successCount,
		failCount: components.length - successCount,
		results,
		message: `已放置 ${successCount}/${components.length} 个器件。用户可在 EDA 中手动调整位置，然后使用 auto_wire_connect 自动连线。`,
	};
}

// 计算器件放置坐标
private calculateComponentPositions(
	components: unknown[],
	strategy: string,
	gridLayout: unknown,
	linearLayout: unknown,
	fixedPosition: unknown
): Array<{ x: number; y: number }> {
	const positions: Array<{ x: number; y: number }> = [];

	// 检查每个器件是否指定了坐标
	const hasCustomPositions = components.every((comp: any) => 
		typeof comp.x === 'number' && typeof comp.y === 'number'
	);

	if (hasCustomPositions) {
		// 使用器件自己的坐标（AI 智能布局）
		return components.map((comp: any) => ({
			x: Number(comp.x),
			y: Number(comp.y),
		}));
	}

	// 使用自动布局策略
	switch (strategy) {
		case 'grid': {
			const grid = isPlainObjectRecord(gridLayout) ? {
				startX: Number(gridLayout.startX || 0),
				startY: Number(gridLayout.startY || 0),
				spacingX: Number(gridLayout.spacingX || 1500),
				spacingY: Number(gridLayout.spacingY || 1500),
				columns: Number(gridLayout.columns || 4),
			} : { startX: 0, startY: 0, spacingX: 1500, spacingY: 1500, columns: 4 };

			for (let i = 0; i < components.length; i++) {
				const row = Math.floor(i / grid.columns);
				const col = i % grid.columns;
				positions.push({
					x: grid.startX + col * grid.spacingX,
					y: grid.startY + row * grid.spacingY,
				});
			}
			break;
		}

		case 'vertical': {
			const linear = isPlainObjectRecord(linearLayout) ? {
				startX: Number(linearLayout.startX || 0),
				startY: Number(linearLayout.startY || 0),
				spacing: Number(linearLayout.spacing || 1500),
			} : { startX: 0, startY: 0, spacing: 1500 };

			for (let i = 0; i < components.length; i++) {
				positions.push({
					x: linear.startX,
					y: linear.startY + i * linear.spacing,
				});
			}
			break;
		}

		case 'horizontal': {
			const linear = isPlainObjectRecord(linearLayout) ? {
				startX: Number(linearLayout.startX || 0),
				startY: Number(linearLayout.startY || 0),
				spacing: Number(linearLayout.spacing || 1500),
			} : { startX: 0, startY: 0, spacing: 1500 };

			for (let i = 0; i < components.length; i++) {
				positions.push({
					x: linear.startX + i * linear.spacing,
					y: linear.startY,
				});
			}
			break;
		}

		case 'fixed': {
			const fixed = isPlainObjectRecord(fixedPosition) ? {
				x: Number(fixedPosition.x || 0),
				y: Number(fixedPosition.y || 0),
			} : { x: 0, y: 0 };

			for (let i = 0; i < components.length; i++) {
				positions.push({ x: fixed.x, y: fixed.y });
			}
			break;
		}

		default:
			// 默认网格
			for (let i = 0; i < components.length; i++) {
				positions.push({
					x: (i % 4) * 1500,
					y: Math.floor(i / 4) * 1500,
				});
			}
	}

	return positions;
}
```

## 步骤 3：添加 handleAutoWireConnect 方法

```typescript
// 自动连线（新工具）
private async handleAutoWireConnect(argumentsObject: Record<string, unknown>): Promise<unknown> {
	// 先读取原理图获取器件和引脚信息
	const schematicData = await enqueueBridgeRequest('/bridge/jlceda/schematic/read', {}, DEFAULT_BRIDGE_TIMEOUT_MS);
	
	if (!isPlainObjectRecord(schematicData) || !schematicData.ok) {
		return {
			ok: false,
			error: '无法读取原理图数据',
		};
	}

	// 构建引脚坐标映射
	const pinCoordinates = new Map<string, { x: number; y: number; netName: string }>();
	
	const components = Array.isArray(schematicData.components) ? schematicData.components : [];
	for (const component of components) {
		const componentId = String(component.componentInstanceId || '');
		const pins = Array.isArray(component.pins) ? component.pins : [];
		
		for (const pin of pins) {
			const key = `${componentId}_${pin.pinNumber}`;
			pinCoordinates.set(key, {
				x: Number(pin.pinPositionX || 0),
				y: Number(pin.pinPositionY || 0),
				netName: String(pin.connectedNetworkName || ''),
			});
		}
	}

	const results = [];
	const routingStrategy = String(argumentsObject.routingStrategy || 'manhattan');

	// 处理按网络名分组的连接
	if (Array.isArray(argumentsObject.connections)) {
		for (const conn of argumentsObject.connections) {
			if (!isPlainObjectRecord(conn)) continue;
			
			const netName = String(conn.netName || '');
			const pinRefs = Array.isArray(conn.pinReferences) ? conn.pinReferences : [];
			
			// 收集该网络的所有引脚坐标
			const pins = pinRefs
				.map((ref: any) => {
					const key = `${ref.componentId}_${ref.pinNumber}`;
					return pinCoordinates.get(key);
				})
				.filter(Boolean);

			if (pins.length >= 2) {
				// 简单策略：第一个引脚连接到其他所有引脚
				for (let i = 1; i < pins.length; i++) {
					const wireResult = await this.createWire(pins[0]!, pins[i]!, netName, routingStrategy);
					results.push(wireResult);
				}
			}
		}
	}

	// 处理点对点连接
	if (Array.isArray(argumentsObject.pointToPointConnections)) {
		for (const conn of argumentsObject.pointToPointConnections) {
			if (!isPlainObjectRecord(conn)) continue;
			
			const from = conn.from as any;
			const to = conn.to as any;
			const netName = String(conn.netName || '');
			
			const fromKey = `${from.componentId}_${from.pinNumber}`;
			const toKey = `${to.componentId}_${to.pinNumber}`;
			
			const fromPin = pinCoordinates.get(fromKey);
			const toPin = pinCoordinates.get(toKey);
			
			if (fromPin && toPin) {
				const wireResult = await this.createWire(fromPin, toPin, netName, routingStrategy);
				results.push(wireResult);
			}
		}
	}

	const successCount = results.filter(r => r.success).length;

	return {
		ok: true,
		totalWires: results.length,
		successCount,
		failCount: results.length - successCount,
		results,
		message: `已创建 ${successCount}/${results.length} 条导线。`,
	};
}

// 创建单条导线
private async createWire(
	pin1: { x: number; y: number },
	pin2: { x: number; y: number },
	netName: string,
	strategy: string
): Promise<{ success: boolean; error?: string }> {
	// 生成连线路径
	const path = strategy === 'direct'
		? [pin1.x, pin1.y, pin2.x, pin2.y]  // 直线
		: [pin1.x, pin1.y, pin2.x, pin1.y, pin2.x, pin2.y];  // 曼哈顿（正交）

	try {
		const result = await enqueueBridgeRequest('/bridge/jlceda/api/invoke', {
			apiFullName: 'eda.sch_PrimitiveWire.create',
			args: [
				path,
				netName || undefined,
				null,  // color
				null,  // lineWidth
				null,  // lineType
			],
		}, DEFAULT_BRIDGE_TIMEOUT_MS);

		return {
			success: result && result.ok !== false,
		};
	} catch (error) {
		return {
			success: false,
			error: toSafeErrorMessage(error),
		};
	}
}
```

## 步骤 4：更新 callTool 方法中的路由（约在 240 行附近）

找到这段代码：
```typescript
if (toolCallParams.name === 'component_select') {
	return this.toToolContent(await this.handleComponentSelect(args));
}
if (toolCallParams.name === 'component_place') {
	return this.toToolContent(await this.handleComponentPlace(args));
}
```

**修改为：**
```typescript
if (toolCallParams.name === 'component_select') {
	return this.toToolContent(await this.handleComponentSelect(args));
}
if (toolCallParams.name === 'component_place_auto') {
	return this.toToolContent(await this.handleComponentPlaceAuto(args));
}
if (toolCallParams.name === 'auto_wire_connect') {
	return this.toToolContent(await this.handleAutoWireConnect(args));
}
```

## 步骤 5：更新暴露的工具列表（约在 45-50 行）

找到：
```typescript
const EXPOSED_MCP_TOOL_NAMES = new Set<string>([
	'schematic_read',
	'schematic_review',
	'component_select',
	'component_place',
]);
```

**修改为：**
```typescript
const EXPOSED_MCP_TOOL_NAMES = new Set<string>([
	'schematic_read',
	'schematic_review',
	'component_select',
	'component_place_auto',
	'auto_wire_connect',
]);
```

## 完成！

修改完成后：
1. 保存文件
2. 运行 `npm run build`
3. 测试新工具

---

**注意**：原有的 `component_place`（交互式放置）保留不动，新增的是 `component_place_auto`。

/**
 * -------------------------------------------------------------------------
 * 名称：自动连线工具实现方案
 * 说明：基于 eda.sch_PrimitiveWire.create API 实现自动连线功能
 * 日期：2026-07-02
 * -------------------------------------------------------------------------
 */

/**
 * 新增 MCP 工具：auto_wire_connect
 * 
 * 功能：根据原理图读取结果，自动在器件引脚之间创建导线连接
 */

interface AutoWireConnectParams {
	// 方案 1：基于网络名自动连接
	connections?: Array<{
		netName: string;              // 网络名（如 "VCC", "GND", "SDA", "SCL"）
		pinReferences: Array<{        // 需要连接到此网络的引脚
			componentId: string;      // 器件 ID
			pinNumber: string;        // 引脚编号
		}>;
	}>;

	// 方案 2：直接指定点对点连接
	pointToPointConnections?: Array<{
		from: {
			componentId: string;
			pinNumber: string;
		};
		to: {
			componentId: string;
			pinNumber: string;
		};
		netName?: string;             // 可选：指定网络名
	}>;

	// 连线样式（可选）
	lineStyle?: {
		color?: string;               // 颜色
		lineWidth?: number;           // 线宽 1-10
	};

	// 连线策略
	routingStrategy?: 'direct' | 'manhattan' | 'auto';  // 直线 | 曼哈顿布线 | 自动
}

interface PinCoordinate {
	x: number;
	y: number;
	componentId: string;
	pinNumber: string;
	netName: string;
}

/**
 * 实现逻辑
 */
async function handleAutoWireConnect(params: AutoWireConnectParams): Promise<unknown> {
	const results = [];
	
	// 步骤 1：从 schematic_read 获取所有器件和引脚信息
	const schematicData = await enqueueBridgeRequest('/bridge/jlceda/schematic/read', {}, 30000);
	
	if (!schematicData || !schematicData.ok) {
		return {
			ok: false,
			error: '无法读取原理图数据',
		};
	}

	// 步骤 2：构建引脚坐标映射表
	const pinCoordinates = new Map<string, PinCoordinate>();
	
	for (const component of schematicData.components || []) {
		const primitiveId = component.componentInstanceId;
		
		// 调用 EDA API 获取引脚坐标
		const pinsData = await enqueueBridgeRequest('/bridge/jlceda/api/invoke', {
			apiFullName: 'eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId',
			args: [primitiveId],
		}, 30000);

		if (pinsData && Array.isArray(pinsData.result)) {
			for (const pin of pinsData.result) {
				const key = `${primitiveId}_${pin.pinNumber}`;
				pinCoordinates.set(key, {
					x: pin.x,
					y: pin.y,
					componentId: primitiveId,
					pinNumber: pin.pinNumber,
					netName: pin.netName || '',
				});
			}
		}
	}

	// 步骤 3：根据连接方案创建导线
	if (params.connections) {
		// 方案 1：按网络名分组连接
		for (const connection of params.connections) {
			const netPins: PinCoordinate[] = [];
			
			// 收集该网络的所有引脚坐标
			for (const pinRef of connection.pinReferences) {
				const key = `${pinRef.componentId}_${pinRef.pinNumber}`;
				const pinCoord = pinCoordinates.get(key);
				if (pinCoord) {
					netPins.push(pinCoord);
				}
			}

			// 如果有 2 个以上引脚，创建连线（星型或链式）
			if (netPins.length >= 2) {
				const wireResult = await createWiresBetweenPins(
					netPins,
					connection.netName,
					params.lineStyle,
					params.routingStrategy || 'manhattan'
				);
				results.push(wireResult);
			}
		}
	}

	if (params.pointToPointConnections) {
		// 方案 2：点对点连接
		for (const connection of params.pointToPointConnections) {
			const fromKey = `${connection.from.componentId}_${connection.from.pinNumber}`;
			const toKey = `${connection.to.componentId}_${connection.to.pinNumber}`;
			
			const fromPin = pinCoordinates.get(fromKey);
			const toPin = pinCoordinates.get(toKey);

			if (fromPin && toPin) {
				const wireResult = await createWireBetweenTwoPins(
					fromPin,
					toPin,
					connection.netName,
					params.lineStyle,
					params.routingStrategy || 'manhattan'
				);
				results.push(wireResult);
			}
		}
	}

	return {
		ok: true,
		totalWiresCreated: results.filter(r => r.success).length,
		totalWiresFailed: results.filter(r => !r.success).length,
		details: results,
	};
}

/**
 * 在两个引脚之间创建导线
 */
async function createWireBetweenTwoPins(
	pin1: PinCoordinate,
	pin2: PinCoordinate,
	netName?: string,
	lineStyle?: any,
	routingStrategy: string = 'manhattan'
): Promise<any> {
	// 生成连线路径坐标
	const wirePath = generateWirePath(pin1, pin2, routingStrategy);

	try {
		// 调用 EDA API 创建导线
		const result = await enqueueBridgeRequest('/bridge/jlceda/api/invoke', {
			apiFullName: 'eda.sch_PrimitiveWire.create',
			args: [
				wirePath,                           // 坐标数组
				netName || undefined,               // 网络名
				lineStyle?.color || null,           // 颜色
				lineStyle?.lineWidth || null,       // 线宽
				null,                               // 线型
			],
		}, 30000);

		return {
			success: result && result.result !== undefined,
			from: `${pin1.componentId}:${pin1.pinNumber}`,
			to: `${pin2.componentId}:${pin2.pinNumber}`,
			netName: netName || 'auto',
			path: wirePath,
		};
	} catch (error) {
		return {
			success: false,
			error: String(error),
			from: `${pin1.componentId}:${pin1.pinNumber}`,
			to: `${pin2.componentId}:${pin2.pinNumber}`,
		};
	}
}

/**
 * 生成连线路径（曼哈顿布线或直线）
 */
function generateWirePath(
	pin1: PinCoordinate,
	pin2: PinCoordinate,
	strategy: string
): number[] {
	if (strategy === 'direct') {
		// 直线连接
		return [pin1.x, pin1.y, pin2.x, pin2.y];
	}

	// 曼哈顿布线（正交）
	// 先水平后垂直，或先垂直后水平（选择较短的路径）
	const horizontalFirst = [
		pin1.x, pin1.y,        // 起点
		pin2.x, pin1.y,        // 水平到目标 x
		pin2.x, pin2.y,        // 垂直到目标 y
	];

	const verticalFirst = [
		pin1.x, pin1.y,        // 起点
		pin1.x, pin2.y,        // 垂直到目标 y
		pin2.x, pin2.y,        // 水平到目标 x
	];

	// 选择较短的路径
	const hDist = Math.abs(pin2.x - pin1.x) + Math.abs(pin1.y - pin1.y);
	const vDist = Math.abs(pin1.x - pin1.x) + Math.abs(pin2.y - pin1.y);

	return hDist <= vDist ? horizontalFirst : verticalFirst;
}

/**
 * 在多个引脚之间创建连线（星型拓扑）
 */
async function createWiresBetweenPins(
	pins: PinCoordinate[],
	netName: string,
	lineStyle?: any,
	routingStrategy: string = 'manhattan'
): Promise<any> {
	// 简单策略：选择第一个引脚作为中心，连接到其他所有引脚
	const centerPin = pins[0];
	const results = [];

	for (let i = 1; i < pins.length; i++) {
		const result = await createWireBetweenTwoPins(
			centerPin,
			pins[i],
			netName,
			lineStyle,
			routingStrategy
		);
		results.push(result);
	}

	return {
		netName,
		totalPins: pins.length,
		wiresCreated: results.filter(r => r.success).length,
		details: results,
	};
}

/**
 * 工具定义（添加到 mcp-tool-definitions.json）
 */
const AUTO_WIRE_CONNECT_TOOL_DEFINITION = {
	name: 'auto_wire_connect',
	description: '根据网络连接关系，自动在器件引脚之间创建导线。支持基于网络名或点对点的连接方式。',
	inputSchema: {
		type: 'object',
		properties: {
			connections: {
				type: 'array',
				description: '按网络名分组的连接定义',
				items: {
					type: 'object',
					properties: {
						netName: {
							type: 'string',
							description: '网络名称（如 VCC, GND, SDA）',
						},
						pinReferences: {
							type: 'array',
							description: '该网络需要连接的所有引脚',
							items: {
								type: 'object',
								properties: {
									componentId: { type: 'string', description: '器件实例 ID' },
									pinNumber: { type: 'string', description: '引脚编号' },
								},
								required: ['componentId', 'pinNumber'],
							},
						},
					},
					required: ['netName', 'pinReferences'],
				},
			},
			pointToPointConnections: {
				type: 'array',
				description: '点对点连接定义',
				items: {
					type: 'object',
					properties: {
						from: {
							type: 'object',
							properties: {
								componentId: { type: 'string' },
								pinNumber: { type: 'string' },
							},
							required: ['componentId', 'pinNumber'],
						},
						to: {
							type: 'object',
							properties: {
								componentId: { type: 'string' },
								pinNumber: { type: 'string' },
							},
							required: ['componentId', 'pinNumber'],
						},
						netName: { type: 'string', description: '可选的网络名' },
					},
					required: ['from', 'to'],
				},
			},
			routingStrategy: {
				type: 'string',
				enum: ['direct', 'manhattan', 'auto'],
				default: 'manhattan',
				description: '布线策略：direct=直线，manhattan=正交布线',
			},
		},
	},
};

/**
 * 使用示例
 */
const USAGE_EXAMPLE = {
	// 示例 1：按网络名自动连接
	example1: {
		connections: [
			{
				netName: 'VCC',
				pinReferences: [
					{ componentId: 'U1', pinNumber: '8' },
					{ componentId: 'C1', pinNumber: '1' },
					{ componentId: 'C2', pinNumber: '1' },
				],
			},
			{
				netName: 'GND',
				pinReferences: [
					{ componentId: 'U1', pinNumber: '4' },
					{ componentId: 'C1', pinNumber: '2' },
					{ componentId: 'C2', pinNumber: '2' },
				],
			},
		],
		routingStrategy: 'manhattan',
	},

	// 示例 2：点对点连接
	example2: {
		pointToPointConnections: [
			{
				from: { componentId: 'U1', pinNumber: '1' },
				to: { componentId: 'R1', pinNumber: '1' },
				netName: 'OUTPUT',
			},
			{
				from: { componentId: 'R1', pinNumber: '2' },
				to: { componentId: 'LED1', pinNumber: '1' },
			},
		],
		routingStrategy: 'direct',
	},
};

export {
	handleAutoWireConnect,
	AUTO_WIRE_CONNECT_TOOL_DEFINITION,
	USAGE_EXAMPLE,
};

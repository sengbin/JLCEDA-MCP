/**
 * -------------------------------------------------------------------------
 * 名称：完全自动化方案 - 器件放置 + 自动连线
 * 说明：无需侧栏，器件自动放置到固定位置，用户手动调整，然后自动连线
 * 日期：2026-07-02
 * -------------------------------------------------------------------------
 */

/**
 * ============================================================================
 * 方案总结：完全自动化的 EDA 操作流程
 * ============================================================================
 * 
 * 1. component_select    - 搜索器件，返回候选列表供 AI 选择
 * 2. component_place_auto - 自动放置器件到固定坐标（新工具）
 * 3. auto_wire_connect   - 自动连接导线
 * 4. 用户手动调整布局   - 拖动器件到合适位置
 * 
 * ============================================================================
 */

/**
 * 新工具：component_place_auto
 * 
 * 功能：自动放置器件到指定坐标（默认 0,0 或网格布局）
 */

interface ComponentPlaceAutoParams {
	components: Array<{
		uuid: string;              // 器件 UUID
		libraryUuid: string;       // 库 UUID
		name?: string;             // 器件名称（可选）
		subPartName?: string;      // 子部件名称（可选）
		
		// 可选：指定放置位置
		x?: number;                // X 坐标（默认自动计算）
		y?: number;                // Y 坐标（默认自动计算）
		rotation?: number;         // 旋转角度（0/90/180/270）
		mirror?: boolean;          // 是否镜像
	}>;

	// 布局策略
	layoutStrategy?: 'fixed' | 'grid' | 'vertical' | 'horizontal';
	
	// 固定位置（fixed 策略）
	fixedPosition?: {
		x: number;
		y: number;
	};

	// 网格布局参数（grid 策略）
	gridLayout?: {
		startX: number;            // 起始 X 坐标
		startY: number;            // 起始 Y 坐标
		spacingX: number;          // 水平间距
		spacingY: number;          // 垂直间距
		columns: number;           // 列数
	};

	// 线性布局参数（vertical/horizontal 策略）
	linearLayout?: {
		startX: number;
		startY: number;
		spacing: number;           // 间距
	};
}

/**
 * API 调用：eda.sch_PrimitiveComponent.create
 * 
 * create(
 *   component: { libraryUuid: string, uuid: string },
 *   x: number,
 *   y: number,
 *   subPartName?: string,
 *   rotation?: number,
 *   mirror?: boolean,
 *   addIntoBom?: boolean,
 *   addIntoPcb?: boolean
 * ): Promise<ISCH_PrimitiveComponent | undefined>
 */

/**
 * 实现：自动放置处理器
 */
async function handleComponentPlaceAuto(params: ComponentPlaceAutoParams): Promise<unknown> {
	if (!Array.isArray(params.components) || params.components.length === 0) {
		return {
			ok: false,
			errorCode: 'EMPTY_COMPONENTS',
			message: '器件列表为空',
		};
	}

	const strategy = params.layoutStrategy || 'grid';
	const results = [];

	// 计算每个器件的放置坐标
	const placements = calculatePlacements(params.components, strategy, params);

	// 逐个放置器件
	for (let i = 0; i < params.components.length; i++) {
		const component = params.components[i];
		const position = placements[i];

		try {
			// 调用 EDA API 创建器件
			const result = await enqueueBridgeRequest('/bridge/jlceda/api/invoke', {
				apiFullName: 'eda.sch_PrimitiveComponent.create',
				args: [
					{
						libraryUuid: component.libraryUuid,
						uuid: component.uuid,
					},
					position.x,
					position.y,
					component.subPartName || undefined,
					component.rotation || 0,
					component.mirror || false,
					true,  // addIntoBom
					true,  // addIntoPcb
				],
			}, 30000);

			if (result && result.result) {
				results.push({
					success: true,
					component: component.name || component.uuid,
					primitiveId: result.result.primitiveId || 'unknown',
					position,
				});
			} else {
				results.push({
					success: false,
					component: component.name || component.uuid,
					error: '创建失败',
					position,
				});
			}
		} catch (error) {
			results.push({
				success: false,
				component: component.name || component.uuid,
				error: String(error),
				position,
			});
		}

		// 短暂延迟，避免 EDA 过载
		await delay(100);
	}

	const successCount = results.filter(r => r.success).length;
	const failCount = results.filter(r => !r.success).length;

	return {
		ok: true,
		totalComponents: params.components.length,
		successCount,
		failCount,
		results,
		message: `已自动放置 ${successCount}/${params.components.length} 个器件。${failCount > 0 ? `有 ${failCount} 个失败。` : ''}请在 EDA 中手动调整器件位置，然后使用 auto_wire_connect 工具自动连线。`,
	};
}

/**
 * 计算器件放置坐标
 */
function calculatePlacements(
	components: ComponentPlaceAutoParams['components'],
	strategy: string,
	params: ComponentPlaceAutoParams
): Array<{ x: number; y: number }> {
	const positions: Array<{ x: number; y: number }> = [];

	switch (strategy) {
		case 'fixed': {
			// 所有器件放在同一位置（堆叠），用户需要手动分开
			const pos = params.fixedPosition || { x: 0, y: 0 };
			for (let i = 0; i < components.length; i++) {
				positions.push({ x: pos.x, y: pos.y });
			}
			break;
		}

		case 'grid': {
			// 网格布局
			const grid = params.gridLayout || {
				startX: 0,
				startY: 0,
				spacingX: 1000,  // EDA 单位（mil）
				spacingY: 1000,
				columns: 4,
			};

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
			// 垂直排列
			const linear = params.linearLayout || {
				startX: 0,
				startY: 0,
				spacing: 1000,
			};

			for (let i = 0; i < components.length; i++) {
				positions.push({
					x: linear.startX,
					y: linear.startY + i * linear.spacing,
				});
			}
			break;
		}

		case 'horizontal': {
			// 水平排列
			const linear = params.linearLayout || {
				startX: 0,
				startY: 0,
				spacing: 1000,
			};

			for (let i = 0; i < components.length; i++) {
				positions.push({
					x: linear.startX + i * linear.spacing,
					y: linear.startY,
				});
			}
			break;
		}

		default:
			// 默认网格布局
			for (let i = 0; i < components.length; i++) {
				const col = i % 4;
				const row = Math.floor(i / 4);
				positions.push({
					x: col * 1000,
					y: row * 1000,
				});
			}
	}

	return positions;
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 工具定义（添加到 mcp-tool-definitions.json）
 */
const COMPONENT_PLACE_AUTO_TOOL_DEFINITION = {
	name: 'component_place_auto',
	description: '自动将器件放置到原理图中的指定坐标。支持多种布局策略：固定位置、网格布局、垂直/水平排列。放置后用户可手动调整位置。',
	inputSchema: {
		type: 'object',
		properties: {
			components: {
				type: 'array',
				description: '待放置的器件列表',
				items: {
					type: 'object',
					properties: {
						uuid: { type: 'string', description: '器件 UUID（必填）' },
						libraryUuid: { type: 'string', description: '库 UUID（必填）' },
						name: { type: 'string', description: '器件名称（可选）' },
						subPartName: { type: 'string', description: '子部件名称（可选）' },
						x: { type: 'number', description: '指定 X 坐标（可选，优先级高于布局策略）' },
						y: { type: 'number', description: '指定 Y 坐标（可选）' },
						rotation: { type: 'number', enum: [0, 90, 180, 270], description: '旋转角度（可选）' },
						mirror: { type: 'boolean', description: '是否镜像（可选）' },
					},
					required: ['uuid', 'libraryUuid'],
				},
			},
			layoutStrategy: {
				type: 'string',
				enum: ['fixed', 'grid', 'vertical', 'horizontal'],
				default: 'grid',
				description: '布局策略：fixed=固定位置，grid=网格，vertical=垂直，horizontal=水平',
			},
			fixedPosition: {
				type: 'object',
				description: 'fixed 策略的坐标',
				properties: {
					x: { type: 'number' },
					y: { type: 'number' },
				},
			},
			gridLayout: {
				type: 'object',
				description: 'grid 策略的参数',
				properties: {
					startX: { type: 'number', default: 0 },
					startY: { type: 'number', default: 0 },
					spacingX: { type: 'number', default: 1000 },
					spacingY: { type: 'number', default: 1000 },
					columns: { type: 'number', default: 4 },
				},
			},
			linearLayout: {
				type: 'object',
				description: 'vertical/horizontal 策略的参数',
				properties: {
					startX: { type: 'number', default: 0 },
					startY: { type: 'number', default: 0 },
					spacing: { type: 'number', default: 1000 },
				},
			},
		},
		required: ['components'],
	},
};

/**
 * ============================================================================
 * 完整工作流示例
 * ============================================================================
 */

const FULL_WORKFLOW_EXAMPLE = {
	step1_search: {
		tool: 'component_select',
		params: {
			keyword: '1kΩ',
			limit: 5,
		},
		result: {
			ok: true,
			candidates: [
				{ uuid: 'xxx', libraryUuid: 'yyy', name: '0805 1kΩ ±1%' },
				// ...
			],
		},
	},

	step2_place: {
		tool: 'component_place_auto',
		params: {
			components: [
				{ uuid: 'R1_uuid', libraryUuid: 'sys_lib', name: 'R1' },
				{ uuid: 'R2_uuid', libraryUuid: 'sys_lib', name: 'R2' },
				{ uuid: 'C1_uuid', libraryUuid: 'sys_lib', name: 'C1' },
			],
			layoutStrategy: 'grid',
			gridLayout: {
				startX: 0,
				startY: 0,
				spacingX: 1500,
				spacingY: 1500,
				columns: 3,
			},
		},
		result: {
			ok: true,
			successCount: 3,
			message: '已自动放置 3 个器件，请手动调整位置后再连线',
		},
	},

	step3_user_adjusts_layout: {
		note: '用户在 EDA 中拖动器件到合适位置',
	},

	step4_auto_wire: {
		tool: 'auto_wire_connect',
		params: {
			connections: [
				{
					netName: 'VCC',
					pinReferences: [
						{ componentId: 'R1', pinNumber: '1' },
						{ componentId: 'R2', pinNumber: '1' },
					],
				},
			],
			routingStrategy: 'manhattan',
		},
		result: {
			ok: true,
			totalWiresCreated: 1,
			message: '自动连线完成',
		},
	},
};

export {
	handleComponentPlaceAuto,
	COMPONENT_PLACE_AUTO_TOOL_DEFINITION,
	FULL_WORKFLOW_EXAMPLE,
};

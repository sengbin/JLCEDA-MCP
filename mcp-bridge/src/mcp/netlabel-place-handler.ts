/**
 * ------------------------------------------------------------------------
 * 名称：网络标签放置任务处理器
 * 说明：在指定引脚位置放置网络标签，支持自动识别电源/地符号类型。
 *       通过网络标签代替导线连接，避免 AI 绘制复杂路径。
 * 作者：Lion
 * 邮箱：chengbin@3578.cn
 * 日期：2026-07-04
 * 备注：支持批量放置，自动计算偏移量避免重叠。
 * ------------------------------------------------------------------------
 */

import { isPlainObjectRecord, toSafeErrorMessage } from '../utils';

interface NetLabelPlacement {
	componentId: string;
	pinIdentifier: string; // 引脚号或引脚名
	netName: string;
}

interface NetLabelPlaceRequest {
	placements: NetLabelPlacement[];
}

interface ComponentApi {
	context: unknown;
	getAllPinsByPrimitiveId: (primitiveId: string) => Promise<Array<unknown>>;
}

interface NetFlagApi {
	context: unknown;
	createNetFlag: (
		identification: 'Power' | 'Ground' | 'AnalogGround' | 'ProtectGround',
		net: string,
		x: number,
		y: number,
		rotation?: number,
		mirror?: boolean,
	) => Promise<unknown>;
}

interface PinObject {
	x: number;
	y: number;
	rotation: number;
	pinLength: number;
	pinNumber: string;
	pinName: string;
	net?: string;
}

// 解析单个网络标签放置参数
function normalizePlacement(raw: unknown, index: number): NetLabelPlacement {
	if (!isPlainObjectRecord(raw)) {
		throw new TypeError(`placements[${String(index)}] 必须为对象。`);
	}

	const componentId = String(raw.componentId ?? '').trim();
	const pinIdentifier = String(raw.pinIdentifier ?? '').trim();
	const netName = String(raw.netName ?? '').trim();

	if (componentId.length === 0) {
		throw new Error(`placements[${String(index)}].componentId 不能为空。`);
	}
	if (pinIdentifier.length === 0) {
		throw new Error(`placements[${String(index)}].pinIdentifier 不能为空。`);
	}
	if (netName.length === 0) {
		throw new Error(`placements[${String(index)}].netName 不能为空。`);
	}

	return { componentId, pinIdentifier, netName };
}

// 获取组件 API
function resolveComponentApi(): ComponentApi {
	const componentModule = eda.sch_PrimitiveComponent;
	if (
		!isPlainObjectRecord(componentModule)
		|| typeof componentModule.getAllPinsByPrimitiveId !== 'function'
	) {
		throw new Error('未找到 eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId API。');
	}

	return {
		context: componentModule,
		getAllPinsByPrimitiveId: componentModule.getAllPinsByPrimitiveId as (
			primitiveId: string,
		) => Promise<Array<unknown>>,
	};
}

// 获取网络标识 API
function resolveNetFlagApi(): NetFlagApi {
	const componentModule = eda.sch_PrimitiveComponent;
	if (
		!isPlainObjectRecord(componentModule)
		|| typeof componentModule.createNetFlag !== 'function'
	) {
		throw new Error('未找到 eda.sch_PrimitiveComponent.createNetFlag API。');
	}

	return {
		context: componentModule,
		createNetFlag: componentModule.createNetFlag as (
			identification: 'Power' | 'Ground' | 'AnalogGround' | 'ProtectGround',
			net: string,
			x: number,
			y: number,
			rotation?: number,
			mirror?: boolean,
		) => Promise<unknown>,
	};
}

// 查找引脚
function findPin(pins: Array<unknown>, identifier: string): PinObject | null {
	for (let i = 0; i < pins.length; i += 1) {
		const pin = pins[i];
		if (!isPlainObjectRecord(pin)) {
			continue;
		}

		const pinNumber = String(pin.pinNumber ?? '').trim();
		const pinName = String(pin.pinName ?? '').trim();
		const net = String(pin.net ?? '').trim();

		if (
			pinNumber === identifier
			|| pinName === identifier
			|| (net.length > 0 && net === identifier)
		) {
			return {
				x: Number(pin.x ?? 0),
				y: Number(pin.y ?? 0),
				rotation: Number(pin.rotation ?? 0),
				pinLength: Number(pin.pinLength ?? 0),
				pinNumber,
				pinName,
				net: net.length > 0 ? net : undefined,
			};
		}
	}

	return null;
}

// 计算标签偏移量（直接放在引脚位置，无偏移）
function calculateLabelOffset(
	rotation: number,
	pinLength: number,
	netFlagType: 'Power' | 'Ground' | 'AnalogGround' | 'ProtectGround',
): { x: number; y: number } {
	// 所有类型的网络标签/符号都直接放在引脚坐标上，不添加偏移
	return { x: 0, y: 0 };
}

// 检测网络标识类型（电源/地/自定义）
function detectNetFlagType(netName: string): 'Power' | 'Ground' | 'AnalogGround' | 'ProtectGround' {
	const name = netName.toUpperCase();

	// 保护地
	if (/^(PE|PGND|PROTECTIVE|EARTH)/.test(name)) {
		return 'ProtectGround';
	}

	// 模拟地
	if (/^(AGND|ANALOG|GND_A)/.test(name)) {
		return 'AnalogGround';
	}

	// 普通地
	if (/^(GND|VSS|V-|DGND|GROUND|GND_D)/.test(name) || name === 'GND' || name === 'VSS') {
		return 'Ground';
	}

	// 其他所有网络（包括电源和自定义网络）统一使用 Power 类型
	// VCC、VDD、+5V 等传统电源网络
	// LED_SIGNAL、UART_TX 等自定义网络
	// 都使用 Power 类型符号，网络名保持自定义
	return 'Power';
}

/**
 * 处理网络标签放置任务。
 * @param payload 任务参数。
 * @returns 放置结果。
 */
export async function handleNetLabelPlaceTask(payload: unknown): Promise<unknown> {
	if (!isPlainObjectRecord(payload)) {
		throw new TypeError('netlabel/place 任务参数必须为对象。');
	}

	const rawPlacements = payload.placements;
	if (!Array.isArray(rawPlacements)) {
		throw new TypeError('缺少 placements 参数，且其必须为数组。');
	}
	if (rawPlacements.length < 1) {
		throw new Error('placements 不能为空，至少需要提供一个待放置的网络标签。');
	}
	if (rawPlacements.length > 100) {
		throw new Error('placements 数量过多，单次最多允许 100 个网络标签。');
	}

	const placements = rawPlacements.map((item: unknown, index: number) =>
		normalizePlacement(item, index),
	);

	const componentApi = resolveComponentApi();
	const netFlagApi = resolveNetFlagApi();

	const results = [];
	let successCount = 0;
	let failureCount = 0;

	for (let i = 0; i < placements.length; i += 1) {
		const placement = placements[i];

		try {
			// 获取器件的所有引脚
			const pins = await Promise.resolve(
				componentApi.getAllPinsByPrimitiveId.call(componentApi.context, placement.componentId),
			);

			if (!Array.isArray(pins) || pins.length === 0) {
				results.push({
					index: i,
					componentId: placement.componentId,
					pinIdentifier: placement.pinIdentifier,
					netName: placement.netName,
					success: false,
					error: '未找到器件引脚，请检查 componentId 是否正确。',
				});
				failureCount += 1;
				continue;
			}

			// 查找目标引脚
			const pin = findPin(pins, placement.pinIdentifier);
			if (!pin) {
				results.push({
					index: i,
					componentId: placement.componentId,
					pinIdentifier: placement.pinIdentifier,
					netName: placement.netName,
					success: false,
					error: `未找到引脚 "${placement.pinIdentifier}"，请检查引脚编号或名称。`,
				});
				failureCount += 1;
				continue;
			}

			// 检测网络类型（所有网络都使用网络符号）
			const netFlagType = detectNetFlagType(placement.netName);

			// 计算标签位置（加上偏移量）
			const offset = calculateLabelOffset(pin.rotation, pin.pinLength, netFlagType);
			const labelX = pin.x + offset.x;
			const labelY = pin.y + offset.y;

			// 创建网络符号（统一使用 createNetFlag）
			// 自定义网络名（如 LED_SIGNAL）也使用 Power 类型符号
			const result = await Promise.resolve(
				netFlagApi.createNetFlag.call(
					netFlagApi.context,
					netFlagType,
					placement.netName,
					labelX,
					labelY,
					0, // rotation
					false, // mirror
				),
			);

			if (result) {
				results.push({
					index: i,
					componentId: placement.componentId,
					pinIdentifier: placement.pinIdentifier,
					netName: placement.netName,
					success: true,
					type: netFlagType,
					position: { x: labelX, y: labelY },
				});
				successCount += 1;
			} else {
				results.push({
					index: i,
					componentId: placement.componentId,
					pinIdentifier: placement.pinIdentifier,
					netName: placement.netName,
					success: false,
					error: 'API 返回空结果，创建失败。',
				});
				failureCount += 1;
			}
		} catch (error: unknown) {
			results.push({
				index: i,
				componentId: placement.componentId,
				pinIdentifier: placement.pinIdentifier,
				netName: placement.netName,
				success: false,
				error: toSafeErrorMessage(error),
			});
			failureCount += 1;
		}
	}

	return {
		ok: true,
		successCount,
		failureCount,
		total: placements.length,
		results,
		message: `网络标签放置完成：成功 ${String(successCount)} 个，失败 ${String(failureCount)} 个。`,
	};
}

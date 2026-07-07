/**
 * ------------------------------------------------------------------------
 * 名称：网络标签修改任务处理器
 * 说明：修改指定引脚附近或指定 ID 的网络标签名称。
 *       作为备用方案，用于修正已放置的网络标签。
 * 作者：Lion
 * 邮箱：chengbin@3578.cn
 * 日期：2026-07-04
 * 备注：支持按引脚位置查找或按图元 ID 直接修改。
 * ------------------------------------------------------------------------
 */

import { isPlainObjectRecord, toSafeErrorMessage } from '../utils';

interface NetLabelModifyRequest {
	target:
		| { type: 'primitiveId'; primitiveId: string }
		| { type: 'pin'; componentId: string; pinIdentifier: string };
	newNetName: string;
}

interface ComponentApi {
	context: unknown;
	getAllPinsByPrimitiveId: (primitiveId: string) => Promise<Array<unknown>>;
}

interface AttributeApi {
	context: unknown;
	modify: (
		primitiveId: string,
		property: { value?: string },
	) => Promise<unknown>;
	get: (primitiveId: string) => Promise<unknown>;
}

interface DocumentApi {
	context: unknown;
	getPrimitivesInRegion: (
		x1: number,
		y1: number,
		x2: number,
		y2: number,
	) => Promise<Array<unknown>>;
}

interface PinObject {
	x: number;
	y: number;
	pinNumber: string;
	pinName: string;
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

// 获取属性 API
function resolveAttributeApi(): AttributeApi {
	const attributeModule = eda.sch_PrimitiveAttribute;
	if (
		!isPlainObjectRecord(attributeModule)
		|| typeof attributeModule.modify !== 'function'
		|| typeof attributeModule.get !== 'function'
	) {
		throw new Error('未找到 eda.sch_PrimitiveAttribute API。');
	}

	return {
		context: attributeModule,
		modify: attributeModule.modify as (
			primitiveId: string,
			property: { value?: string },
		) => Promise<unknown>,
		get: attributeModule.get as (primitiveId: string) => Promise<unknown>,
	};
}

// 获取文档 API
function resolveDocumentApi(): DocumentApi {
	const documentModule = eda.sch_Document;
	if (
		!isPlainObjectRecord(documentModule)
		|| typeof documentModule.getPrimitivesInRegion !== 'function'
	) {
		throw new Error('未找到 eda.sch_Document.getPrimitivesInRegion API。');
	}

	return {
		context: documentModule,
		getPrimitivesInRegion: documentModule.getPrimitivesInRegion as (
			x1: number,
			y1: number,
			x2: number,
			y2: number,
		) => Promise<Array<unknown>>,
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

		if (pinNumber === identifier || pinName === identifier) {
			return {
				x: Number(pin.x ?? 0),
				y: Number(pin.y ?? 0),
				pinNumber,
				pinName,
			};
		}
	}

	return null;
}

// 在引脚附近查找网络标签（属性图元）
function findNetLabelNearPin(primitives: Array<unknown>, pinX: number, pinY: number): string | null {
	const searchRadius = 30; // 搜索半径（mil）

	for (let i = 0; i < primitives.length; i += 1) {
		const primitive = primitives[i];
		if (!isPlainObjectRecord(primitive)) {
			continue;
		}

		// 检查是否是属性图元（网络标签）
		const primitiveType = String(primitive.primitiveType ?? '');
		if (primitiveType !== 'ATTRIBUTE') {
			continue;
		}

		const x = Number(primitive.x ?? 0);
		const y = Number(primitive.y ?? 0);
		const distance = Math.sqrt((x - pinX) ** 2 + (y - pinY) ** 2);

		if (distance <= searchRadius) {
			const primitiveId = String(primitive.primitiveId ?? '').trim();
			if (primitiveId.length > 0) {
				return primitiveId;
			}
		}
	}

	return null;
}

/**
 * 处理网络标签修改任务。
 * @param payload 任务参数。
 * @returns 修改结果。
 */
export async function handleNetLabelModifyTask(payload: unknown): Promise<unknown> {
	if (!isPlainObjectRecord(payload)) {
		throw new TypeError('netlabel/modify 任务参数必须为对象。');
	}

	const target = payload.target;
	const newNetName = String(payload.newNetName ?? '').trim();

	if (!isPlainObjectRecord(target)) {
		throw new TypeError('target 参数必须为对象。');
	}
	if (newNetName.length === 0) {
		throw new Error('newNetName 不能为空。');
	}

	const targetType = String(target.type ?? '').trim();

	let primitiveId: string | null = null;
	let oldNetName: string | undefined;

	// 方式 1：直接通过 primitiveId 修改
	if (targetType === 'primitiveId') {
		primitiveId = String(target.primitiveId ?? '').trim();
		if (primitiveId.length === 0) {
			throw new Error('target.primitiveId 不能为空。');
		}
	}
	// 方式 2：通过引脚位置查找网络标签
	else if (targetType === 'pin') {
		const componentId = String(target.componentId ?? '').trim();
		const pinIdentifier = String(target.pinIdentifier ?? '').trim();

		if (componentId.length === 0) {
			throw new Error('target.componentId 不能为空。');
		}
		if (pinIdentifier.length === 0) {
			throw new Error('target.pinIdentifier 不能为空。');
		}

		const componentApi = resolveComponentApi();
		const documentApi = resolveDocumentApi();

		// 获取器件引脚
		const pins = await Promise.resolve(
			componentApi.getAllPinsByPrimitiveId.call(componentApi.context, componentId),
		);

		if (!Array.isArray(pins) || pins.length === 0) {
			throw new Error('未找到器件引脚，请检查 componentId 是否正确。');
		}

		// 查找目标引脚
		const pin = findPin(pins, pinIdentifier);
		if (!pin) {
			throw new Error(`未找到引脚 "${pinIdentifier}"，请检查引脚编号或名称。`);
		}

		// 在引脚附近搜索网络标签
		const searchRadius = 30;
		const primitives = await Promise.resolve(
			documentApi.getPrimitivesInRegion.call(
				documentApi.context,
				pin.x - searchRadius,
				pin.y - searchRadius,
				pin.x + searchRadius,
				pin.y + searchRadius,
			),
		);

		if (!Array.isArray(primitives)) {
			throw new Error('getPrimitivesInRegion 返回无效结果。');
		}

		primitiveId = findNetLabelNearPin(primitives, pin.x, pin.y);
		if (!primitiveId) {
			throw new Error(`在引脚 "${pinIdentifier}" 附近未找到网络标签，请检查是否已放置。`);
		}
	} else {
		throw new Error('target.type 必须为 "primitiveId" 或 "pin"。');
	}

	// 获取当前网络标签信息
	const attributeApi = resolveAttributeApi();
	try {
		const currentAttribute = await Promise.resolve(
			attributeApi.get.call(attributeApi.context, primitiveId),
		);

		if (isPlainObjectRecord(currentAttribute)) {
			oldNetName = String(currentAttribute.value ?? '').trim();
		}
	} catch {
		// 忽略获取失败，继续修改
	}

	// 修改网络标签名称
	const result = await Promise.resolve(
		attributeApi.modify.call(attributeApi.context, primitiveId, {
			value: newNetName,
		}),
	);

	if (!result) {
		return {
			ok: false,
			error: 'API 返回空结果，修改失败。',
		};
	}

	return {
		ok: true,
		primitiveId,
		oldNetName: oldNetName || '(未知)',
		newNetName,
		message: `网络标签已修改：${oldNetName || '(未知)'} → ${newNetName}`,
	};
}

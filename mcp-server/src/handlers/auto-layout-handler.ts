/**
 * ------------------------------------------------------------------------
 * 名称：自动布局任务处理
 * 说明：调用 EDA 的 autoLayout BETA API 实现原理图器件自动布局
 * 作者：Lion
 * 邮箱：chengbin@3578.cn
 * 日期：2026-07-02
 * 备注：封装 eda.sch_Document.autoLayout API
 * ------------------------------------------------------------------------
 */

import { isPlainObjectRecord, toSafeErrorMessage } from '../utils/index.js';

interface AutoLayoutProps {
	uuids?: string[];
	netlist?: {
		component: {
			[uniqueId: string]: {
				pinInfoMap: {
					[key: string]: {
						name: string;
						number: string;
						net: string;
						props: {
							'Pin Number': string;
						};
					};
				};
			};
		};
	};
	designatorDeviceTypeMap?: {
		[designator: string]: 'resistor' | 'capacitor' | 'inductive' | 'diode' | 'triode' | 'oscillator' | 'chip' | 'otherDevice';
	};
}

interface SchDocumentApi {
	context: unknown;
	autoLayout: (props?: AutoLayoutProps) => Promise<unknown>;
}

/**
 * 解析 EDA 的 sch_Document API。
 * @returns sch_Document API 对象。
 */
function resolveSchDocumentApi(): SchDocumentApi {
	const edaGlobal = (globalThis as unknown as { eda?: unknown }).eda;
	if (!edaGlobal || typeof edaGlobal !== 'object') {
		throw new Error('EDA 环境未就绪，无法访问 eda 全局对象。');
	}

	const schDocModule = (edaGlobal as { sch_Document?: unknown }).sch_Document;
	if (!isPlainObjectRecord(schDocModule) || typeof schDocModule.autoLayout !== 'function') {
		throw new Error('未找到 eda.sch_Document.autoLayout API。此功能需要 EDA 支持 BETA 功能，请确保使用最新版本的嘉立创 EDA 专业版。');
	}

	return {
		context: schDocModule,
		autoLayout: schDocModule.autoLayout as (props?: AutoLayoutProps) => Promise<unknown>,
	};
}

/**
 * 验证并规范化 uuids 参数。
 * @param raw 原始 uuids 数据。
 * @returns 规范化后的 uuids 数组或 undefined。
 */
function normalizeUuids(raw: unknown): string[] | undefined {
	if (raw === undefined || raw === null) {
		return undefined;
	}

	if (!Array.isArray(raw)) {
		throw new TypeError('uuids 必须为数组。');
	}

	if (raw.length === 0) {
		return undefined;
	}

	const result: string[] = [];
	for (let i = 0; i < raw.length; i += 1) {
		const uuid = String(raw[i] ?? '').trim();
		if (uuid.length === 0) {
			throw new Error(`uuids[${String(i)}] 不能为空字符串。`);
		}
		result.push(uuid);
	}

	return result;
}

/**
 * 验证器件类型映射。
 * @param raw 原始 designatorDeviceTypeMap 数据。
 * @returns 规范化后的器件类型映射或 undefined。
 */
function normalizeDesignatorDeviceTypeMap(raw: unknown): AutoLayoutProps['designatorDeviceTypeMap'] | undefined {
	if (raw === undefined || raw === null) {
		return undefined;
	}

	if (!isPlainObjectRecord(raw)) {
		throw new TypeError('designatorDeviceTypeMap 必须为对象。');
	}

	const validTypes = new Set(['resistor', 'capacitor', 'inductive', 'diode', 'triode', 'oscillator', 'chip', 'otherDevice']);
	const result: { [designator: string]: any } = {};

	for (const key in raw) {
		if (Object.prototype.hasOwnProperty.call(raw, key)) {
			const value = String(raw[key] ?? '').trim();
			if (!validTypes.has(value)) {
				throw new Error(`designatorDeviceTypeMap["${key}"] 的值 "${value}" 不是有效的器件类型。有效类型：resistor, capacitor, inductive, diode, triode, oscillator, chip, otherDevice。`);
			}
			result[key] = value;
		}
	}

	return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * 处理自动布局任务。
 * @param payload 任务参数。
 * @returns 自动布局结果。
 */
export async function handleAutoLayoutTask(payload: unknown): Promise<unknown> {
	try {
		const schDocApi = resolveSchDocumentApi();

		let props: AutoLayoutProps | undefined;

		if (payload !== null && payload !== undefined) {
			if (!isPlainObjectRecord(payload)) {
				throw new TypeError('auto/layout 任务参数必须为对象。');
			}

			const uuids = normalizeUuids(payload.uuids);
			const designatorDeviceTypeMap = normalizeDesignatorDeviceTypeMap(payload.designatorDeviceTypeMap);
			const netlist = payload.netlist as AutoLayoutProps['netlist'] | undefined;

			// 仅在有参数时构建 props 对象
			if (uuids || designatorDeviceTypeMap || netlist) {
				props = {
					uuids,
					netlist,
					designatorDeviceTypeMap,
				};
			}
		}

		const result = await Promise.resolve(schDocApi.autoLayout.call(schDocApi.context, props));

		return {
			ok: true,
			result,
			message: props?.uuids
				? `已对 ${String(props.uuids.length)} 个指定器件执行自动布局。`
				: '已对所有器件执行自动布局。',
		};
	}
	catch (error: unknown) {
		return {
			ok: false,
			error: toSafeErrorMessage(error),
			errorCode: 'AUTO_LAYOUT_FAILED',
		};
	}
}

/**
 * ------------------------------------------------------------------------
 * 名称：桥接器件放置任务处理
 * 说明：校验待放置器件参数，并提供放置会话启动、轮询和清理能力。
 * 作者：Lion
 * 邮箱：chengbin@3578.cn
 * 日期：2026-03-24
 * 备注：仅处理 component/place 任务。
 * ------------------------------------------------------------------------
 */

import { isPlainObjectRecord, toSafeErrorMessage } from '../utils';

interface ComponentPlaceItem {
	uuid: string;
	libraryUuid: string;
	name: string;
	footprintName: string;
	subPartName: string;
}

interface ComponentPlaceRequest {
	protocol: string;
	title: string;
	description: string;
	components: ComponentPlaceItem[];
	timeoutSeconds: number;
	retryCount: number;
}

interface PlaceComponentApi {
	context: unknown;
	placeComponentWithMouse: (component: { libraryUuid: string; uuid: string }, subPartName?: string) => Promise<boolean>;
	getAllPrimitiveId: () => Promise<string[]>;
}

interface FollowMouseTipApi {
	context: unknown;
	show: (tip: string, msTimeout?: number) => Promise<void>;
	remove: (tip?: string) => Promise<void>;
}

interface ActivePlaceSession {
	sessionId: string;
	referenceIds: Set<string>;
	tipText: string;
	followMouseTipApi: FollowMouseTipApi | null;
	placeApi: PlaceComponentApi;
	createdAt: number;
	cancelledByRightClick: boolean;
	cancelHandler: ((event: Event) => void) | null;
}

const COMPONENT_PLACE_PROTOCOL = 'component-place/v1';
const activePlaceSessions = new Map<string, ActivePlaceSession>();

function createPlaceSessionId(): string {
	return `component_place_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		globalThis.setTimeout(resolve, ms);
	});
}

// 规范化单个待放置器件参数。
function normalizeComponentPlaceItem(raw: unknown, index: number): ComponentPlaceItem {
	if (!isPlainObjectRecord(raw)) {
		throw new TypeError(`components[${String(index)}] 必须为对象。`);
	}

	const uuid = String(raw.uuid ?? '').trim();
	const libraryUuid = String(raw.libraryUuid ?? '').trim();
	if (uuid.length === 0) {
		throw new Error(`components[${String(index)}].uuid 不能为空。`);
	}
	if (libraryUuid.length === 0) {
		throw new Error(`components[${String(index)}].libraryUuid 不能为空。`);
	}

	return {
		uuid,
		libraryUuid,
		name: String(raw.name ?? '').trim(),
		footprintName: String(raw.footprintName ?? '').trim(),
		subPartName: String(raw.subPartName ?? '').trim(),
	};
}

// 解析超时参数。
function resolveTimeoutSeconds(rawValue: unknown): number {
	if (rawValue === undefined || rawValue === null || rawValue === '') {
		return 60;
	}

	const timeoutSeconds = Number(rawValue);
	if (!Number.isFinite(timeoutSeconds)) {
		throw new TypeError('timeoutSeconds 必须为数字。');
	}
	if (!Number.isInteger(timeoutSeconds)) {
		throw new TypeError('timeoutSeconds 必须为整数。');
	}
	if (timeoutSeconds < 30 || timeoutSeconds > 180) {
		throw new Error('timeoutSeconds 超出允许范围，必须在 30 到 180 秒之间。');
	}

	return timeoutSeconds;
}

function formatComponentTitle(component: ComponentPlaceItem): string {
	if (component.name.length > 0) {
		return component.name;
	}

	return `${component.libraryUuid}/${component.uuid}`;
}

function resolvePlaceComponentApi(): PlaceComponentApi {
	const edaGlobal = (globalThis as unknown as { eda?: unknown }).eda;
	if (!edaGlobal || typeof edaGlobal !== 'object') {
		throw new Error('EDA 环境未就绪，无法访问 eda 全局对象。');
	}

	const componentModule = (edaGlobal as { sch_PrimitiveComponent?: unknown }).sch_PrimitiveComponent;
	if (!isPlainObjectRecord(componentModule)
		|| typeof componentModule.placeComponentWithMouse !== 'function'
		|| typeof componentModule.getAllPrimitiveId !== 'function') {
		throw new Error('未找到 eda.sch_PrimitiveComponent.placeComponentWithMouse API。');
	}

	return {
		context: componentModule,
		placeComponentWithMouse: componentModule.placeComponentWithMouse as (component: { libraryUuid: string; uuid: string }, subPartName?: string) => Promise<boolean>,
		getAllPrimitiveId: componentModule.getAllPrimitiveId as () => Promise<string[]>,
	};
}

function resolveFollowMouseTipApi(): FollowMouseTipApi | null {
	const edaGlobal = (globalThis as unknown as { eda?: unknown }).eda;
	if (!edaGlobal || typeof edaGlobal !== 'object') {
		return null;
	}

	const messageModule = (edaGlobal as { sys_Message?: unknown }).sys_Message;
	if (!isPlainObjectRecord(messageModule)
		|| typeof messageModule.showFollowMouseTip !== 'function'
		|| typeof messageModule.removeFollowMouseTip !== 'function') {
		return null;
	}

	return {
		context: messageModule,
		show: messageModule.showFollowMouseTip as (tip: string, msTimeout?: number) => Promise<void>,
		remove: messageModule.removeFollowMouseTip as (tip?: string) => Promise<void>,
	};
}

async function cleanupPlaceSession(sessionId: string): Promise<void> {
	const session = activePlaceSessions.get(sessionId);
	if (!session) {
		return;
	}

	activePlaceSessions.delete(sessionId);
	// 移除鼠标右键取消监听器。
	if (session.cancelHandler) {
		const docRef = (globalThis as unknown as { document?: Document }).document;
		if (docRef) {
			docRef.removeEventListener('mousedown', session.cancelHandler, { capture: true });
		}
		session.cancelHandler = null;
	}
	if (session.followMouseTipApi) {
		try {
			await session.followMouseTipApi.remove.call(session.followMouseTipApi.context, session.tipText);
		}
		catch {
			// 清理提示失败时不影响主流程。
		}
	}
}

/**
 * 处理器件放置任务。
 * @param payload 任务参数。
 * @returns 交互放置任务描述。
 */
export async function handleComponentPlaceTask(payload: unknown): Promise<unknown> {
	if (!isPlainObjectRecord(payload)) {
		throw new TypeError('component/place 任务参数必须为对象。');
	}

	const rawComponents = payload.components;
	if (!Array.isArray(rawComponents)) {
		throw new TypeError('缺少 components 参数，且其必须为数组。');
	}
	if (rawComponents.length < 1) {
		throw new Error('components 不能为空，至少需要提供一个待放置器件。');
	}
	if (rawComponents.length > 50) {
		throw new Error('components 数量过多，单次最多允许 50 个器件。');
	}

	const timeoutSeconds = resolveTimeoutSeconds(payload.timeoutSeconds);
	const components = rawComponents.map((item: unknown, index: number) => normalizeComponentPlaceItem(item, index));

	const placement: ComponentPlaceRequest = {
		protocol: COMPONENT_PLACE_PROTOCOL,
		title: '原理图器件放置',
		description: `请按顺序在原理图中放置以下 ${String(components.length)} 个器件。单个器件超时后，工具会在当前尝试结束后自动重试 1 次。`,
		components,
		timeoutSeconds,
		retryCount: 1,
	};

	return {
		ok: true,
		placement,
		message: `已创建 ${String(components.length)} 个器件的交互放置任务。`,
	};
}

/**
 * 启动单个器件的交互放置会话。
 * @param payload 单个器件放置参数。
 * @returns 放置会话标识。
 */
export async function handleComponentPlaceStartTask(payload: unknown): Promise<unknown> {
	if (!isPlainObjectRecord(payload)) {
		throw new TypeError('component/place/start 任务参数必须为对象。');
	}

	const component = normalizeComponentPlaceItem(payload.component, 0);

	const timeoutSeconds = resolveTimeoutSeconds(payload.timeoutSeconds);
	const timeoutMs = timeoutSeconds * 1000;
	const placeApi = resolvePlaceComponentApi();
	const followMouseTipApi = resolveFollowMouseTipApi();
	const tipText = `请在原理图中放置器件：${formatComponentTitle(component)}`;

	if (followMouseTipApi) {
		void Promise.resolve(followMouseTipApi.show.call(followMouseTipApi.context, tipText, timeoutMs)).catch(() => undefined);
	}

	try {
		const started = await Promise.resolve(placeApi.placeComponentWithMouse.call(
			placeApi.context,
			{ uuid: component.uuid, libraryUuid: component.libraryUuid },
			component.subPartName || undefined,
		));
		if (!started) {
			if (followMouseTipApi) {
				try {
					await followMouseTipApi.remove.call(followMouseTipApi.context, tipText);
				}
				catch {
					// 忽略提示移除失败。
				}
			}
			return {
				ok: false,
				error: 'placeComponentWithMouse 返回 false，交互放置会话未能启动。',
			};
		}

		await delay(500);

		const referenceIds = new Set<string>();
		try {
			const currentIds = await Promise.resolve(placeApi.getAllPrimitiveId.call(placeApi.context));
			for (let index = 0; index < currentIds.length; index += 1) {
				const primitiveId = String(currentIds[index] || '').trim();
				if (primitiveId.length > 0) {
					referenceIds.add(primitiveId);
				}
			}
		}
		catch (error: unknown) {
			// 基线快照失败时保持空集合，后续任意新图元都视为放置完成。
			// 这是一个合理的降级策略，因为空集合会让任何新增图元都被检测到。
			console.warn('获取基线图元列表失败，将使用空基线：', toSafeErrorMessage(error));
		}

		const sessionId = createPlaceSessionId();
		const session: ActivePlaceSession = {
			sessionId,
			referenceIds,
			tipText,
			followMouseTipApi,
			placeApi,
			createdAt: Date.now(),
			cancelledByRightClick: false,
			cancelHandler: null,
		};
		activePlaceSessions.set(sessionId, session);

		// 注册鼠标右键取消监听器，当用户在 EDA 中右键取消放置时，立即标记会话已取消。
		const docRef = (globalThis as unknown as { document?: Document }).document;
		if (docRef) {
			session.cancelHandler = (event: Event): void => {
				if ((event as MouseEvent).button !== 2) {
					return;
				}
				const sess = activePlaceSessions.get(sessionId);
				if (sess) {
					sess.cancelledByRightClick = true;
				}
			};
			docRef.addEventListener('mousedown', session.cancelHandler, { capture: true });
		}

		return {
			ok: true,
			sessionId,
		};
	}
	catch (error: unknown) {
		if (followMouseTipApi) {
			try {
				await followMouseTipApi.remove.call(followMouseTipApi.context, tipText);
			}
			catch {
				// 忽略提示移除失败。
			}
		}

		return {
			ok: false,
			error: toSafeErrorMessage(error),
		};
	}
}

/**
 * 轮询单个器件的交互放置状态。
 * @param payload 放置会话参数。
 * @returns 当前是否已完成放置。
 */
export async function handleComponentPlaceCheckTask(payload: unknown): Promise<unknown> {
	if (!isPlainObjectRecord(payload)) {
		throw new TypeError('component/place/check 任务参数必须为对象。');
	}

	const sessionId = String(payload.sessionId ?? '').trim();
	if (sessionId.length === 0) {
		throw new Error('component/place/check 缺少 sessionId 参数。');
	}

	const session = activePlaceSessions.get(sessionId);
	if (!session) {
		return {
			ok: false,
			error: '未找到对应的器件放置会话。',
		};
	}

	try {
		// 用户右键取消放置（mousedown 事件已标记），优先于图元 ID 检测立即返回。
		if (session.cancelledByRightClick) {
			await cleanupPlaceSession(sessionId);
			return {
				ok: true,
				placed: false,
				userCancelled: true,
			};
		}

		const currentIds = await Promise.resolve(session.placeApi.getAllPrimitiveId.call(session.placeApi.context));
		for (let index = 0; index < currentIds.length; index += 1) {
			const primitiveId = String(currentIds[index] || '').trim();
			if (primitiveId.length > 0 && !session.referenceIds.has(primitiveId)) {
				await cleanupPlaceSession(sessionId);
				return {
					ok: true,
					placed: true,
					userCancelled: false,
				};
			}
		}

		// 检测基线图元是否消失（用户右键取消，浮动图元被移除）。
		if (session.referenceIds.size > 0) {
			const currentIdSet = new Set<string>(currentIds.map((id: string) => String(id || '').trim()).filter((id: string) => id.length > 0));
			for (const refId of session.referenceIds) {
				if (!currentIdSet.has(refId)) {
					await cleanupPlaceSession(sessionId);
					return {
						ok: true,
						placed: false,
						userCancelled: true,
					};
				}
			}
		}

		return {
			ok: true,
			placed: false,
			userCancelled: false,
		};
	}
	catch (error: unknown) {
		return {
			ok: false,
			error: toSafeErrorMessage(error),
		};
	}
}

/**
 * 主动清理单个器件放置会话。
 * @param payload 放置会话参数。
 * @returns 清理结果。
 */
export async function handleComponentPlaceCloseTask(payload: unknown): Promise<unknown> {
	if (!isPlainObjectRecord(payload)) {
		throw new TypeError('component/place/close 任务参数必须为对象。');
	}

	const sessionId = String(payload.sessionId ?? '').trim();
	if (sessionId.length === 0) {
		throw new Error('component/place/close 缺少 sessionId 参数。');
	}

	await cleanupPlaceSession(sessionId);
	return {
		ok: true,
	};
}

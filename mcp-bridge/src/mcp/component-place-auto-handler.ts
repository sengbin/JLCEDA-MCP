/**
 * ------------------------------------------------------------------------
 * 名称：桥接器件自动坐标放置任务处理
 * 说明：根据指定坐标或自动布局策略在原理图中放置器件。
 * 作者：Lion
 * 邮箱：chengbin@3578.cn
 * 日期：2026-07-03
 * 备注：仅处理 component/place-auto 任务。
 * ------------------------------------------------------------------------
 */

import { isPlainObjectRecord, toSafeErrorMessage } from '../utils';

interface ComponentPlaceAutoItem {
	uuid: string;
	libraryUuid: string;
	name?: string;
	subPartName?: string;
	x?: number;
	y?: number;
	rotation?: number;
	mirror?: boolean;
}

interface GridLayoutConfig {
	startX?: number;
	startY?: number;
	spacingX?: number;
	spacingY?: number;
	columns?: number;
}

interface LinearLayoutConfig {
	startX?: number;
	startY?: number;
	spacing?: number;
}

interface FixedPositionConfig {
	x?: number;
	y?: number;
}

interface ComponentCreateApi {
	context: unknown;
	create: (
		component: { libraryUuid: string; uuid: string },
		x: number,
		y: number,
		subPartName?: string,
		rotation?: number,
		mirror?: boolean,
		addIntoBom?: boolean,
		addIntoPcb?: boolean,
	) => Promise<unknown>;
}

const DEFAULT_GRID_START_X = 0;
const DEFAULT_GRID_START_Y = 0;
const DEFAULT_GRID_SPACING_X = 1500;
const DEFAULT_GRID_SPACING_Y = 1500;
const DEFAULT_GRID_COLUMNS = 4;

const DEFAULT_LINEAR_START_X = 0;
const DEFAULT_LINEAR_START_Y = 0;
const DEFAULT_LINEAR_SPACING = 1500;

const DEFAULT_FIXED_X = 0;
const DEFAULT_FIXED_Y = 0;

// 解析器件放置项参数。
function normalizeComponentPlaceAutoItem(raw: unknown, index: number): ComponentPlaceAutoItem {
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

	const item: ComponentPlaceAutoItem = {
		uuid,
		libraryUuid,
		name: String(raw.name ?? '').trim(),
		subPartName: String(raw.subPartName ?? '').trim(),
	};

	if (raw.x !== undefined && raw.x !== null) {
		const x = Number(raw.x);
		if (!Number.isFinite(x)) {
			throw new TypeError(`components[${String(index)}].x 必须为数字。`);
		}
		item.x = x;
	}

	if (raw.y !== undefined && raw.y !== null) {
		const y = Number(raw.y);
		if (!Number.isFinite(y)) {
			throw new TypeError(`components[${String(index)}].y 必须为数字。`);
		}
		item.y = y;
	}

	if (raw.rotation !== undefined && raw.rotation !== null) {
		const rotation = Number(raw.rotation);
		if (!Number.isFinite(rotation)) {
			throw new TypeError(`components[${String(index)}].rotation 必须为数字。`);
		}
		if (![0, 90, 180, 270].includes(rotation)) {
			throw new Error(`components[${String(index)}].rotation 只能为 0、90、180、270。`);
		}
		item.rotation = rotation;
	}

	if (raw.mirror !== undefined && raw.mirror !== null) {
		item.mirror = Boolean(raw.mirror);
	}

	return item;
}

// 解析网格布局配置。
function parseGridLayoutConfig(raw: unknown): GridLayoutConfig {
	if (!isPlainObjectRecord(raw)) {
		return {};
	}

	const config: GridLayoutConfig = {};

	if (raw.startX !== undefined && raw.startX !== null) {
		const startX = Number(raw.startX);
		if (Number.isFinite(startX)) {
			config.startX = startX;
		}
	}

	if (raw.startY !== undefined && raw.startY !== null) {
		const startY = Number(raw.startY);
		if (Number.isFinite(startY)) {
			config.startY = startY;
		}
	}

	if (raw.spacingX !== undefined && raw.spacingX !== null) {
		const spacingX = Number(raw.spacingX);
		if (Number.isFinite(spacingX)) {
			config.spacingX = spacingX;
		}
	}

	if (raw.spacingY !== undefined && raw.spacingY !== null) {
		const spacingY = Number(raw.spacingY);
		if (Number.isFinite(spacingY)) {
			config.spacingY = spacingY;
		}
	}

	if (raw.columns !== undefined && raw.columns !== null) {
		const columns = Number(raw.columns);
		if (Number.isFinite(columns) && Number.isInteger(columns) && columns > 0) {
			config.columns = columns;
		}
	}

	return config;
}

// 解析线性布局配置。
function parseLinearLayoutConfig(raw: unknown): LinearLayoutConfig {
	if (!isPlainObjectRecord(raw)) {
		return {};
	}

	const config: LinearLayoutConfig = {};

	if (raw.startX !== undefined && raw.startX !== null) {
		const startX = Number(raw.startX);
		if (Number.isFinite(startX)) {
			config.startX = startX;
		}
	}

	if (raw.startY !== undefined && raw.startY !== null) {
		const startY = Number(raw.startY);
		if (Number.isFinite(startY)) {
			config.startY = startY;
		}
	}

	if (raw.spacing !== undefined && raw.spacing !== null) {
		const spacing = Number(raw.spacing);
		if (Number.isFinite(spacing)) {
			config.spacing = spacing;
		}
	}

	return config;
}

// 解析固定位置配置。
function parseFixedPositionConfig(raw: unknown): FixedPositionConfig {
	if (!isPlainObjectRecord(raw)) {
		return {};
	}

	const config: FixedPositionConfig = {};

	if (raw.x !== undefined && raw.x !== null) {
		const x = Number(raw.x);
		if (Number.isFinite(x)) {
			config.x = x;
		}
	}

	if (raw.y !== undefined && raw.y !== null) {
		const y = Number(raw.y);
		if (Number.isFinite(y)) {
			config.y = y;
		}
	}

	return config;
}

// 计算器件的放置坐标。
function calculateComponentPosition(
	index: number,
	component: ComponentPlaceAutoItem,
	layoutStrategy: string,
	gridConfig: GridLayoutConfig,
	linearConfig: LinearLayoutConfig,
	fixedConfig: FixedPositionConfig,
): { x: number; y: number } {
	// 如果器件已指定坐标，直接使用。
	if (component.x !== undefined && component.y !== undefined) {
		return { x: component.x, y: component.y };
	}

	if (layoutStrategy === 'grid') {
		const startX = gridConfig.startX ?? DEFAULT_GRID_START_X;
		const startY = gridConfig.startY ?? DEFAULT_GRID_START_Y;
		const spacingX = gridConfig.spacingX ?? DEFAULT_GRID_SPACING_X;
		const spacingY = gridConfig.spacingY ?? DEFAULT_GRID_SPACING_Y;
		const columns = gridConfig.columns ?? DEFAULT_GRID_COLUMNS;

		const row = Math.floor(index / columns);
		const col = index % columns;

		return {
			x: startX + col * spacingX,
			y: startY + row * spacingY,
		};
	}

	if (layoutStrategy === 'horizontal') {
		const startX = linearConfig.startX ?? DEFAULT_LINEAR_START_X;
		const startY = linearConfig.startY ?? DEFAULT_LINEAR_START_Y;
		const spacing = linearConfig.spacing ?? DEFAULT_LINEAR_SPACING;

		return {
			x: startX + index * spacing,
			y: startY,
		};
	}

	if (layoutStrategy === 'vertical') {
		const startX = linearConfig.startX ?? DEFAULT_LINEAR_START_X;
		const startY = linearConfig.startY ?? DEFAULT_LINEAR_START_Y;
		const spacing = linearConfig.spacing ?? DEFAULT_LINEAR_SPACING;

		return {
			x: startX,
			y: startY + index * spacing,
		};
	}

	if (layoutStrategy === 'fixed') {
		const x = fixedConfig.x ?? DEFAULT_FIXED_X;
		const y = fixedConfig.y ?? DEFAULT_FIXED_Y;

		return { x, y };
	}

	// 默认使用网格布局。
	const startX = DEFAULT_GRID_START_X;
	const startY = DEFAULT_GRID_START_Y;
	const spacingX = DEFAULT_GRID_SPACING_X;
	const spacingY = DEFAULT_GRID_SPACING_Y;
	const columns = DEFAULT_GRID_COLUMNS;

	const row = Math.floor(index / columns);
	const col = index % columns;

	return {
		x: startX + col * spacingX,
		y: startY + row * spacingY,
	};
}

// 解析 EDA API。
function resolveComponentCreateApi(): ComponentCreateApi {
	// 直接访问 eda 全局对象，与其他handler保持一致
	if (typeof eda === 'undefined' || !eda || typeof eda !== 'object') {
		throw new Error('EDA 环境未就绪，无法访问 eda 全局对象。');
	}

	const componentModule = eda.sch_PrimitiveComponent;
	if (!componentModule || typeof componentModule.create !== 'function') {
		throw new Error('未找到 eda.sch_PrimitiveComponent.create API。');
	}

	return {
		context: componentModule,
		create: componentModule.create as ComponentCreateApi['create'],
	};
}

/**
 * 处理器件自动坐标放置任务。
 * @param payload 任务参数。
 * @returns 放置结果。
 */
export async function handleComponentPlaceAutoTask(payload: unknown): Promise<unknown> {
	if (!isPlainObjectRecord(payload)) {
		throw new TypeError('component/place-auto 任务参数必须为对象。');
	}

	const rawComponents = payload.components;
	if (!Array.isArray(rawComponents)) {
		throw new TypeError('缺少 components 参数，且其必须为数组。');
	}
	if (rawComponents.length < 1) {
		throw new Error('components 不能为空，至少需要提供一个待放置器件。');
	}
	if (rawComponents.length > 100) {
		throw new Error('components 数量过多，单次最多允许 100 个器件。');
	}

	const layoutStrategy = String(payload.layoutStrategy ?? 'grid').trim().toLowerCase();
	if (!['grid', 'horizontal', 'vertical', 'fixed'].includes(layoutStrategy)) {
		throw new Error('layoutStrategy 只能为 grid、horizontal、vertical、fixed。');
	}

	const gridConfig = parseGridLayoutConfig(payload.gridLayout);
	const linearConfig = parseLinearLayoutConfig(payload.linearLayout);
	const fixedConfig = parseFixedPositionConfig(payload.fixedPosition);

	const components = rawComponents.map((item: unknown, index: number) =>
		normalizeComponentPlaceAutoItem(item, index),
	);

	const api = resolveComponentCreateApi();
	const placedComponents: Array<{ uuid: string; libraryUuid: string; x: number; y: number }> = [];
	const failedComponents: Array<{ uuid: string; libraryUuid: string; error: string }> = [];

	for (let index = 0; index < components.length; index += 1) {
		const component = components[index];
		const position = calculateComponentPosition(
			index,
			component,
			layoutStrategy,
			gridConfig,
			linearConfig,
			fixedConfig,
		);

		try {
			await Promise.resolve(
				api.create.call(
					api.context,
					{ uuid: component.uuid, libraryUuid: component.libraryUuid },
					position.x,
					position.y,
					component.subPartName || undefined,
					component.rotation ?? 0,
					component.mirror ?? false,
					true,
					true,
				),
			);

			placedComponents.push({
				uuid: component.uuid,
				libraryUuid: component.libraryUuid,
				x: position.x,
				y: position.y,
			});
		}
		catch (error: unknown) {
			failedComponents.push({
				uuid: component.uuid,
				libraryUuid: component.libraryUuid,
				error: toSafeErrorMessage(error),
			});
		}
	}

	if (failedComponents.length > 0) {
		return {
			ok: false,
			placedCount: placedComponents.length,
			failedCount: failedComponents.length,
			totalCount: components.length,
			placedComponents,
			failedComponents,
			message: `放置了 ${String(placedComponents.length)} 个器件，${String(failedComponents.length)} 个失败。`,
		};
	}

	return {
		ok: true,
		placedCount: placedComponents.length,
		totalCount: components.length,
		placedComponents,
		message: `成功放置了全部 ${String(components.length)} 个器件。`,
	};
}

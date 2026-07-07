/**
 * ------------------------------------------------------------------------
 * 名称：（桥接离线 API 检索任务处理）
 * 说明：（在 EDA 侧读取扩展离线文档并执行关键词检索）
 * 作者：Lion
 * 邮箱：chengbin@3578.cn
 * 日期：（2026-03-13）
 * 备注：（仅处理 api/search 任务）
 * ------------------------------------------------------------------------
 */

import { isPlainObjectRecord, parseBoundedIntegerValue, toSafeErrorMessage } from '../utils/index.js';

interface ApiProjectionItem {
	id: number;
	name: string;
	fullName: string;
	kind: string;
	ownerFullName: string;
	summary: string;
	signatureText?: string;
	typeText?: string;
	returnType?: string;
	parameters?: unknown[];
}

interface ApiDocument {
	queryIndexes?: {
		symbolIdByKeyword?: Record<string, number[]>;
	};
	projections?: {
		callableApis?: ApiProjectionItem[];
		types?: ApiProjectionItem[];
	};
}

interface ApiCache {
	allItems: ApiProjectionItem[];
	callableItems: ApiProjectionItem[];
	typeItems: ApiProjectionItem[];
	itemById: Map<number, ApiProjectionItem>;
	keywordIndex: Map<string, number[]>;
}

interface EdaFileSystem {
	getExtensionFile: (uri: string) => Promise<File | undefined>;
}

const API_SEARCH_MAX_LIMIT = 50;
const API_DOCUMENT_URI = '/resources/jlceda-pro-api-doc.json';

let apiCache: ApiCache | null = null;

// 获取 EDA 文件系统对象。
function getEdaFileSystem(): EdaFileSystem {
	const fileSystem = (eda as unknown as { sys_FileSystem?: unknown }).sys_FileSystem;
	if (!isPlainObjectRecord(fileSystem) || typeof fileSystem.getExtensionFile !== 'function') {
		throw new Error('当前环境缺少 eda.sys_FileSystem.getExtensionFile，无法读取离线 API 文档。');
	}

	return fileSystem as unknown as EdaFileSystem;
}

// 读取扩展内离线文档文本。
async function readApiDocumentText(): Promise<string> {
	const fileSystem = getEdaFileSystem();
	const extensionFile = await fileSystem.getExtensionFile(API_DOCUMENT_URI);
	if (!extensionFile) {
		throw new Error(`未找到离线 API 文档文件: ${API_DOCUMENT_URI}`);
	}

	return await extensionFile.text();
}

// 拆分检索关键词。
function splitTerms(raw: string): string[] {
	const normalized = raw.trim().toLowerCase();
	if (normalized.length === 0) {
		return [];
	}

	return normalized
		.split(/[\s,，;；、|/\\:：._\-(){}]+/)
		.map(item => item.trim())
		.filter(item => item.length > 0);
}

// 构建关键词倒排索引。
function buildKeywordIndex(rawIndex: Record<string, number[]> | undefined): Map<string, number[]> {
	const output = new Map<string, number[]>();
	if (!rawIndex) {
		return output;
	}

	for (const [keyword, ids] of Object.entries(rawIndex)) {
		if (keyword.trim().length === 0 || !Array.isArray(ids)) {
			continue;
		}
		output.set(keyword.toLowerCase(), ids.filter(id => Number.isInteger(id)));
	}
	return output;
}

// 根据范围返回候选集合。
function getScopedItems(cache: ApiCache, scope: string): ApiProjectionItem[] {
	if (scope === 'callable') {
		return cache.callableItems;
	}
	if (scope === 'type') {
		return cache.typeItems;
	}
	return cache.allItems;
}

// 在索引不命中时进行候选评分。
function scoreFallback(item: ApiProjectionItem, queryLower: string, terms: string[]): number {
	const name = String(item.name ?? '').toLowerCase();
	const fullName = String(item.fullName ?? '').toLowerCase();
	const summary = String(item.summary ?? '').toLowerCase();

	let score = 0;
	if (fullName.includes(queryLower)) {
		score += 8;
	}
	if (name.includes(queryLower)) {
		score += 6;
	}

	for (const term of terms) {
		if (term.length < 2) {
			continue;
		}
		if (fullName.includes(term)) {
			score += 4;
		}
		if (name.includes(term)) {
			score += 3;
		}
		if (summary.includes(term)) {
			score += 1;
		}
	}

	return score;
}

// 加载并缓存离线文档。
async function loadApiCache(): Promise<ApiCache> {
	if (apiCache) {
		return apiCache;
	}

	const text = await readApiDocumentText().catch((error: unknown) => {
		throw new Error(`离线 API 文档读取失败: ${toSafeErrorMessage(error)}`);
	});

	const parsed = JSON.parse(text) as unknown;
	if (!isPlainObjectRecord(parsed)) {
		throw new Error('离线 API 文档格式非法：根节点必须是对象。');
	}

	const document = parsed as ApiDocument;
	const callableItems = Array.isArray(document.projections?.callableApis) ? document.projections.callableApis : [];
	const typeItems = Array.isArray(document.projections?.types) ? document.projections.types : [];
	const allItems = [...callableItems, ...typeItems];

	const itemById = new Map<number, ApiProjectionItem>();
	for (const item of allItems) {
		itemById.set(item.id, item);
	}

	apiCache = {
		allItems,
		callableItems,
		typeItems,
		itemById,
		keywordIndex: buildKeywordIndex(document.queryIndexes?.symbolIdByKeyword),
	};
	return apiCache;
}

/**
 * 处理离线 API 检索任务。
 * @param payload 任务参数。
 * @returns 检索结果。
 */
export async function handleApiSearchTask(payload: unknown): Promise<unknown> {
	if (!isPlainObjectRecord(payload)) {
		throw new Error('api/search 任务参数必须为对象。');
	}

	const query = String(payload.query ?? '').trim();
	if (query.length === 0) {
		throw new Error('api_search 缺少 query 参数。');
	}

	const scope = String(payload.scope ?? 'all').trim().toLowerCase();
	if (!['all', 'callable', 'type'].includes(scope)) {
		throw new Error('scope 仅支持 all/callable/type。');
	}

	const ownerFilter = String(payload.owner ?? '').trim().toLowerCase();
	const limit = parseBoundedIntegerValue(payload.limit, 10, 1, API_SEARCH_MAX_LIMIT);
	const cache = await loadApiCache();
	const terms = splitTerms(query);
	const queryLower = query.toLowerCase();

	const scopedItems = getScopedItems(cache, scope);
	const allowIdSet = new Set<number>(scopedItems.map(item => item.id));
	const scoreById = new Map<number, number>();

	for (const term of terms) {
		const ids = cache.keywordIndex.get(term) ?? [];
		for (const id of ids) {
			if (!allowIdSet.has(id)) {
				continue;
			}
			scoreById.set(id, (scoreById.get(id) ?? 0) + 10);
		}
	}

	// 方法名词位奖励：term 在方法名中出现越靠前，加分越高。
	// 这可确保 getBomFile 等核心 BOM API 排在 getState_AddIntoBom 等属性访问器前面。
	for (const id of scoreById.keys()) {
		const item = cache.itemById.get(id);
		if (!item) {
			continue;
		}
		const nameWords = String(item.name ?? '')
			.split(/(?=[A-Z])|_/)
			.map(w => w.toLowerCase())
			.filter(w => w.length > 0);
		let bonus = 0;
		for (const term of terms) {
			const wordIndex = nameWords.indexOf(term);
			if (wordIndex >= 0) {
				bonus += Math.max(0, 4 - wordIndex);
			}
		}
		if (bonus > 0) {
			scoreById.set(id, (scoreById.get(id) ?? 0) + bonus);
		}
	}

	if (scoreById.size === 0) {
		for (const item of scopedItems) {
			const score = scoreFallback(item, queryLower, terms);
			if (score > 0) {
				scoreById.set(item.id, score);
			}
		}
	}

	const filteredItems = [...scoreById.entries()]
		.map(([id, score]) => {
			const item = cache.itemById.get(id);
			if (!item) {
				return null;
			}
			if (ownerFilter.length > 0 && !String(item.ownerFullName ?? '').toLowerCase().includes(ownerFilter)) {
				return null;
			}
			return {
				id: item.id,
				name: item.name,
				fullName: item.fullName,
				kind: item.kind,
				ownerFullName: item.ownerFullName,
				summary: item.summary,
				signatureText: item.signatureText ?? '',
				typeText: item.typeText ?? '',
				returnType: item.returnType ?? '',
				parameters: Array.isArray(item.parameters) ? item.parameters : [],
				score,
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null)
		.sort((left, right) => {
			if (right.score !== left.score) {
				return right.score - left.score;
			}
			return left.fullName.localeCompare(right.fullName);
		});
	const items = filteredItems.slice(0, limit);

	return {
		query,
		scope,
		owner: ownerFilter,
		totalCandidates: filteredItems.length,
		returnedCount: items.length,
		items,
	};
}

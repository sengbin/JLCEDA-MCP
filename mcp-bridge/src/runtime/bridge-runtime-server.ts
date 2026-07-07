/**
 * ------------------------------------------------------------------------
 * 名称：桥接运行时管理器（服务器模式）
 * 说明：启动WebSocket服务器，接收并执行来自MCP服务器的任务
 * 作者：Lion（改造）
 * 日期：2026-03-15
 * 备注：简化版，作为服务器等待MCP服务器连接
 *       仅在原理图或PCB页面时启动服务器
 * ------------------------------------------------------------------------
 */

import { toSafeErrorMessage, toSerializableAsync } from '../utils.ts';
import { debugLog } from '../utils/debug-log.ts';
import { handleApiIndexTask } from '../mcp/api-index-handler.ts';
import { handleApiInvokeTask } from '../mcp/invoke-handler.ts';
import { handleApiSearchTask } from '../mcp/api-search-handler.ts';
import { handleAutoLayoutTask } from '../mcp/auto-layout-handler.ts';
import { handleAutoRoutingTask } from '../mcp/auto-routing-handler.ts';
import { handleComponentPlaceAutoTask } from '../mcp/component-place-auto-handler.ts';
import {
	handleComponentPlaceCheckTask,
	handleComponentPlaceCloseTask,
	handleComponentPlaceStartTask,
	handleComponentPlaceTask,
} from '../mcp/component-place-handler.ts';
import { handleComponentSelectTask } from '../mcp/component-select-handler.ts';
import { handleEdaContextTask } from '../mcp/context-handler.ts';
import { handleNetLabelModifyTask } from '../mcp/netlabel-modify-handler.ts';
import { handleNetLabelPlaceTask } from '../mcp/netlabel-place-handler.ts';
import { handleSchematicReadTask } from '../mcp/schematic-read-handler.ts';
import { handleSchematicReviewTask } from '../mcp/schematic-review-handler.ts';
import { BridgeTransport } from './bridge-transport-server.ts';

const DEFAULT_PORT = 8765;
const PAGE_CHECK_INTERVAL_MS = 1000; // 每秒检查一次页面类型

// Handler映射表
const BRIDGE_TASK_HANDLERS: Record<string, (payload: unknown) => Promise<unknown>> = {
	'/bridge/jlceda/api/index': handleApiIndexTask,
	'/bridge/jlceda/api/search': handleApiSearchTask,
	'/bridge/jlceda/api/invoke': handleApiInvokeTask,
	'/bridge/jlceda/auto/layout': handleAutoLayoutTask,
	'/bridge/jlceda/auto/routing': handleAutoRoutingTask,
	'/bridge/jlceda/component/place/check': handleComponentPlaceCheckTask,
	'/bridge/jlceda/component/place/close': handleComponentPlaceCloseTask,
	'/bridge/jlceda/component/place/start': handleComponentPlaceStartTask,
	'/bridge/jlceda/component/place': handleComponentPlaceTask,
	'/bridge/jlceda/component/place-auto': handleComponentPlaceAutoTask,
	'/bridge/jlceda/component/select': handleComponentSelectTask,
	'/bridge/jlceda/context': handleEdaContextTask,
	'/bridge/jlceda/netlabel/place': handleNetLabelPlaceTask,
	'/bridge/jlceda/netlabel/modify': handleNetLabelModifyTask,
	'/bridge/jlceda/schematic/read': handleSchematicReadTask,
	'/bridge/jlceda/schematic/review': handleSchematicReviewTask,
};

let transport: BridgeTransport | undefined;
let started = false;
let pageCheckTimer: ReturnType<typeof globalThis.setInterval> | undefined;

/**
 * 检查当前页面类型是否为原理图或PCB
 */
function isValidPageType(): boolean {
	try {
		// 使用 getCurrentDocumentInfo 获取文档类型
		// 这是异步方法，但我们需要同步检查，所以尝试多种方法
		
		// 方法1：尝试使用 dmt_SelectControl.getCurrentDocumentInfo
		const docInfo = eda.dmt_SelectControl.getCurrentDocumentInfo();
		if (docInfo && typeof docInfo.then === 'function') {
			// 如果是Promise，我们无法在同步函数中等待
			// 使用备选方法
		} else if (docInfo && docInfo.documentType !== undefined) {
			// SCHEMATIC_PAGE = 1, PCB = 3
			const validTypes = [1, 3];
			debugLog('[Bridge Runtime] Document type (sync): ' + docInfo.documentType);
			return validTypes.includes(docInfo.documentType);
		}
		
		// 方法2：尝试使用 sys_Context（如果存在）
		if (eda.sys_Context && typeof eda.sys_Context.getActivePageType === 'function') {
			const pageType = eda.sys_Context.getActivePageType();
			debugLog('[Bridge Runtime] Page type (sys_Context): ' + pageType);
			return pageType === 'sch' || pageType === 'pcb';
		}
		
		debugLog('[Bridge Runtime] Unable to determine page type');
		return false;
	} catch (e) {
		debugLog('[Bridge Runtime] Failed to get page type: ' + e);
		return false;
	}
}

/**
 * 异步检查当前页面类型
 */
async function isValidPageTypeAsync(): Promise<boolean> {
	try {
		const docInfo = await eda.dmt_SelectControl.getCurrentDocumentInfo();
		if (docInfo && docInfo.documentType !== undefined) {
			// SCHEMATIC_PAGE = 1, PCB = 3
			const validTypes = [1, 3];
			debugLog('[Bridge Runtime] Document type (async): ' + docInfo.documentType);
			return validTypes.includes(docInfo.documentType);
		}
		return false;
	} catch (e) {
		debugLog('[Bridge Runtime] Failed to get document info: ' + e);
		return false;
	}
}

/**
 * 启动桥接运行时（服务器模式）
 */
export function startBridgeRuntime(): void {
	if (started) {
		debugLog('[Bridge Runtime] Already started');
		return;
	}

	started = true;
	debugLog('[Bridge Runtime] Starting bridge runtime with page detection');

	// 启动页面检查定时器
	startPageCheck();
}

/**
 * 启动页面类型检查
 */
function startPageCheck(): void {
	if (pageCheckTimer) {
		return;
	}

	pageCheckTimer = globalThis.setInterval(() => {
		const shouldBeActive = isValidPageType();

		if (shouldBeActive && !transport) {
			// 需要启动但未启动
			startServer();
		} else if (!shouldBeActive && transport) {
			// 不需要但正在运行
			stopServer();
		}
	}, PAGE_CHECK_INTERVAL_MS);

	// 立即检查一次
	if (isValidPageType()) {
		startServer();
	}
}

/**
 * 启动服务器
 */
function startServer(): void {
	if (transport) {
		return;
	}

	debugLog('[Bridge Runtime] Starting server');

	transport = new BridgeTransport(DEFAULT_PORT, {
		onTask: async (requestId: string, path: string, payload: unknown) => {
			return await handleTask(path, payload);
		},
	});

	transport.start().then(() => {
		console.log('[Bridge Runtime] Bridge server started successfully on port ' + DEFAULT_PORT);
		
		// 显示成功提示
		try {
			eda.sys_Message.showToastMessage(
				'MCP Bridge服务器已启动 (端口:' + DEFAULT_PORT + ')',
				1, // SUCCESS
				3
			);
		} catch (e) {
			// 忽略提示错误
		}
	}).catch((error: unknown) => {
		console.error('[Bridge Runtime] Failed to start bridge server:', toSafeErrorMessage(error));
		transport = undefined;
		
		// 显示错误提示
		try {
			eda.sys_Message.showToastMessage(
				'MCP Bridge服务器启动失败: ' + toSafeErrorMessage(error),
				0, // ERROR
				5
			);
		} catch (e) {
			// 忽略提示错误
		}
	});
}

/**
 * 停止服务器
 */
function stopServer(): void {
	if (!transport) {
		return;
	}

	debugLog('[Bridge Runtime] Stopping server (page type changed)');

	transport.stop();
	transport = undefined;

	// 显示提示
	try {
		eda.sys_Message.showToastMessage(
			'MCP Bridge服务器已停止（页面切换）',
			2, // WARNING
			2
		);
	} catch (e) {
		// 忽略提示错误
	}
}

/**
 * 停止桥接运行时
 */
export function stopBridgeRuntime(): void {
	if (!started) {
		return;
	}

	// 停止页面检查
	if (pageCheckTimer) {
		globalThis.clearInterval(pageCheckTimer);
		pageCheckTimer = undefined;
	}

	// 停止服务器
	stopServer();

	started = false;
	debugLog('[Bridge Runtime] Bridge runtime stopped');
}

/**
 * 重启服务器（手动触发）
 */
export function restartBridgeServer(): void {
	debugLog('[Bridge Runtime] Manual restart requested');
	
	// 先停止服务器
	stopServer();
	
	// 显示重启提示
	try {
		eda.sys_Message.showToastMessage(
			'正在重启MCP Bridge服务器...',
			2, // WARNING
			2
		);
	} catch (e) {
		// 忽略提示错误
	}
	
	// 等待500ms后重新启动（使用异步检查）
	globalThis.setTimeout(async () => {
		try {
			const pageType = await isValidPageTypeAsync();
			const docInfo = await eda.dmt_SelectControl.getCurrentDocumentInfo();
			
			debugLog('[Bridge Runtime] Restart check - isValid: ' + pageType + ', documentType: ' + (docInfo ? docInfo.documentType : 'none'));
			
			if (pageType) {
				startServer();
			} else {
				// 不在有效页面
				let message = '当前不在原理图或PCB页面\n\n';
				if (docInfo && docInfo.documentType !== undefined) {
					const typeNames: Record<number, string> = {
						'-1': 'Home（开始页）',
						'0': 'Blank（空白）',
						'1': 'Schematic Page（原理图）✅',
						'3': 'PCB ✅',
						'5': 'Project（工程）',
						'2': 'Symbol Component（元件符号）',
					};
					const typeName = typeNames[String(docInfo.documentType)] || '未知类型(' + docInfo.documentType + ')';
					message += '当前文档类型: ' + typeName + '\n\n';
				}
				message += '服务器将在打开原理图/PCB时自动启动。';
				
				eda.sys_Dialog.showInformationMessage(message, 'MCP Bridge 重启');
			}
		} catch (e) {
			debugLog('[Bridge Runtime] Restart check failed: ' + e);
			eda.sys_Dialog.showInformationMessage(
				'重启检查失败\n\n' + String(e),
				'MCP Bridge 重启'
			);
		}
	}, 500);
}

/**
 * 处理任务
 */
async function handleTask(path: string, payload: unknown): Promise<unknown> {
	debugLog('[Bridge Runtime] Handling task: ' + path);

	// 查找handler
	const handler = BRIDGE_TASK_HANDLERS[path];
	if (!handler) {
		throw new Error('Unknown task path: ' + path);
	}

	try {
		// 执行handler
		const result = await handler(payload);
		
		// 序列化结果
		const serialized = await toSerializableAsync(result);
		
		debugLog('[Bridge Runtime] Task completed: ' + path);
		return serialized;
	} catch (error: unknown) {
		debugLog('[Bridge Runtime] Task failed: ' + path + ', error: ' + toSafeErrorMessage(error));
		throw error;
	}
}

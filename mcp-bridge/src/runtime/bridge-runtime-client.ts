/**
 * ------------------------------------------------------------------------
 * 名称：桥接运行时管理器（客户端模式）
 * 说明：连接到MCP服务器并执行来自MCP服务器的任务
 * 作者：Lion（改造）
 * 日期：2026-03-15
 * 备注：反转架构 - EDA插件作为客户端连接到MCP服务器
 * ------------------------------------------------------------------------
 */

import { debugLog } from '../utils/debug-log.ts';
import { toSafeErrorMessage, toSerializableAsync } from '../utils.ts';
import { BridgeTransport } from './bridge-transport-client.ts';
import { connectionStatusManager } from '../state/connection-status.ts';
import { handleApiIndexTask } from '../mcp/api-index-handler.ts';
import { handleApiSearchTask } from '../mcp/api-search-handler.ts';
import { handleAutoLayoutTask } from '../mcp/auto-layout-handler.ts';
import { handleAutoRoutingTask } from '../mcp/auto-routing-handler.ts';
import {
	handleComponentPlaceCheckTask,
	handleComponentPlaceCloseTask,
	handleComponentPlaceStartTask,
	handleComponentPlaceTask,
} from '../mcp/component-place-handler.ts';
import { handleComponentPlaceAutoTask } from '../mcp/component-place-auto-handler.ts';
import { handleComponentSelectTask } from '../mcp/component-select-handler.ts';
import { handleEdaContextTask } from '../mcp/context-handler.ts';
import { handleApiInvokeTask } from '../mcp/invoke-handler.ts';
import { handleSchematicReadTask } from '../mcp/schematic-read-handler.ts';
import { handleSchematicReviewTask } from '../mcp/schematic-review-handler.ts';
import { handleNetLabelPlaceTask } from '../mcp/netlabel-place-handler.ts';
import { handleNetLabelModifyTask } from '../mcp/netlabel-modify-handler.ts';

const MCP_SERVER_URL = 'ws://127.0.0.1:8765/bridge/ws';
const PAGE_CHECK_INTERVAL_MS = 1000;

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
	'/bridge/jlceda/schematic/read': handleSchematicReadTask,
	'/bridge/jlceda/schematic/review': handleSchematicReviewTask,
	'/bridge/jlceda/netlabel/place': handleNetLabelPlaceTask,
	'/bridge/jlceda/netlabel/modify': handleNetLabelModifyTask,
};

let transport: BridgeTransport | undefined;
let started = false;
let pageCheckTimer: ReturnType<typeof globalThis.setInterval> | undefined;

/**
 * 异步检查当前页面类型
 */
async function isValidPageTypeAsync(): Promise<boolean> {
	try {
		const docInfo = await eda.dmt_SelectControl.getCurrentDocumentInfo();
		if (docInfo && docInfo.documentType !== undefined) {
			// SCHEMATIC_PAGE = 1, PCB = 3
			const validTypes = [1, 3];
			return validTypes.includes(docInfo.documentType);
		}
		return false;
	} catch (e) {
		return false;
	}
}

/**
 * 启动桥接运行时（客户端模式）
 */
export function startBridgeRuntime(): void {
	if (started) {
		debugLog('[Bridge Runtime] Already started');
		return;
	}

	started = true;
	debugLog('[Bridge Runtime] Starting bridge runtime (client mode)');

	// 立即标记客户端启动（用于状态显示）
	connectionStatusManager.markServerStarted();

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

	// 延迟启动，避免阻塞EDA启动
	globalThis.setTimeout(() => {
		pageCheckTimer = globalThis.setInterval(async () => {
			const shouldBeActive = await isValidPageTypeAsync();

			if (shouldBeActive && !transport) {
				// 需要连接但未连接
				startClient();
			} else if (!shouldBeActive && transport) {
				// 不需要但正在运行
				stopClient();
			}
		}, PAGE_CHECK_INTERVAL_MS);

		// 立即检查一次
		isValidPageTypeAsync().then(isValid => {
			if (isValid) {
				startClient();
			}
		}).catch(() => {
			// 忽略错误
		});
	}, 3000); // 延迟3秒启动
}

/**
 * 启动客户端连接
 */
function startClient(): void {
	if (transport) {
		return;
	}

	debugLog('[Bridge Runtime] Starting client connection');

	// 标记客户端启动（用于状态显示）
	connectionStatusManager.markServerStarted();

	transport = new BridgeTransport(MCP_SERVER_URL, {
		onTask: async (requestId: string, path: string, payload: unknown) => {
			return await handleTask(path, payload);
		},
	});

	// 异步启动，不等待结果
	transport.start().catch((error: unknown) => {
		debugLog('[Bridge Runtime] Failed to start client: ' + toSafeErrorMessage(error));
		transport = undefined;
	});
}

/**
 * 停止客户端连接
 */
function stopClient(): void {
	if (!transport) {
		return;
	}

	debugLog('[Bridge Runtime] Stopping client (page type changed)');

	transport.stop();
	transport = undefined;

	// 显示提示
	try {
		eda.sys_Message.showToastMessage(
			'已断开MCP服务器连接（页面切换）',
			2, // WARNING
			2
		);
	} catch (e) {
		// 忽略
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

	// 停止客户端
	stopClient();

	started = false;
	debugLog('[Bridge Runtime] Bridge runtime stopped');
}

/**
 * 重启连接（手动触发）
 */
export function restartBridgeServer(): void {
	debugLog('[Bridge Runtime] Manual restart requested');
	
	// 重新标记启动（刷新状态显示）
	connectionStatusManager.clear();
	connectionStatusManager.markServerStarted();
	
	// 先断开
	stopClient();
	
	// 显示重启提示
	try {
		eda.sys_Message.showToastMessage(
			'正在重新连接MCP服务器...',
			2, // WARNING
			2
		);
	} catch (e) {
		// 忽略
	}
	
	// 等待500ms后重新连接
	globalThis.setTimeout(async () => {
		const isValid = await isValidPageTypeAsync();
		
		if (isValid) {
			startClient();
		} else {
			// 不在有效页面
			try {
				const docInfo = await eda.dmt_SelectControl.getCurrentDocumentInfo();
				let message = '当前不在原理图或PCB页面\n\n';
				if (docInfo && docInfo.documentType !== undefined) {
					const typeNames: Record<number, string> = {
						'-1': 'Home（开始页）',
						'0': 'Blank（空白）',
						'1': 'Schematic Page（原理图）✅',
						'3': 'PCB ✅',
						'5': 'Project（工程）',
					};
					const typeName = typeNames[String(docInfo.documentType)] || '未知(' + docInfo.documentType + ')';
					message += '当前文档类型: ' + typeName + '\n\n';
				}
				message += '将在打开原理图/PCB时自动连接。';
				
				eda.sys_Dialog.showInformationMessage(message, 'MCP Bridge 重启');
			} catch (e) {
				debugLog('[Bridge Runtime] Failed to get document info: ' + e);
			}
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
		
		debugLog('[Bridge Runtime] Task completed: ' + path);
		return result;
	} catch (error: unknown) {
		debugLog('[Bridge Runtime] Task failed: ' + path + ', error: ' + toSafeErrorMessage(error));
		throw error;
	}
}

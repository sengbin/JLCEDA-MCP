/**
 * ------------------------------------------------------------------------
 * 名称：Bridge 扩展入口
 * 说明：负责扩展激活、桥接客户端启动与对外菜单函数导出。
 * 作者：Lion
 * 邮箱：chengbin@3578.cn
 * 日期：2026-03-09
 * 备注：嘉立创 EDA Bridge 入口文件（客户端模式）。
 * ------------------------------------------------------------------------
 */
import * as extensionConfig from '../extension.json';
import { startBridgeRuntime, stopBridgeRuntime, restartBridgeServer } from './runtime/bridge-runtime-client.ts';
import { getDebugLog, clearDebugLog } from './utils/debug-log.ts';
import { connectionStatusManager } from './state/connection-status.ts';

/**
 * 激活 Bridge 扩展。
 *
 * @param status 扩展激活状态。
 * @param arg 扩展激活附加参数。
 */
// eslint-disable-next-line unused-imports/no-unused-vars
export function activate(status?: 'onStartupFinished', arg?: string): void {
	// 扩展启动后自动拉起桥接服务器。
	startBridgeRuntime();
}

/**
 * 停用扩展
 */
export function deactivate(): void {
	stopBridgeRuntime();
}

/**
 * 重启MCP Bridge服务器
 */
export function restartServer(): void {
	restartBridgeServer();
}

/**
 * 查看连接状态
 */
export function viewConnectionStatus(): void {
	const statusText = connectionStatusManager.getStatusSummary();
	eda.sys_Dialog.showInformationMessage(statusText, 'MCP Bridge 连接状态');
}

/**
 * 打开连接设置页面（服务器模式说明）
 */
export function openSettingsPage(): void {
	const hasConnections = connectionStatusManager.hasActiveConnections();
	const connectionCount = connectionStatusManager.getConnectionCount();
	
	let message = '═══════════════════════════════════════\n';
	message += '  MCP Bridge 客户端模式 v2.0\n';
	message += '═══════════════════════════════════════\n\n';
	message += '服务器地址:\n';
	message += '  ws://127.0.0.1:8765/bridge/ws\n\n';
	
	if (hasConnections) {
		message += '✅ 当前状态: 已连接\n\n';
	} else {
		message += '⚠️  当前状态: 未连接\n\n';
		message += '提示:\n';
		message += '1. 请确保MCP服务器正在运行\n';
		message += '2. 请确保OpenCode已启动\n\n';
	}
	
	message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
	message += '客户端模式说明:\n';
	message += '• 自动检测页面类型\n';
	message += '• 仅在原理图/PCB页面连接\n';
	message += '• 连接到MCP服务器（端口8765）\n';
	message += '• 如遇问题可手动重启\n\n';
	message += '查看详细连接状态，请点击菜单:\n';
	message += '「MCP Bridge → 连接状态」\n\n';
	message += '重启连接，请点击菜单:\n';
	message += '「MCP Bridge → 重启服务器」';
	
	eda.sys_Dialog.showInformationMessage(message, 'MCP Bridge 设置');
}

/**
 * 打开关于信息弹窗。
 */
export function about(): void {
	eda.sys_Dialog.showInformationMessage(
		eda.sys_I18n.text('MCP Bridge (Server Mode)', undefined, undefined, extensionConfig.version),
		eda.sys_I18n.text('About'),
	);
}

/**
 * 查看调试日志。
 */
export function viewDebugLog(): void {
	const log = getDebugLog();
	if (!log) {
		eda.sys_Dialog.showInformationMessage('暂无调试日志', '调试日志');
		return;
	}
	
	// 显示日志内容
	eda.sys_Dialog.showInformationMessage(log, '调试日志 (最近100条)');
}

/**
 * 清空调试日志。
 */
export function clearDebugLogAction(): void {
	clearDebugLog();
	eda.sys_Dialog.showInformationMessage('调试日志已清空', '调试日志');
}


/**
 * ------------------------------------------------------------------------
 * 名称：连接状态管理器
 * 说明：管理WebSocket服务器的连接状态，提供状态查询和显示功能
 * 作者：Lion
 * 日期：2026-03-15
 * ------------------------------------------------------------------------
 */

import { debugLog } from '../utils/debug-log.ts';

export interface ConnectionInfo {
	clientId: string;
	connectedAt: number;
	lastActivityAt: number;
	requestCount: number;
}

export class ConnectionStatusManager {
	private connections: Map<string, ConnectionInfo> = new Map();
	private serverStartedAt: number = 0;
	private totalRequestsHandled: number = 0;

	/**
	 * 标记服务器已启动
	 */
	public markServerStarted(): void {
		this.serverStartedAt = Date.now();
		debugLog('[Status] Server started at: ' + new Date(this.serverStartedAt).toLocaleString());
	}

	/**
	 * 添加新连接
	 */
	public addConnection(clientId: string): void {
		const info: ConnectionInfo = {
			clientId,
			connectedAt: Date.now(),
			lastActivityAt: Date.now(),
			requestCount: 0,
		};
		this.connections.set(clientId, info);
		debugLog('[Status] Client connected: ' + clientId + ', total: ' + this.connections.size);
		this.showConnectionToast('MCP服务器已连接', true);
	}

	/**
	 * 移除连接
	 */
	public removeConnection(clientId: string): void {
		if (this.connections.delete(clientId)) {
			debugLog('[Status] Client disconnected: ' + clientId + ', remaining: ' + this.connections.size);
			if (this.connections.size === 0) {
				this.showConnectionToast('MCP服务器已断开', false);
			}
		}
	}

	/**
	 * 更新连接活动时间
	 */
	public updateActivity(clientId: string): void {
		const info = this.connections.get(clientId);
		if (info) {
			info.lastActivityAt = Date.now();
			info.requestCount++;
			this.totalRequestsHandled++;
		}
	}

	/**
	 * 获取连接状态摘要
	 */
	public getStatusSummary(): string {
		const lines: string[] = [];
		
		lines.push('═══════════════════════════════════════');
		lines.push('  MCP Bridge 客户端状态 (v2.0)');
		lines.push('═══════════════════════════════════════');
		lines.push('');
		
		if (this.serverStartedAt === 0 && this.connections.size === 0) {
			lines.push('⚠️  客户端未启动');
			return lines.join('\n');
		}

		const uptime = this.serverStartedAt > 0 ? (Date.now() - this.serverStartedAt) : 0;
		const uptimeStr = uptime > 0 ? this.formatUptime(uptime) : '刚刚启动';
		
		lines.push('✅ 客户端运行中');
		lines.push('');
		lines.push('服务器地址: ws://127.0.0.1:8765/bridge/ws');
		lines.push('运行时长: ' + uptimeStr);
		lines.push('总请求数: ' + this.totalRequestsHandled);
		lines.push('');
		
		if (this.connections.size === 0) {
			lines.push('⚠️  当前未连接到MCP服务器');
			lines.push('');
			lines.push('提示：请确保MCP服务器正在运行');
		} else {
			lines.push('✅ 已连接到MCP服务器');
			lines.push('');
			lines.push('───────────────────────────────────────');
			lines.push('  连接详情');
			lines.push('───────────────────────────────────────');
			
			let index = 1;
			for (const [clientId, info] of this.connections.entries()) {
				const connectedTime = Date.now() - info.connectedAt;
				const connectedStr = this.formatUptime(connectedTime);
				const idleTime = Date.now() - info.lastActivityAt;
				const idleStr = this.formatUptime(idleTime);
				
				lines.push('');
				lines.push('连接 #' + index + ':');
				lines.push('  ID: ' + clientId);
				lines.push('  连接时长: ' + connectedStr);
				lines.push('  空闲时间: ' + idleStr);
				lines.push('  处理请求: ' + info.requestCount + ' 个');
				
				index++;
			}
		}
		
		lines.push('');
		lines.push('═══════════════════════════════════════');
		
		return lines.join('\n');
	}

	/**
	 * 检查是否有活动连接
	 */
	public hasActiveConnections(): boolean {
		return this.connections.size > 0;
	}

	/**
	 * 获取连接数量
	 */
	public getConnectionCount(): number {
		return this.connections.size;
	}

	/**
	 * 显示连接状态Toast提示
	 */
	private showConnectionToast(message: string, isSuccess: boolean): void {
		try {
			eda.sys_Message.showToastMessage(
				message,
				isSuccess ? 1 : 2, // 1=SUCCESS, 2=WARNING
				3
			);
		} catch (e) {
			// 忽略提示错误
		}
	}

	/**
	 * 格式化时长
	 */
	private formatUptime(ms: number): string {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) {
			return days + '天 ' + (hours % 24) + '小时';
		} else if (hours > 0) {
			return hours + '小时 ' + (minutes % 60) + '分钟';
		} else if (minutes > 0) {
			return minutes + '分钟 ' + (seconds % 60) + '秒';
		} else {
			return seconds + '秒';
		}
	}

	/**
	 * 清空所有连接
	 */
	public clear(): void {
		this.connections.clear();
		this.serverStartedAt = 0;
		this.totalRequestsHandled = 0;
	}
}

// 全局单例
export const connectionStatusManager = new ConnectionStatusManager();

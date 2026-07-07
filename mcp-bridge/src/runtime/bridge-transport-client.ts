/**
 * ------------------------------------------------------------------------
 * 名称：桥接 WebSocket 传输层（客户端模式）
 * 说明：作为WebSocket客户端，连接到MCP服务器并执行任务
 * 作者：Lion
 * 日期：2026-03-15
 * 备注：连接到MCP服务器的WebSocket服务器（反转架构）
 * ------------------------------------------------------------------------
 */

import { isPlainObjectRecord, toSafeErrorMessage, toSerializableAsync } from '../utils.ts';
import { debugLog } from '../utils/debug-log.ts';
import { connectionStatusManager } from '../state/connection-status.ts';

interface BridgeTaskMessage {
	type: 'bridge/task';
	requestId: string;
	path: string;
	payload: unknown;
}

interface BridgeResultMessage {
	type: 'bridge/result';
	requestId: string;
	result?: unknown;
	error?: string;
}

interface BridgeTransportCallbacks {
	onTask: (requestId: string, path: string, payload: unknown) => Promise<unknown>;
}

export class BridgeTransport {
	private socketId: string | null = null;
	private connected = false;
	private reconnectTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
	private readonly RECONNECT_INTERVAL = 5000; // 5秒重连

	public constructor(
		private readonly serverUrl: string,
		private readonly callbacks: BridgeTransportCallbacks,
	) {}

	/**
	 * 启动客户端并连接到MCP服务器
	 */
	public async start(): Promise<void> {
		debugLog('[Bridge] Connecting to MCP server at ' + this.serverUrl);
		
		// 异步连接，不阻塞
		this.connect().catch((error) => {
			debugLog('[Bridge] Initial connection failed: ' + toSafeErrorMessage(error));
			// 连接失败会自动重连，不抛出错误
		});
	}

	/**
	 * 连接到MCP服务器
	 */
	private async connect(): Promise<void> {
		if (this.connected) {
			return;
		}

		try {
			// 生成唯一socketId
			this.socketId = 'eda_bridge_' + Date.now();

			// 使用EDA的WebSocket客户端API
			eda.sys_WebSocket.register(
				this.socketId,
				this.serverUrl,
				(event: MessageEvent<any>) => {
					// 收到消息
					if (event.data) {
						this.handleMessage(String(event.data));
					}
				},
				() => {
					// 连接打开
					this.onConnected();
				}
			);

			debugLog('[Bridge] WebSocket connection registered');
		} catch (error: unknown) {
			debugLog('[Bridge] Failed to register: ' + toSafeErrorMessage(error));
			this.scheduleReconnect();
			throw error;
		}
	}

	/**
	 * 连接成功
	 */
	private onConnected(): void {
		this.connected = true;
		connectionStatusManager.addConnection('mcp-server');
		
		debugLog('[Bridge] Connected to MCP server');
		console.log('[Bridge] Connected to MCP server at ' + this.serverUrl);

		// 显示连接成功提示
		try {
			eda.sys_Message.showToastMessage(
				'已连接到MCP服务器',
				1, // SUCCESS
				3
			);
		} catch (e) {
			// 忽略
		}
	}

	/**
	 * 连接断开
	 */
	private onDisconnected(code: number, reason: string): void {
		this.connected = false;
		connectionStatusManager.removeConnection('mcp-server');
		
		debugLog('[Bridge] Disconnected from MCP server: ' + code + ' - ' + reason);

		// 显示断开提示
		try {
			eda.sys_Message.showToastMessage(
				'MCP服务器连接断开',
				2, // WARNING
				3
			);
		} catch (e) {
			// 忽略
		}

		// 自动重连
		this.scheduleReconnect();
	}

	/**
	 * 连接错误
	 */
	private onError(error: string): void {
		debugLog('[Bridge] WebSocket error: ' + error);
	}

	/**
	 * 安排重连
	 */
	private scheduleReconnect(): void {
		if (this.reconnectTimer) {
			return;
		}

		debugLog('[Bridge] Scheduling reconnect in ' + this.RECONNECT_INTERVAL + 'ms');

		this.reconnectTimer = globalThis.setTimeout(() => {
			this.reconnectTimer = undefined;
			this.connect().catch(() => {
				// 重连失败，会自动再次安排
			});
		}, this.RECONNECT_INTERVAL);
	}

	/**
	 * 处理来自MCP服务器的消息
	 */
	private async handleMessage(data: string): Promise<void> {
		try {
			const message = JSON.parse(data);

			if (!isPlainObjectRecord(message)) {
				debugLog('[Bridge] Invalid message format');
				return;
			}

			if (message.type === 'bridge/task') {
				connectionStatusManager.updateActivity('mcp-server');
				await this.handleTask(message as BridgeTaskMessage);
			}
		} catch (error: unknown) {
			debugLog('[Bridge] Failed to handle message: ' + toSafeErrorMessage(error));
		}
	}

	/**
	 * 处理任务请求
	 */
	private async handleTask(message: BridgeTaskMessage): Promise<void> {
		const { requestId, path, payload } = message;
		
		try {
			debugLog('[Bridge] Handling task: ' + path + ', requestId: ' + requestId);
			
			// 调用handler执行任务
			const result = await this.callbacks.onTask(requestId, path, payload);
			
			// 序列化结果
			const serialized = await toSerializableAsync(result);
			
			// 返回成功结果
			const response: BridgeResultMessage = {
				type: 'bridge/result',
				requestId,
				result: serialized,
			};
			
			this.sendMessage(response);
			debugLog('[Bridge] Task completed: ' + requestId);
		} catch (error: unknown) {
			// 返回错误结果
			const response: BridgeResultMessage = {
				type: 'bridge/result',
				requestId,
				error: toSafeErrorMessage(error),
			};
			
			this.sendMessage(response);
			debugLog('[Bridge] Task failed: ' + requestId + ', error: ' + toSafeErrorMessage(error));
		}
	}

	/**
	 * 发送消息到MCP服务器
	 */
	private sendMessage(message: unknown): void {
		if (!this.connected || !this.socketId) {
			debugLog('[Bridge] Cannot send message: not connected');
			return;
		}

		try {
			const data = JSON.stringify(message);
			eda.sys_WebSocket.send(this.socketId, data);
		} catch (error: unknown) {
			debugLog('[Bridge] Failed to send message: ' + toSafeErrorMessage(error));
		}
	}

	/**
	 * 停止并断开连接
	 */
	public stop(): void {
		// 清除重连定时器
		if (this.reconnectTimer) {
			globalThis.clearTimeout(this.reconnectTimer);
			this.reconnectTimer = undefined;
		}

		// 关闭连接
		if (this.socketId) {
			try {
				eda.sys_WebSocket.close(this.socketId);
			} catch (e) {
				// 忽略
			}
			this.socketId = null;
		}

		this.connected = false;
		connectionStatusManager.clear();
		debugLog('[Bridge] Stopped');
	}

	/**
	 * 检查是否已连接
	 */
	public isConnected(): boolean {
		return this.connected;
	}
}

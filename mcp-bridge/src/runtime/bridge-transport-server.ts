/**
 * ------------------------------------------------------------------------
 * 名称：桥接 WebSocket 传输层（服务器模式）
 * 说明：作为WebSocket服务器，接收来自MCP服务器的连接和任务请求
 * 作者：Lion（改造）
 * 日期：2026-03-15
 * 备注：简化版，移除客户端模式的握手、心跳、角色等逻辑
 * ------------------------------------------------------------------------
 */

import { isPlainObjectRecord, toSafeErrorMessage } from '../utils.ts';
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
	private server: any = null;
	private clients: Map<any, string> = new Map(); // client -> clientId
	private started = false;
	private clientIdCounter = 0;

	public constructor(
		private readonly port: number,
		private readonly callbacks: BridgeTransportCallbacks,
	) {}

	/**
	 * 启动WebSocket服务器
	 */
	public async start(): Promise<void> {
		if (this.started) {
			return;
		}

		try {
			// 使用EDA的WebSocket服务器API（假设存在）
			// 如果不存在，需要使用标准的WebSocket库
			debugLog('[Bridge] Starting WebSocket server on port ' + this.port);
			
			// 注意：这里需要根据EDA实际提供的API进行调整
			// 由于EDA可能不提供服务器API，我们需要使用标准WebSocket
			const ws = await import('ws');
			const WebSocketServer = ws.WebSocketServer || ws.Server;
			
			this.server = new WebSocketServer({ 
				port: this.port,
				path: '/bridge/ws'
			});

			this.server.on('connection', (client: any) => {
				this.handleConnection(client);
			});

			this.server.on('error', (error: any) => {
				console.error('[Bridge] Server error:', error);
			});

			this.started = true;
			connectionStatusManager.markServerStarted();
			
			debugLog('[Bridge] WebSocket server started on ws://127.0.0.1:' + this.port + '/bridge/ws');
			console.log('[Bridge] WebSocket server started on ws://127.0.0.1:' + this.port + '/bridge/ws');
		} catch (error: unknown) {
			console.error('[Bridge] Failed to start server:', toSafeErrorMessage(error));
			throw error;
		}
	}

	/**
	 * 停止服务器
	 */
	public stop(): void {
		if (!this.started) {
			return;
		}

		this.clients.forEach((clientId, client) => {
			try {
				client.close();
				connectionStatusManager.removeConnection(clientId);
			} catch (e) {
				// ignore
			}
		});
		this.clients.clear();

		if (this.server) {
			this.server.close();
			this.server = null;
		}

		this.started = false;
		connectionStatusManager.clear();
		debugLog('[Bridge] WebSocket server stopped');
	}

	/**
	 * 处理新的客户端连接
	 */
	private handleConnection(client: any): void {
		const clientId = 'client_' + (++this.clientIdCounter) + '_' + Date.now();
		this.clients.set(client, clientId);
		connectionStatusManager.addConnection(clientId);
		
		debugLog('[Bridge] MCP Server connected, clientId: ' + clientId + ', total clients: ' + this.clients.size);

		client.on('message', async (data: any) => {
			await this.handleMessage(data, client, clientId);
		});

		client.on('close', () => {
			this.clients.delete(client);
			connectionStatusManager.removeConnection(clientId);
			debugLog('[Bridge] MCP Server disconnected, clientId: ' + clientId + ', remaining clients: ' + this.clients.size);
		});

		client.on('error', (error: any) => {
			debugLog('[Bridge] Client error (clientId: ' + clientId + '): ' + toSafeErrorMessage(error));
		});
	}

	/**
	 * 处理来自MCP服务器的消息
	 */
	private async handleMessage(data: any, client: any, clientId: string): Promise<void> {
		try {
			const text = data.toString('utf8');
			const message = JSON.parse(text);

			if (!isPlainObjectRecord(message)) {
				debugLog('[Bridge] Invalid message format from clientId: ' + clientId);
				return;
			}

			if (message.type === 'bridge/task') {
				connectionStatusManager.updateActivity(clientId);
				await this.handleTask(message as BridgeTaskMessage, client, clientId);
			}
		} catch (error: unknown) {
			debugLog('[Bridge] Failed to handle message from clientId ' + clientId + ': ' + toSafeErrorMessage(error));
		}
	}

	/**
	 * 处理任务请求
	 */
	private async handleTask(message: BridgeTaskMessage, client: any, clientId: string): Promise<void> {
		const { requestId, path, payload } = message;
		
		try {
			debugLog('[Bridge] Handling task from clientId ' + clientId + ': ' + path + ', requestId: ' + requestId);
			
			// 调用handler执行任务
			const result = await this.callbacks.onTask(requestId, path, payload);
			
			// 返回成功结果
			const response: BridgeResultMessage = {
				type: 'bridge/result',
				requestId,
				result,
			};
			
			client.send(JSON.stringify(response));
			debugLog('[Bridge] Task completed for clientId ' + clientId + ': ' + requestId);
		} catch (error: unknown) {
			// 返回错误结果
			const response: BridgeResultMessage = {
				type: 'bridge/result',
				requestId,
				error: toSafeErrorMessage(error),
			};
			
			client.send(JSON.stringify(response));
			debugLog('[Bridge] Task failed for clientId ' + clientId + ': ' + requestId + ', error: ' + toSafeErrorMessage(error));
		}
	}
}

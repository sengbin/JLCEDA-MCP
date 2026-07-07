/**
 * ------------------------------------------------------------------------
 * 名称：桥接 WebSocket 传输层
 * 说明：负责桥接连接建立、心跳保活、协议消息收发。
 * 作者：Lion
 * 邮箱：chengbin@3578.cn
 * 日期：2026-03-12
 * 备注：只处理传输，不包含任务业务。
 * ------------------------------------------------------------------------
 */

import type {
	BridgeClientMessage,
	BridgeDebugSwitch,
	BridgeQueueTask,
	BridgeServerMessage,
	BridgeServerRoleMessage,
} from '../bridge/protocol.ts';
import type { UnifiedLogEntry } from '../logging/log.ts';
import { bridgeLogPipeline } from '../logging/log.ts';
import { BridgeStateManager } from '../state/state-manager.ts';
import { isPlainObjectRecord, toSafeErrorMessage } from '../utils.ts';
import { debugLog } from '../utils/debug-log.ts';

// 底层 WebSocket 连接建立超时（从 register 到 onOpen 回调触发）。
// 用于等待 stdio 进程与桥接通道启动就绪，再进入后续工具调用流程。
const OPEN_TIMEOUT_MS = 5000;
// 应用层握手超时（从 hello 发送到 welcome 收到）。
const HANDSHAKE_TIMEOUT_MS = 5000;
// 客户端发送心跳包的时间间隔。
const HEARTBEAT_INTERVAL_MS = 1000;
// 服务端无活动超时阈值。任务执行期间（如库搜索）可能耗时较长，设此值需大于 DEFAULT_BRIDGE_TIMEOUT_MS。
const SERVER_IDLE_TIMEOUT_MS = 60000;
// 检查服务端无活动状态的轮询间隔。
const SERVER_IDLE_CHECK_INTERVAL_MS = 500;
const BRIDGE_STATUS_TEXT = BridgeStateManager.text;

interface BridgeTransportCallbacks {
	onRoleChanged: (message: BridgeServerRoleMessage) => void;
	onDebugSwitchChanged: (debugSwitch: BridgeDebugSwitch) => void;
	onTask: (task: BridgeQueueTask) => void | Promise<void>;
	onLost: (message: string) => void;
}

interface BridgeTaskError {
	message: string;
	stack?: string;
}

type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

// 解析 WebSocket 消息载荷为字符串。
async function decodeMessageData(data: unknown): Promise<string> {
	if (typeof data === 'string') {
		return data;
	}

	if (data instanceof Blob) {
		return await data.text();
	}

	if (data instanceof ArrayBuffer) {
		return new TextDecoder().decode(new Uint8Array(data));
	}

	if (ArrayBuffer.isView(data)) {
		return new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
	}

	throw new Error(BRIDGE_STATUS_TEXT.transport.unknownMessageFormat);
}

// 服务端允许发出的消息类型白名单。
const VALID_SERVER_MESSAGE_TYPES = new Set([
	'bridge/welcome',
	'bridge/role',
	'bridge/debug-switch',
	'bridge/heartbeat-ack',
	'bridge/task',
	'bridge/error',
]);

// 将任意输入解析为服务端消息结构。
async function parseServerMessage(data: unknown): Promise<BridgeServerMessage> {
	const text = await decodeMessageData(data);
	const parsed = JSON.parse(text) as unknown;
	if (!isPlainObjectRecord(parsed)) {
		throw new Error(BRIDGE_STATUS_TEXT.transport.invalidMessageRoot);
	}

	const messageType = String(parsed.type ?? '').trim();
	if (messageType.length === 0) {
		throw new Error(BRIDGE_STATUS_TEXT.transport.missingType);
	}

	if (!VALID_SERVER_MESSAGE_TYPES.has(messageType)) {
		throw new Error(`${BRIDGE_STATUS_TEXT.transport.unknownTypePrefix}${messageType}。`);
	}

	return parsed as unknown as BridgeServerMessage;
}

export class BridgeTransport {
	private readonly readyPromise: Promise<void>;
	private resolveReady: (() => void) | null = null;
	private rejectReady: ((reason?: unknown) => void) | null = null;
	// openTimer：等待 WebSocket 连接建立（onOpen）的超时定时器。
	private openTimer: TimerHandle | undefined;
	// connectTimer：等待应用层握手（welcome）的超时定时器。
	private connectTimer: TimerHandle | undefined;
	private heartbeatTimer: ReturnType<typeof globalThis.setInterval> | undefined;
	private idleCheckTimer: ReturnType<typeof globalThis.setInterval> | undefined;
	private closed = false;
	private welcomed = false;
	private lostNotified = false;
	private lastServerActivityAt = 0;

	public constructor(
		private readonly bridgeWebSocketUrl: string,
		private readonly socketId: string,
		private readonly clientId: string,
		private readonly bridgeVersion: string,
		private readonly callbacks: BridgeTransportCallbacks,
	) {
		this.readyPromise = new Promise<void>((resolve, reject) => {
			this.resolveReady = resolve;
			this.rejectReady = reject;
		});
	}

	/**
	 * 建立桥接连接并等待握手确认。
	 */
	public async connect(): Promise<void> {
		if (this.closed) {
			throw new Error(BRIDGE_STATUS_TEXT.transport.closed);
		}

		// 先启动连接建立超时；握手超时在 onOpen 触发后才开始计时。
		this.startOpenTimer();
		try {
			eda.sys_WebSocket.register(
				this.socketId,
				this.bridgeWebSocketUrl,
				async (event: MessageEvent<any>) => {
					await this.handleMessage(event);
				},
				() => {
					void this.handleConnected();
				},
			);
		}
		catch (error: unknown) {
			this.fail(`${BRIDGE_STATUS_TEXT.transport.connectFailedPrefix}${toSafeErrorMessage(error)}`, error);
		}

		await this.readyPromise;
	}

	/**
	 * 刷新服务端活动时间戳，供外部在任务执行期间调用，
	 * 避免长时间运行的任务被空闲超时检测误判断开。
	 */
	public refreshServerActivity(): void {
		this.lastServerActivityAt = Date.now();
	}

	/**
	 * 完成 Bridge 任务，并回传任务结果。
	 * @param requestId 任务标识。
	 * @param leaseTerm 任务租约。
	 * @param result 任务结果。
	 * @param taskError 任务错误。
	 */
	public completeTask(requestId: string, leaseTerm: number, result: unknown, taskError?: BridgeTaskError): void {
		debugLog('[DEBUG] bridge-transport completeTask called, requestId:', requestId, 'leaseTerm:', leaseTerm, 'hasError:', !!taskError);
		try {
			this.sendMessage({
				type: 'bridge/result',
				clientId: this.clientId,
				requestId,
				leaseTerm,
				result,
				error: taskError,
			});
			debugLog('[DEBUG] bridge-transport completeTask message sent successfully');
		} catch (error: unknown) {
			debugLog('[DEBUG] bridge-transport completeTask failed to send message:', error);
			throw error;
		}
	}

	/**
	 * 上报客户端日志。
	 * @param logEntry 日志记录。
	 */
	public reportLog(logEntry: UnifiedLogEntry): void {
		this.sendMessage({
			type: 'bridge/log',
			clientId: this.clientId,
			log: logEntry,
		});
	}

	/**
	 * 上报 Bridge 执行链路已就绪。
	 */
	public reportReady(): void {
		debugLog('[DEBUG] bridge-transport reportReady called, clientId:', this.clientId);
		this.sendMessage({
			type: 'bridge/ready',
			clientId: this.clientId,
			readyAt: Date.now(),
		});
		debugLog('[DEBUG] bridge-transport ready message sent');
	}

	/**
	 * 主动关闭桥接连接。
	 */
	public close(): void {
		if (this.closed) {
			return;
		}

		this.closed = true;
		this.stopTimers();
		this.rejectReadyOnce(new Error(BRIDGE_STATUS_TEXT.transport.closed));
		try {
			eda.sys_WebSocket.close(this.socketId, 1000, BRIDGE_STATUS_TEXT.transport.closeReason);
		}
		catch {
			// 主动关闭时忽略底层重复关闭异常。
		}
	}

	// 建立底层连接后发送握手并启动心跳。
	private async handleConnected(): Promise<void> {
		// WebSocket 已建立，停止连接建立超时，启动应用层握手超时。
		this.clearOpenTimer();
		this.startConnectTimer();
		this.startHeartbeat();
		this.startIdleMonitor();
		this.sendMessage({
			type: 'bridge/hello',
			clientId: this.clientId,
			bridgeVersion: this.bridgeVersion,
		});
	}

	// 处理服务端消息。
	private async handleMessage(event: MessageEvent<any>): Promise<void> {
		try {
			const message = await parseServerMessage(event.data);
			this.lastServerActivityAt = Date.now();

			if (message.type === 'bridge/welcome') {
				if (message.clientId !== this.clientId) {
					return;
				}
				if (!this.welcomed) {
					this.welcomed = true;
					this.clearConnectTimer();
					this.resolveReadyOnce();
				}
				return;
			}

			if (message.type === 'bridge/heartbeat-ack') {
				if (message.clientId !== this.clientId) {
					return;
				}
				// 心跳确认仅用于保活，不需要额外处理。
				return;
			}

			if (message.type === 'bridge/role') {
				if (message.clientId !== this.clientId) {
					return;
				}
				if (message.role !== 'active' && message.role !== 'standby') {
					return;
				}
				this.callbacks.onRoleChanged(message);
				return;
			}

			if (message.type === 'bridge/debug-switch') {
				if (message.clientId !== this.clientId) {
					return;
				}
				this.callbacks.onDebugSwitchChanged(message.debugSwitch);
				return;
			}

			if (message.type === 'bridge/task') {
				await this.callbacks.onTask({
					requestId: message.requestId,
					path: message.path,
					payload: message.payload,
					createdAt: message.createdAt,
					leaseTerm: message.leaseTerm,
				});
				return;
			}

			if (message.type === 'bridge/error') {
				const logEntry = bridgeLogPipeline.append(bridgeLogPipeline.createEntry({
					level: 'warning',
					module: 'bridge-transport',
					event: 'bridge.server.error',
					summary: BRIDGE_STATUS_TEXT.runtime.serverErrorSummary,
					message: String(message.message ?? '').trim() || BRIDGE_STATUS_TEXT.runtime.serverErrorSummary,
					detail: String(message.message ?? '').trim(),
					errorCode: 'bridge_server_error',
				}));
				console.warn(bridgeLogPipeline.format(logEntry));
			}
		}
		catch (error: unknown) {
			this.fail(`${BRIDGE_STATUS_TEXT.transport.messageHandleFailedPrefix}${toSafeErrorMessage(error)}`, error);
		}
	}

	// 向服务端发送协议消息。
	private sendMessage(message: BridgeClientMessage): void {
		debugLog('[DEBUG] bridge-transport sendMessage called, type:', message.type, 'closed:', this.closed);
		if (this.closed) {
			debugLog('[DEBUG] bridge-transport sendMessage blocked: connection closed');
			throw new Error(BRIDGE_STATUS_TEXT.transport.closed);
		}
		const payload = JSON.stringify(message);
		debugLog('[DEBUG] bridge-transport sendMessage sending, size:', payload.length);
		eda.sys_WebSocket.send(this.socketId, payload);
		debugLog('[DEBUG] bridge-transport sendMessage sent successfully');
	}

	// 启动连接建立超时保护，等待 WebSocket onOpen 回调。
	private startOpenTimer(): void {
		this.clearOpenTimer();
		this.openTimer = globalThis.setTimeout(() => {
			this.fail(BRIDGE_STATUS_TEXT.transport.waitingStdio, new Error(BRIDGE_STATUS_TEXT.transport.waitingStdio));
		}, OPEN_TIMEOUT_MS);
	}

	// 清理连接建立超时定时器。
	private clearOpenTimer(): void {
		if (this.openTimer !== undefined) {
			globalThis.clearTimeout(this.openTimer);
			this.openTimer = undefined;
		}
	}

	// 启动应用层握手超时保护，等待服务端 welcome 消息。
	private startConnectTimer(): void {
		this.clearConnectTimer();
		this.connectTimer = globalThis.setTimeout(() => {
			this.fail(BRIDGE_STATUS_TEXT.transport.handshakeTimeout, new Error(BRIDGE_STATUS_TEXT.transport.handshakeTimeout));
		}, HANDSHAKE_TIMEOUT_MS);
	}

	// 清理握手超时定时器。
	private clearConnectTimer(): void {
		if (this.connectTimer !== undefined) {
			globalThis.clearTimeout(this.connectTimer);
			this.connectTimer = undefined;
		}
	}

	// 启动心跳循环。
	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.heartbeatTimer = globalThis.setInterval(() => {
			try {
				this.sendMessage({
					type: 'bridge/heartbeat',
					clientId: this.clientId,
					sentAt: Date.now(),
				});
			}
			catch (error: unknown) {
				this.fail(`${BRIDGE_STATUS_TEXT.transport.heartbeatSendFailedPrefix}${toSafeErrorMessage(error)}`, error);
			}
		}, HEARTBEAT_INTERVAL_MS);
	}

	// 停止心跳循环。
	private stopHeartbeat(): void {
		if (this.heartbeatTimer !== undefined) {
			globalThis.clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = undefined;
		}
	}

	// 启动服务端活动超时检测。
	private startIdleMonitor(): void {
		this.stopIdleMonitor();
		this.lastServerActivityAt = Date.now();
		this.idleCheckTimer = globalThis.setInterval(() => {
			if (this.closed) {
				return;
			}
			if (Date.now() - this.lastServerActivityAt <= SERVER_IDLE_TIMEOUT_MS) {
				return;
			}

			this.fail(BRIDGE_STATUS_TEXT.transport.serverIdleTimeout, new Error(BRIDGE_STATUS_TEXT.transport.serverIdleTimeout));
		}, SERVER_IDLE_CHECK_INTERVAL_MS);
	}

	// 停止服务端活动超时检测。
	private stopIdleMonitor(): void {
		if (this.idleCheckTimer !== undefined) {
			globalThis.clearInterval(this.idleCheckTimer);
			this.idleCheckTimer = undefined;
		}
	}

	// 停止全部定时器。
	private stopTimers(): void {
		this.clearOpenTimer();
		this.clearConnectTimer();
		this.stopHeartbeat();
		this.stopIdleMonitor();
	}

	// 统一处理传输失效。
	private fail(message: string, reason?: unknown): void {
		if (this.lostNotified) {
			return;
		}

		this.lostNotified = true;
		this.closed = true;
		this.stopTimers();
		try {
			eda.sys_WebSocket.close(this.socketId, 1011, message);
		}
		catch {
			// 失效回收时忽略重复关闭异常。
		}

		this.rejectReadyOnce(reason instanceof Error ? reason : new Error(message));
		this.callbacks.onLost(message);
	}

	// 兑现握手 Promise。
	private resolveReadyOnce(): void {
		if (!this.resolveReady) {
			return;
		}

		const resolve = this.resolveReady;
		this.resolveReady = null;
		this.rejectReady = null;
		resolve();
	}

	// 拒绝握手 Promise。
	private rejectReadyOnce(reason: unknown): void {
		if (!this.rejectReady) {
			return;
		}

		const reject = this.rejectReady;
		this.resolveReady = null;
		this.rejectReady = null;
		reject(reason);
	}
}

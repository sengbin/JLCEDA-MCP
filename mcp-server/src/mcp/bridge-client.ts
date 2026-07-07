/**
 * WebSocket服务器 - 接受来自EDA插件的连接
 * EDA插件连接到这个服务器并执行任务
 *
 * 支持多MCP客户端模式：
 * - 第一个启动的实例成为主服务器
 * - 后续实例检测到端口被占用后，自动使用内部客户端模式连接到主服务器
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'net';

interface BridgeRequest {
  requestId: string;
  path: string;
  payload: unknown;
}

interface BridgeResponse {
  requestId: string;
  result?: unknown;
  error?: string;
}

/**
 * 检查端口是否可用
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

export class EdaBridgeServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private mcpClients: Set<WebSocket> = new Set(); // MCP客户端连接
  private started = false;
  private isMainServer = false; // 是否是主服务器
  private internalClient: WebSocket | null = null; // 内部客户端（连接到主服务器）
  private pendingRequests = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private requestIdCounter = 0;

  constructor(private readonly port: number = 8765) {}

  /**
   * 启动WebSocket服务器（支持多实例共享）
   */
  public async start(): Promise<void> {
    if (this.started) {
      return;
    }

    // 检查端口是否可用
    const portAvailable = await isPortAvailable(this.port);

    if (portAvailable) {
      // 端口可用，作为主服务器启动
      try {
        await this.startAsMainServer();
      } catch (error) {
        // 如果主服务器启动失败（可能是竞态条件），尝试作为客户端连接
        process.stderr.write(`Failed to start as main server, trying client mode: ${error}\n`);
        await this.startAsClient();
      }
    } else {
      // 端口被占用，作为客户端连接到主服务器
      await this.startAsClient();
    }

    this.started = true;
  }

  /**
   * 作为主服务器启动
   */
  private async startAsMainServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({
          port: this.port,
          // 不限制路径，接受所有连接
          noServer: false,
        });

        this.wss.on('listening', () => {
          this.isMainServer = true;
          process.stderr.write(`[Main Server] WebSocket server listening on ws://127.0.0.1:${this.port}\n`);
          resolve();
        });

        this.wss.on('connection', (ws: WebSocket, req) => {
          // 根据路径区分 EDA 客户端和 MCP 内部客户端
          const pathname = req.url || '/bridge/ws';
          process.stderr.write(`[Main Server] New connection from path: ${pathname}\n`);

          if (pathname.includes('/mcp-internal')) {
            this.handleMcpClientConnection(ws);
          } else {
            this.handleEdaClientConnection(ws);
          }
        });

        this.wss.on('error', (error) => {
          process.stderr.write(`WebSocket server error: ${error.message}\n`);
          if (!this.isMainServer) {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 作为客户端连接到主服务器
   */
  private async startAsClient(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `ws://127.0.0.1:${this.port}/mcp-internal`;
      this.internalClient = new WebSocket(url);

      this.internalClient.on('open', () => {
        process.stderr.write(`[Client Mode] Connected to main server at ${url}\n`);
        resolve();
      });

      this.internalClient.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessageFromMainServer(message);
        } catch (error) {
          process.stderr.write(`Failed to parse message from main server: ${error}\n`);
        }
      });

      this.internalClient.on('close', () => {
        process.stderr.write('[Client Mode] Disconnected from main server\n');
        this.internalClient = null;
        // 清理所有待处理的请求
        for (const [requestId, pending] of this.pendingRequests.entries()) {
          pending.reject(new Error('Main server connection closed'));
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(requestId);
        }
      });

      this.internalClient.on('error', (error) => {
        process.stderr.write(`[Client Mode] Connection error: ${error.message}\n`);
        reject(error);
      });

      // 连接超时
      setTimeout(() => {
        if (!this.internalClient || this.internalClient.readyState !== WebSocket.OPEN) {
          reject(new Error('Connection to main server timeout'));
        }
      }, 5000);
    });
  }

  /**
   * 处理 EDA 客户端连接
   */
  private handleEdaClientConnection(ws: WebSocket): void {
    this.clients.add(ws);
    process.stderr.write(`[Main Server] EDA client connected, total: ${this.clients.size}\n`);

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleEdaMessage(message, ws);
      } catch (error) {
        process.stderr.write(`Failed to parse EDA message: ${error}\n`);
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      process.stderr.write(`[Main Server] EDA client disconnected, remaining: ${this.clients.size}\n`);
    });

    ws.on('error', (error) => {
      process.stderr.write(`EDA client error: ${error.message}\n`);
    });
  }

  /**
   * 处理 MCP 内部客户端连接
   */
  private handleMcpClientConnection(ws: WebSocket): void {
    this.mcpClients.add(ws);
    process.stderr.write(`[Main Server] MCP client connected, total: ${this.mcpClients.size}\n`);

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        // MCP客户端发来的是任务请求，转发到EDA客户端
        if (message.type === 'bridge/task') {
          this.forwardTaskToEda(message, ws);
        }
      } catch (error) {
        process.stderr.write(`Failed to parse MCP client message: ${error}\n`);
      }
    });

    ws.on('close', () => {
      this.mcpClients.delete(ws);
      process.stderr.write(`[Main Server] MCP client disconnected, remaining: ${this.mcpClients.size}\n`);
    });

    ws.on('error', (error) => {
      process.stderr.write(`MCP client error: ${error.message}\n`);
    });
  }

  /**
   * 转发任务到 EDA 客户端
   */
  private forwardTaskToEda(message: any, mcpClient: WebSocket): void {
    if (this.clients.size === 0) {
      // 没有EDA客户端，返回错误
      mcpClient.send(JSON.stringify({
        type: 'bridge/result',
        requestId: message.requestId,
        error: 'No EDA clients connected'
      }));
      return;
    }

    // 发送到第一个EDA客户端
    const edaClient = Array.from(this.clients)[0];
    edaClient.send(JSON.stringify(message));

    // 保存MCP客户端的映射，以便转发响应
    const requestId = message.requestId;
    if (!this.pendingRequests.has(requestId)) {
      this.pendingRequests.set(requestId, {
        resolve: (result) => {
          mcpClient.send(JSON.stringify({
            type: 'bridge/result',
            requestId,
            result
          }));
        },
        reject: (error) => {
          mcpClient.send(JSON.stringify({
            type: 'bridge/result',
            requestId,
            error: error.message
          }));
        },
        timeout: setTimeout(() => {
          this.pendingRequests.delete(requestId);
          mcpClient.send(JSON.stringify({
            type: 'bridge/result',
            requestId,
            error: 'Request timeout'
          }));
        }, 30000)
      });
    }
  }

  /**
   * 处理来自EDA插件的消息
   */
  private handleEdaMessage(message: any, ws: WebSocket): void {
    if (message.type === 'bridge/result' && message.requestId) {
      // 这是任务执行结果
      const pending = this.pendingRequests.get(message.requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.requestId);

        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.result);
        }
      }
    }
  }

  /**
   * 处理来自主服务器的消息（客户端模式）
   */
  private handleMessageFromMainServer(message: any): void {
    if (message.type === 'bridge/result' && message.requestId) {
      const pending = this.pendingRequests.get(message.requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.requestId);

        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.result);
        }
      }
    }
  }

  /**
   * 发送任务请求到EDA插件
   */
  public async request(path: string, payload: unknown, timeoutMs: number = 30000): Promise<unknown> {
    if (!this.started) {
      throw new Error('Bridge server not started');
    }

    // 如果是客户端模式，通过内部客户端发送
    if (!this.isMainServer && this.internalClient) {
      return this.requestViaInternalClient(path, payload, timeoutMs);
    }

    // 主服务器模式，检查是否有EDA客户端连接
    if (this.clients.size === 0) {
      throw new Error('No EDA clients connected');
    }

    const requestId = `req_${++this.requestIdCounter}_${Date.now()}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      const request = {
        type: 'bridge/task',
        requestId,
        path,
        payload,
      };

      // 发送到第一个EDA客户端
      const client = Array.from(this.clients)[0];
      client.send(JSON.stringify(request));
    });
  }

  /**
   * 通过内部客户端发送请求（客户端模式）
   */
  private async requestViaInternalClient(path: string, payload: unknown, timeoutMs: number = 30000): Promise<unknown> {
    if (!this.internalClient || this.internalClient.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to main server');
    }

    const requestId = `req_${++this.requestIdCounter}_${Date.now()}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      const request = {
        type: 'bridge/task',
        requestId,
        path,
        payload,
      };

      this.internalClient!.send(JSON.stringify(request));
    });
  }

  /**
   * 关闭服务器
   */
  public close(): void {
    // 关闭内部客户端
    if (this.internalClient) {
      this.internalClient.close();
      this.internalClient = null;
    }

    // 关闭主服务器
    if (this.wss) {
      this.clients.forEach(ws => ws.close());
      this.mcpClients.forEach(ws => ws.close());
      this.clients.clear();
      this.mcpClients.clear();
      this.wss.close();
      this.wss = null;
    }

    this.started = false;
    this.isMainServer = false;
  }

  /**
   * 检查是否有EDA客户端连接
   */
  public hasClients(): boolean {
    if (this.isMainServer) {
      return this.clients.size > 0;
    } else {
      // 客户端模式，检查是否连接到主服务器
      return this.internalClient !== null && this.internalClient.readyState === WebSocket.OPEN;
    }
  }

  /**
   * 获取服务器模式
   */
  public getMode(): 'main' | 'client' | 'not-started' {
    if (!this.started) return 'not-started';
    return this.isMainServer ? 'main' : 'client';
  }
}


interface BridgeRequest {
  requestId: string;
  path: string;
  payload: unknown;
}

interface BridgeResponse {
  requestId: string;
  result?: unknown;
  error?: string;
}

export class EdaBridgeClient {
  private ws: WebSocket | null = null;
  private connected = false;
  private pendingRequests = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private requestIdCounter = 0;

  constructor(private readonly bridgeUrl: string = 'ws://127.0.0.1:8765/bridge/ws') {}

  /**
   * 连接到EDA插件
   */
  public async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.bridgeUrl);

      this.ws.on('open', () => {
        this.connected = true;
        process.stderr.write(`Connected to EDA bridge at ${this.bridgeUrl}\n`);
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          process.stderr.write(`Failed to parse bridge message: ${error}\n`);
        }
      });

      this.ws.on('close', () => {
        this.connected = false;
        process.stderr.write('Disconnected from EDA bridge\n');
        // 拒绝所有pending的请求
        for (const [requestId, pending] of this.pendingRequests.entries()) {
          pending.reject(new Error('Bridge connection closed'));
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(requestId);
        }
      });

      this.ws.on('error', (error) => {
        process.stderr.write(`Bridge connection error: ${error.message}\n`);
        reject(error);
      });

      // 5秒连接超时
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  /**
   * 发送请求到EDA插件
   */
  public async request(path: string, payload: unknown, timeoutMs: number = 30000): Promise<unknown> {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected to EDA bridge');
    }

    const requestId = `req_${++this.requestIdCounter}_${Date.now()}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Bridge request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      const request: BridgeRequest = {
        requestId,
        path,
        payload,
      };

      this.ws!.send(JSON.stringify({
        type: 'bridge/task',
        ...request,
      }));
    });
  }

  /**
   * 处理来自EDA插件的消息
   */
  private handleMessage(message: any): void {
    if (message.type === 'bridge/result' && message.requestId) {
      const pending = this.pendingRequests.get(message.requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.requestId);

        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.result);
        }
      }
    }
  }

  /**
   * 关闭连接
   */
  public close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }

  /**
   * 检查是否已连接
   */
  public isConnected(): boolean {
    return this.connected;
  }
}

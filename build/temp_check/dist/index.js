"use strict";
var edaEsbuildExportName = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    about: () => about,
    activate: () => activate,
    clearDebugLogAction: () => clearDebugLogAction,
    deactivate: () => deactivate,
    openSettingsPage: () => openSettingsPage,
    restartServer: () => restartServer,
    viewConnectionStatus: () => viewConnectionStatus,
    viewDebugLog: () => viewDebugLog
  });

  // extension.json
  var version = "2.0.0";

  // src/utils/debug-log.ts
  var logBuffer = [];
  var MAX_BUFFER_SIZE = 100;
  function debugLog(message, ...args) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const argsStr = args.map((arg) => {
      try {
        return typeof arg === "object" ? JSON.stringify(arg) : String(arg);
      } catch {
        return String(arg);
      }
    }).join(" ");
    const logLine = `[${timestamp}] ${message} ${argsStr}`;
    console.log(logLine);
    logBuffer.push(logLine);
    if (logBuffer.length > MAX_BUFFER_SIZE) {
      logBuffer.shift();
    }
    try {
      const storageKey = "mcp_bridge_debug_log";
      const currentLog = logBuffer.join("\n");
      eda.sys_Storage.setExtensionUserConfig(storageKey, {
        timestamp: Date.now(),
        log: currentLog
      });
    } catch (error) {
      console.error("Failed to write debug log to storage:", error);
    }
  }
  function getDebugLog() {
    try {
      const stored = eda.sys_Storage.getExtensionUserConfig("mcp_bridge_debug_log");
      if (stored && typeof stored === "object" && "log" in stored && typeof stored.log === "string") {
        return stored.log;
      }
    } catch {
    }
    return logBuffer.join("\n");
  }
  function clearDebugLog() {
    logBuffer = [];
    try {
      eda.sys_Storage.setExtensionUserConfig("mcp_bridge_debug_log", null);
    } catch {
    }
  }

  // src/utils.ts
  function isPlainObjectRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function toSafeErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }
  function parseBoundedIntegerValue(value, defaultValue, min, max) {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      return defaultValue;
    }
    if (value < min || value > max) {
      throw new Error(`\u6574\u6570\u53C2\u6570\u8D85\u51FA\u8303\u56F4\uFF0C\u5141\u8BB8\u533A\u95F4: ${min}-${max}\u3002`);
    }
    return value;
  }
  function toSerializable(value, depth = 0, seen) {
    if (value === null || value === void 0) {
      return value;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (typeof value === "function") {
      const functionName = value.name;
      return `[Function ${typeof functionName === "string" && functionName.length > 0 ? functionName : "anonymous"}]`;
    }
    if (depth >= 4) {
      return "[MaxDepthExceeded]";
    }
    const tracked = seen ?? /* @__PURE__ */ new WeakSet();
    if (typeof value === "object") {
      if (tracked.has(value)) {
        return "[Circular]";
      }
      tracked.add(value);
    }
    if (Array.isArray(value)) {
      return value.slice(0, 120).map((item) => toSerializable(item, depth + 1, tracked));
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (isPlainObjectRecord(value)) {
      const output = {};
      for (const [key, child] of Object.entries(value)) {
        output[key] = toSerializable(child, depth + 1, tracked);
      }
      return output;
    }
    return String(value);
  }
  function isBlobLike(value) {
    return typeof Blob !== "undefined" && value instanceof Blob;
  }
  async function serializeBlobLike(value) {
    const blobLike = value;
    const output = {
      kind: "blob",
      size: blobLike.size,
      type: blobLike.type,
      text: await blobLike.text()
    };
    if (typeof blobLike.name === "string" && blobLike.name.length > 0) {
      output.name = blobLike.name;
    }
    if (typeof blobLike.lastModified === "number" && Number.isFinite(blobLike.lastModified)) {
      output.lastModified = blobLike.lastModified;
    }
    return output;
  }
  async function toSerializableAsync(value, depth = 0, seen) {
    if (value === null || value === void 0) {
      return value;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (typeof value === "function") {
      const functionName = value.name;
      return `[Function ${typeof functionName === "string" && functionName.length > 0 ? functionName : "anonymous"}]`;
    }
    if (depth >= 4) {
      return "[MaxDepthExceeded]";
    }
    if (isBlobLike(value)) {
      return await serializeBlobLike(value);
    }
    const tracked = seen ?? /* @__PURE__ */ new WeakSet();
    if (typeof value === "object") {
      if (tracked.has(value)) {
        return "[Circular]";
      }
      tracked.add(value);
    }
    if (Array.isArray(value)) {
      return await Promise.all(value.slice(0, 120).map((item) => toSerializableAsync(item, depth + 1, tracked)));
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (isPlainObjectRecord(value)) {
      const output = {};
      for (const [key, child] of Object.entries(value)) {
        output[key] = await toSerializableAsync(child, depth + 1, tracked);
      }
      return output;
    }
    return String(value);
  }
  async function safeCall(executor) {
    try {
      return await executor();
    } catch {
      return void 0;
    }
  }

  // src/state/connection-status.ts
  var ConnectionStatusManager = class {
    connections = /* @__PURE__ */ new Map();
    serverStartedAt = 0;
    totalRequestsHandled = 0;
    /**
     * 标记服务器已启动
     */
    markServerStarted() {
      this.serverStartedAt = Date.now();
      debugLog("[Status] Server started at: " + new Date(this.serverStartedAt).toLocaleString());
    }
    /**
     * 添加新连接
     */
    addConnection(clientId) {
      const info = {
        clientId,
        connectedAt: Date.now(),
        lastActivityAt: Date.now(),
        requestCount: 0
      };
      this.connections.set(clientId, info);
      debugLog("[Status] Client connected: " + clientId + ", total: " + this.connections.size);
      this.showConnectionToast("MCP\u670D\u52A1\u5668\u5DF2\u8FDE\u63A5", true);
    }
    /**
     * 移除连接
     */
    removeConnection(clientId) {
      if (this.connections.delete(clientId)) {
        debugLog("[Status] Client disconnected: " + clientId + ", remaining: " + this.connections.size);
        if (this.connections.size === 0) {
          this.showConnectionToast("MCP\u670D\u52A1\u5668\u5DF2\u65AD\u5F00", false);
        }
      }
    }
    /**
     * 更新连接活动时间
     */
    updateActivity(clientId) {
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
    getStatusSummary() {
      const lines = [];
      lines.push("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
      lines.push("  MCP Bridge \u5BA2\u6237\u7AEF\u72B6\u6001 (v2.0)");
      lines.push("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
      lines.push("");
      if (this.serverStartedAt === 0 && this.connections.size === 0) {
        lines.push("\u26A0\uFE0F  \u5BA2\u6237\u7AEF\u672A\u542F\u52A8");
        return lines.join("\n");
      }
      const uptime = this.serverStartedAt > 0 ? Date.now() - this.serverStartedAt : 0;
      const uptimeStr = uptime > 0 ? this.formatUptime(uptime) : "\u521A\u521A\u542F\u52A8";
      lines.push("\u2705 \u5BA2\u6237\u7AEF\u8FD0\u884C\u4E2D");
      lines.push("");
      lines.push("\u670D\u52A1\u5668\u5730\u5740: ws://127.0.0.1:8765/bridge/ws");
      lines.push("\u8FD0\u884C\u65F6\u957F: " + uptimeStr);
      lines.push("\u603B\u8BF7\u6C42\u6570: " + this.totalRequestsHandled);
      lines.push("");
      if (this.connections.size === 0) {
        lines.push("\u26A0\uFE0F  \u5F53\u524D\u672A\u8FDE\u63A5\u5230MCP\u670D\u52A1\u5668");
        lines.push("");
        lines.push("\u63D0\u793A\uFF1A\u8BF7\u786E\u4FDDMCP\u670D\u52A1\u5668\u6B63\u5728\u8FD0\u884C");
      } else {
        lines.push("\u2705 \u5DF2\u8FDE\u63A5\u5230MCP\u670D\u52A1\u5668");
        lines.push("");
        lines.push("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
        lines.push("  \u8FDE\u63A5\u8BE6\u60C5");
        lines.push("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
        let index = 1;
        for (const [clientId, info] of this.connections.entries()) {
          const connectedTime = Date.now() - info.connectedAt;
          const connectedStr = this.formatUptime(connectedTime);
          const idleTime = Date.now() - info.lastActivityAt;
          const idleStr = this.formatUptime(idleTime);
          lines.push("");
          lines.push("\u8FDE\u63A5 #" + index + ":");
          lines.push("  ID: " + clientId);
          lines.push("  \u8FDE\u63A5\u65F6\u957F: " + connectedStr);
          lines.push("  \u7A7A\u95F2\u65F6\u95F4: " + idleStr);
          lines.push("  \u5904\u7406\u8BF7\u6C42: " + info.requestCount + " \u4E2A");
          index++;
        }
      }
      lines.push("");
      lines.push("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
      return lines.join("\n");
    }
    /**
     * 检查是否有活动连接
     */
    hasActiveConnections() {
      return this.connections.size > 0;
    }
    /**
     * 获取连接数量
     */
    getConnectionCount() {
      return this.connections.size;
    }
    /**
     * 显示连接状态Toast提示
     */
    showConnectionToast(message, isSuccess) {
      try {
        eda.sys_Message.showToastMessage(
          message,
          isSuccess ? 1 : 2,
          // 1=SUCCESS, 2=WARNING
          3
        );
      } catch (e) {
      }
    }
    /**
     * 格式化时长
     */
    formatUptime(ms) {
      const seconds = Math.floor(ms / 1e3);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) {
        return days + "\u5929 " + hours % 24 + "\u5C0F\u65F6";
      } else if (hours > 0) {
        return hours + "\u5C0F\u65F6 " + minutes % 60 + "\u5206\u949F";
      } else if (minutes > 0) {
        return minutes + "\u5206\u949F " + seconds % 60 + "\u79D2";
      } else {
        return seconds + "\u79D2";
      }
    }
    /**
     * 清空所有连接
     */
    clear() {
      this.connections.clear();
      this.serverStartedAt = 0;
      this.totalRequestsHandled = 0;
    }
  };
  var connectionStatusManager = new ConnectionStatusManager();

  // src/runtime/bridge-transport-client.ts
  var BridgeTransport = class {
    // 5秒重连
    constructor(serverUrl, callbacks) {
      this.serverUrl = serverUrl;
      this.callbacks = callbacks;
    }
    socketId = null;
    connected = false;
    reconnectTimer;
    RECONNECT_INTERVAL = 5e3;
    /**
     * 启动客户端并连接到MCP服务器
     */
    async start() {
      debugLog("[Bridge] Connecting to MCP server at " + this.serverUrl);
      this.connect().catch((error) => {
        debugLog("[Bridge] Initial connection failed: " + toSafeErrorMessage(error));
      });
    }
    /**
     * 连接到MCP服务器
     */
    async connect() {
      if (this.connected) {
        return;
      }
      try {
        this.socketId = "eda_bridge_" + Date.now();
        eda.sys_WebSocket.register(
          this.socketId,
          this.serverUrl,
          (event) => {
            if (event.data) {
              this.handleMessage(String(event.data));
            }
          },
          () => {
            this.onConnected();
          }
        );
        debugLog("[Bridge] WebSocket connection registered");
      } catch (error) {
        debugLog("[Bridge] Failed to register: " + toSafeErrorMessage(error));
        this.scheduleReconnect();
        throw error;
      }
    }
    /**
     * 连接成功
     */
    onConnected() {
      this.connected = true;
      connectionStatusManager.addConnection("mcp-server");
      debugLog("[Bridge] Connected to MCP server");
      console.log("[Bridge] Connected to MCP server at " + this.serverUrl);
      try {
        eda.sys_Message.showToastMessage(
          "\u5DF2\u8FDE\u63A5\u5230MCP\u670D\u52A1\u5668",
          1,
          // SUCCESS
          3
        );
      } catch (e) {
      }
    }
    /**
     * 连接断开
     */
    onDisconnected(code, reason) {
      this.connected = false;
      connectionStatusManager.removeConnection("mcp-server");
      debugLog("[Bridge] Disconnected from MCP server: " + code + " - " + reason);
      try {
        eda.sys_Message.showToastMessage(
          "MCP\u670D\u52A1\u5668\u8FDE\u63A5\u65AD\u5F00",
          2,
          // WARNING
          3
        );
      } catch (e) {
      }
      this.scheduleReconnect();
    }
    /**
     * 连接错误
     */
    onError(error) {
      debugLog("[Bridge] WebSocket error: " + error);
    }
    /**
     * 安排重连
     */
    scheduleReconnect() {
      if (this.reconnectTimer) {
        return;
      }
      debugLog("[Bridge] Scheduling reconnect in " + this.RECONNECT_INTERVAL + "ms");
      this.reconnectTimer = globalThis.setTimeout(() => {
        this.reconnectTimer = void 0;
        this.connect().catch(() => {
        });
      }, this.RECONNECT_INTERVAL);
    }
    /**
     * 处理来自MCP服务器的消息
     */
    async handleMessage(data) {
      try {
        const message = JSON.parse(data);
        if (!isPlainObjectRecord(message)) {
          debugLog("[Bridge] Invalid message format");
          return;
        }
        if (message.type === "bridge/task") {
          connectionStatusManager.updateActivity("mcp-server");
          await this.handleTask(message);
        }
      } catch (error) {
        debugLog("[Bridge] Failed to handle message: " + toSafeErrorMessage(error));
      }
    }
    /**
     * 处理任务请求
     */
    async handleTask(message) {
      const { requestId, path, payload } = message;
      try {
        debugLog("[Bridge] Handling task: " + path + ", requestId: " + requestId);
        const result = await this.callbacks.onTask(requestId, path, payload);
        const serialized = await toSerializableAsync(result);
        const response = {
          type: "bridge/result",
          requestId,
          result: serialized
        };
        this.sendMessage(response);
        debugLog("[Bridge] Task completed: " + requestId);
      } catch (error) {
        const response = {
          type: "bridge/result",
          requestId,
          error: toSafeErrorMessage(error)
        };
        this.sendMessage(response);
        debugLog("[Bridge] Task failed: " + requestId + ", error: " + toSafeErrorMessage(error));
      }
    }
    /**
     * 发送消息到MCP服务器
     */
    sendMessage(message) {
      if (!this.connected || !this.socketId) {
        debugLog("[Bridge] Cannot send message: not connected");
        return;
      }
      try {
        const data = JSON.stringify(message);
        eda.sys_WebSocket.send(this.socketId, data);
      } catch (error) {
        debugLog("[Bridge] Failed to send message: " + toSafeErrorMessage(error));
      }
    }
    /**
     * 停止并断开连接
     */
    stop() {
      if (this.reconnectTimer) {
        globalThis.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = void 0;
      }
      if (this.socketId) {
        try {
          eda.sys_WebSocket.close(this.socketId);
        } catch (e) {
        }
        this.socketId = null;
      }
      this.connected = false;
      connectionStatusManager.clear();
      debugLog("[Bridge] Stopped");
    }
    /**
     * 检查是否已连接
     */
    isConnected() {
      return this.connected;
    }
  };

  // src/mcp/api-index-handler.ts
  var SCHEMATIC_API_INDEX = [
    // ── dmt_Schematic：原理图文档管理 ──────────────────────────────────────
    { fullName: "eda.dmt_Schematic.createSchematic", summary: "\u521B\u5EFA\u539F\u7406\u56FE" },
    { fullName: "eda.dmt_Schematic.createSchematicPage", summary: "\u521B\u5EFA\u539F\u7406\u56FE\u56FE\u9875" },
    { fullName: "eda.dmt_Schematic.modifySchematicName", summary: "\u4FEE\u6539\u539F\u7406\u56FE\u540D\u79F0" },
    { fullName: "eda.dmt_Schematic.modifySchematicPageName", summary: "\u4FEE\u6539\u539F\u7406\u56FE\u56FE\u9875\u540D\u79F0" },
    { fullName: "eda.dmt_Schematic.getCurrentSchematicInfo", summary: "\u83B7\u53D6\u5F53\u524D\u539F\u7406\u56FE\u7684\u8BE6\u7EC6\u5C5E\u6027" },
    { fullName: "eda.dmt_Schematic.getCurrentSchematicPageInfo", summary: "\u83B7\u53D6\u5F53\u524D\u539F\u7406\u56FE\u56FE\u9875\u7684\u8BE6\u7EC6\u5C5E\u6027" },
    { fullName: "eda.dmt_Schematic.getAllSchematicsInfo", summary: "\u83B7\u53D6\u5DE5\u7A0B\u5185\u6240\u6709\u539F\u7406\u56FE\u7684\u8BE6\u7EC6\u5C5E\u6027" },
    { fullName: "eda.dmt_Schematic.getAllSchematicPagesInfo", summary: "\u83B7\u53D6\u5DE5\u7A0B\u5185\u6240\u6709\u539F\u7406\u56FE\u56FE\u9875\u7684\u8BE6\u7EC6\u5C5E\u6027" },
    { fullName: "eda.dmt_Schematic.deleteSchematicPage", summary: "\u5220\u9664\u539F\u7406\u56FE\u56FE\u9875" },
    { fullName: "eda.dmt_Schematic.deleteSchematic", summary: "\u5220\u9664\u539F\u7406\u56FE" },
    // ── sch_Document：画布文档操作 ─────────────────────────────────────────
    { fullName: "eda.sch_Document.save", summary: "\u4FDD\u5B58\u6587\u6863" },
    { fullName: "eda.sch_Document.navigateToCoordinates", summary: "\u5B9A\u4F4D\u5230\u753B\u5E03\u5750\u6807" },
    { fullName: "eda.sch_Document.navigateToRegion", summary: "\u5B9A\u4F4D\u5230\u753B\u5E03\u533A\u57DF" },
    { fullName: "eda.sch_Document.getPrimitiveAtPoint", summary: "\u83B7\u53D6\u5750\u6807\u70B9\u7684\u56FE\u5143" },
    { fullName: "eda.sch_Document.getPrimitivesInRegion", summary: "\u83B7\u53D6\u533A\u57DF\u5185\u6240\u6709\u56FE\u5143" },
    { fullName: "eda.sch_Document.autoLayout", summary: "\u81EA\u52A8\u5E03\u5C40" },
    { fullName: "eda.sch_Document.autoRouting", summary: "\u81EA\u52A8\u5E03\u7EBF" },
    // ── sch_Primitive：通用图元操作 ────────────────────────────────────────
    { fullName: "eda.sch_Primitive.getPrimitiveTypeByPrimitiveId", summary: "\u83B7\u53D6\u6307\u5B9A ID \u7684\u56FE\u5143\u7C7B\u578B" },
    { fullName: "eda.sch_Primitive.getPrimitiveByPrimitiveId", summary: "\u83B7\u53D6\u6307\u5B9A ID \u7684\u56FE\u5143\u7684\u6240\u6709\u5C5E\u6027" },
    { fullName: "eda.sch_Primitive.getPrimitivesByPrimitiveId", summary: "\u6279\u91CF\u83B7\u53D6\u591A\u4E2A\u56FE\u5143 ID \u7684\u6240\u6709\u5C5E\u6027" },
    { fullName: "eda.sch_Primitive.getPrimitivesBBox", summary: "\u83B7\u53D6\u56FE\u5143\u7684 BBox\uFF08\u8FB9\u754C\u6846\uFF09" },
    // ── sch_SelectControl：选中控制 ────────────────────────────────────────
    { fullName: "eda.sch_SelectControl.getAllSelectedPrimitives", summary: "\u67E5\u8BE2\u6240\u6709\u5DF2\u9009\u4E2D\u56FE\u5143\u7684\u56FE\u5143\u5BF9\u8C61" },
    { fullName: "eda.sch_SelectControl.getSelectedPrimitives", summary: "\u67E5\u8BE2\u9009\u4E2D\u56FE\u5143\u7684\u6240\u6709\u53C2\u6570" },
    { fullName: "eda.sch_SelectControl.doSelectPrimitives", summary: "\u4F7F\u7528\u56FE\u5143 ID \u9009\u4E2D\u56FE\u5143" },
    { fullName: "eda.sch_SelectControl.clearSelected", summary: "\u6E05\u9664\u9009\u4E2D" },
    { fullName: "eda.sch_SelectControl.getCurrentMousePosition", summary: "\u83B7\u53D6\u5F53\u524D\u9F20\u6807\u5728\u753B\u5E03\u4E0A\u7684\u4F4D\u7F6E" },
    // ── sch_PrimitiveComponent：器件 ───────────────────────────────────────
    { fullName: "eda.sch_PrimitiveComponent.create", summary: "\u521B\u5EFA\u5668\u4EF6" },
    { fullName: "eda.sch_PrimitiveComponent.createNetFlag", summary: "\u521B\u5EFA\u7F51\u7EDC\u6807\u8BC6\uFF08\u7535\u6E90/\u5730\u7B49\uFF09" },
    { fullName: "eda.sch_PrimitiveComponent.createNetPort", summary: "\u521B\u5EFA\u7F51\u7EDC\u7AEF\u53E3" },
    { fullName: "eda.sch_PrimitiveComponent.placeComponentWithMouse", summary: "\u4F7F\u7528\u9F20\u6807\u653E\u7F6E\u5668\u4EF6\uFF08\u4EA4\u4E92\u5F0F\u653E\u7F6E\uFF09" },
    { fullName: "eda.sch_PrimitiveComponent.delete", summary: "\u5220\u9664\u5668\u4EF6" },
    { fullName: "eda.sch_PrimitiveComponent.modify", summary: "\u4FEE\u6539\u5668\u4EF6\u5C5E\u6027" },
    { fullName: "eda.sch_PrimitiveComponent.get", summary: "\u83B7\u53D6\u5668\u4EF6\u7684\u6240\u6709\u5C5E\u6027" },
    { fullName: "eda.sch_PrimitiveComponent.getAll", summary: "\u83B7\u53D6\u5F53\u524D\u9875\u6240\u6709\u5668\u4EF6" },
    { fullName: "eda.sch_PrimitiveComponent.getAllPrimitiveId", summary: "\u83B7\u53D6\u6240\u6709\u5668\u4EF6\u7684\u56FE\u5143 ID" },
    { fullName: "eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId", summary: "\u83B7\u53D6\u5668\u4EF6\u5173\u8054\u7684\u6240\u6709\u5F15\u811A\uFF08\u542B\u7F51\u7EDC\u540D\uFF09" },
    { fullName: "eda.sch_PrimitiveComponent.getAllPropertyNames", summary: "\u83B7\u53D6\u6240\u6709\u5668\u4EF6\u7684\u5C5E\u6027\u540D\u79F0\u96C6\u5408" },
    // ── sch_PrimitiveWire：导线 ────────────────────────────────────────────
    { fullName: "eda.sch_PrimitiveWire.create", summary: "\u521B\u5EFA\u5BFC\u7EBF" },
    { fullName: "eda.sch_PrimitiveWire.delete", summary: "\u5220\u9664\u5BFC\u7EBF" },
    { fullName: "eda.sch_PrimitiveWire.modify", summary: "\u4FEE\u6539\u5BFC\u7EBF" },
    { fullName: "eda.sch_PrimitiveWire.get", summary: "\u83B7\u53D6\u5BFC\u7EBF\u5C5E\u6027" },
    { fullName: "eda.sch_PrimitiveWire.getAll", summary: "\u83B7\u53D6\u6240\u6709\u5BFC\u7EBF" },
    { fullName: "eda.sch_PrimitiveWire.getAllPrimitiveId", summary: "\u83B7\u53D6\u6240\u6709\u5BFC\u7EBF\u7684\u56FE\u5143 ID" },
    // ── sch_PrimitiveAttribute：属性/网络标签 ─────────────────────────────
    { fullName: "eda.sch_PrimitiveAttribute.create", summary: "\u521B\u5EFA\u5C5E\u6027" },
    { fullName: "eda.sch_PrimitiveAttribute.createNetLabel", summary: "\u521B\u5EFA\u7F51\u7EDC\u6807\u7B7E" },
    { fullName: "eda.sch_PrimitiveAttribute.delete", summary: "\u5220\u9664\u5C5E\u6027" },
    { fullName: "eda.sch_PrimitiveAttribute.modify", summary: "\u4FEE\u6539\u5C5E\u6027" },
    { fullName: "eda.sch_PrimitiveAttribute.get", summary: "\u83B7\u53D6\u5C5E\u6027" },
    { fullName: "eda.sch_PrimitiveAttribute.getAll", summary: "\u83B7\u53D6\u6240\u6709\u5C5E\u6027" },
    // ── sch_PrimitiveText：文本 ────────────────────────────────────────────
    { fullName: "eda.sch_PrimitiveText.create", summary: "\u521B\u5EFA\u6587\u672C" },
    { fullName: "eda.sch_PrimitiveText.delete", summary: "\u5220\u9664\u6587\u672C" },
    { fullName: "eda.sch_PrimitiveText.modify", summary: "\u4FEE\u6539\u6587\u672C" },
    { fullName: "eda.sch_PrimitiveText.get", summary: "\u83B7\u53D6\u6587\u672C\u5C5E\u6027" },
    { fullName: "eda.sch_PrimitiveText.getAll", summary: "\u83B7\u53D6\u6240\u6709\u6587\u672C" },
    // ── sch_PrimitiveBus：总线 ─────────────────────────────────────────────
    { fullName: "eda.sch_PrimitiveBus.create", summary: "\u521B\u5EFA\u603B\u7EBF" },
    { fullName: "eda.sch_PrimitiveBus.delete", summary: "\u5220\u9664\u603B\u7EBF" },
    { fullName: "eda.sch_PrimitiveBus.modify", summary: "\u4FEE\u6539\u603B\u7EBF" },
    { fullName: "eda.sch_PrimitiveBus.get", summary: "\u83B7\u53D6\u603B\u7EBF\u5C5E\u6027" },
    { fullName: "eda.sch_PrimitiveBus.getAll", summary: "\u83B7\u53D6\u6240\u6709\u603B\u7EBF" },
    // ── sch_PrimitivePin：引脚 ─────────────────────────────────────────────
    { fullName: "eda.sch_PrimitivePin.create", summary: "\u521B\u5EFA\u5F15\u811A" },
    { fullName: "eda.sch_PrimitivePin.delete", summary: "\u5220\u9664\u5F15\u811A" },
    { fullName: "eda.sch_PrimitivePin.modify", summary: "\u4FEE\u6539\u5F15\u811A" },
    { fullName: "eda.sch_PrimitivePin.get", summary: "\u83B7\u53D6\u5F15\u811A\u5C5E\u6027" },
    { fullName: "eda.sch_PrimitivePin.getAll", summary: "\u83B7\u53D6\u6240\u6709\u5F15\u811A" },
    // ── sch_PrimitiveRectangle / Circle / Arc / Polygon：绘图图元 ─────────
    { fullName: "eda.sch_PrimitiveRectangle.create", summary: "\u521B\u5EFA\u77E9\u5F62" },
    { fullName: "eda.sch_PrimitiveRectangle.delete", summary: "\u5220\u9664\u77E9\u5F62" },
    { fullName: "eda.sch_PrimitiveRectangle.modify", summary: "\u4FEE\u6539\u77E9\u5F62" },
    { fullName: "eda.sch_PrimitiveRectangle.getAll", summary: "\u83B7\u53D6\u6240\u6709\u77E9\u5F62" },
    { fullName: "eda.sch_PrimitiveCircle.create", summary: "\u521B\u5EFA\u5706" },
    { fullName: "eda.sch_PrimitiveCircle.delete", summary: "\u5220\u9664\u5706" },
    { fullName: "eda.sch_PrimitiveCircle.modify", summary: "\u4FEE\u6539\u5706" },
    { fullName: "eda.sch_PrimitiveCircle.getAll", summary: "\u83B7\u53D6\u6240\u6709\u5706" },
    { fullName: "eda.sch_PrimitiveArc.create", summary: "\u521B\u5EFA\u5706\u5F27" },
    { fullName: "eda.sch_PrimitiveArc.delete", summary: "\u5220\u9664\u5706\u5F27" },
    { fullName: "eda.sch_PrimitiveArc.modify", summary: "\u4FEE\u6539\u5706\u5F27" },
    { fullName: "eda.sch_PrimitiveArc.getAll", summary: "\u83B7\u53D6\u6240\u6709\u5706\u5F27" },
    { fullName: "eda.sch_PrimitivePolygon.create", summary: "\u521B\u5EFA\u591A\u8FB9\u5F62" },
    { fullName: "eda.sch_PrimitivePolygon.delete", summary: "\u5220\u9664\u591A\u8FB9\u5F62" },
    { fullName: "eda.sch_PrimitivePolygon.modify", summary: "\u4FEE\u6539\u591A\u8FB9\u5F62" },
    { fullName: "eda.sch_PrimitivePolygon.getAll", summary: "\u83B7\u53D6\u6240\u6709\u591A\u8FB9\u5F62" },
    // ── sch_Drc：规则检查 ──────────────────────────────────────────────────
    { fullName: "eda.sch_Drc.check", summary: "\u6267\u884C DRC \u7535\u6C14\u89C4\u5219\u68C0\u67E5" },
    // ── sch_ManufactureData：生产数据 ──────────────────────────────────────
    { fullName: "eda.sch_ManufactureData.getBomFile", summary: "\u83B7\u53D6 BOM \u6587\u4EF6" },
    { fullName: "eda.sch_ManufactureData.getNetlistFile", summary: "\u83B7\u53D6\u7F51\u8868\u6587\u4EF6\uFF08Netlist\uFF09" },
    { fullName: "eda.sch_ManufactureData.getExportDocumentFile", summary: "\u83B7\u53D6\u5BFC\u51FA\u6587\u6863\u6587\u4EF6" },
    // ── lib_Device：器件库搜索 ─────────────────────────────────────────────
    { fullName: "eda.lib_Device.search", summary: "\u641C\u7D22\u5668\u4EF6\uFF08\u6309\u5173\u952E\u8BCD\uFF09" },
    { fullName: "eda.lib_Device.get", summary: "\u83B7\u53D6\u5668\u4EF6\u7684\u6240\u6709\u5C5E\u6027" },
    { fullName: "eda.lib_Device.getByLcscIds", summary: "\u4F7F\u7528\u7ACB\u521B C \u7F16\u53F7\u83B7\u53D6\u5668\u4EF6" },
    { fullName: "eda.lib_Device.searchByProperties", summary: "\u4F7F\u7528\u5C5E\u6027\u7CBE\u786E\u641C\u7D22\u5668\u4EF6" },
    // ── lib_LibrariesList：库 UUID 查询 ───────────────────────────────────
    { fullName: "eda.lib_LibrariesList.getSystemLibraryUuid", summary: "\u83B7\u53D6\u7CFB\u7EDF\u5E93\u7684 UUID" },
    { fullName: "eda.lib_LibrariesList.getPersonalLibraryUuid", summary: "\u83B7\u53D6\u4E2A\u4EBA\u5E93\u7684 UUID" },
    { fullName: "eda.lib_LibrariesList.getProjectLibraryUuid", summary: "\u83B7\u53D6\u5DE5\u7A0B\u5E93\u7684 UUID" },
    // ── sch_Netlist：网表 ──────────────────────────────────────────────────
    { fullName: "eda.sch_Netlist.setNetlist", summary: "\u66F4\u65B0\u7F51\u8868" },
    // ── sch_Utils：工具 ────────────────────────────────────────────────────
    { fullName: "eda.sch_Utils.splitLines", summary: "\u62C6\u5206\u591A\u6BB5\u7EBF" }
  ];
  async function handleApiIndexTask(payload) {
    let ownerFilter = "";
    if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
      ownerFilter = String(payload.owner ?? "").trim().toLowerCase();
    }
    const index = ownerFilter ? SCHEMATIC_API_INDEX.filter((entry) => entry.fullName.toLowerCase().includes(ownerFilter)) : SCHEMATIC_API_INDEX;
    return {
      ok: true,
      total: index.length,
      index
    };
  }

  // src/mcp/api-search-handler.ts
  var API_SEARCH_MAX_LIMIT = 50;
  var API_DOCUMENT_URI = "/resources/jlceda-pro-api-doc.json";
  var apiCache = null;
  function getEdaFileSystem() {
    const fileSystem = eda.sys_FileSystem;
    if (!isPlainObjectRecord(fileSystem) || typeof fileSystem.getExtensionFile !== "function") {
      throw new Error("\u5F53\u524D\u73AF\u5883\u7F3A\u5C11 eda.sys_FileSystem.getExtensionFile\uFF0C\u65E0\u6CD5\u8BFB\u53D6\u79BB\u7EBF API \u6587\u6863\u3002");
    }
    return fileSystem;
  }
  async function readApiDocumentText() {
    const fileSystem = getEdaFileSystem();
    const extensionFile = await fileSystem.getExtensionFile(API_DOCUMENT_URI);
    if (!extensionFile) {
      throw new Error(`\u672A\u627E\u5230\u79BB\u7EBF API \u6587\u6863\u6587\u4EF6: ${API_DOCUMENT_URI}`);
    }
    return await extensionFile.text();
  }
  function splitTerms(raw) {
    const normalized = raw.trim().toLowerCase();
    if (normalized.length === 0) {
      return [];
    }
    return normalized.split(/[\s,，;；、|/\\:：._\-(){}]+/).map((item) => item.trim()).filter((item) => item.length > 0);
  }
  function buildKeywordIndex(rawIndex) {
    const output = /* @__PURE__ */ new Map();
    if (!rawIndex) {
      return output;
    }
    for (const [keyword, ids] of Object.entries(rawIndex)) {
      if (keyword.trim().length === 0 || !Array.isArray(ids)) {
        continue;
      }
      output.set(keyword.toLowerCase(), ids.filter((id) => Number.isInteger(id)));
    }
    return output;
  }
  function getScopedItems(cache, scope) {
    if (scope === "callable") {
      return cache.callableItems;
    }
    if (scope === "type") {
      return cache.typeItems;
    }
    return cache.allItems;
  }
  function scoreFallback(item, queryLower, terms) {
    const name = String(item.name ?? "").toLowerCase();
    const fullName = String(item.fullName ?? "").toLowerCase();
    const summary = String(item.summary ?? "").toLowerCase();
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
  async function loadApiCache() {
    if (apiCache) {
      return apiCache;
    }
    const text = await readApiDocumentText().catch((error) => {
      throw new Error(`\u79BB\u7EBF API \u6587\u6863\u8BFB\u53D6\u5931\u8D25: ${toSafeErrorMessage(error)}`);
    });
    const parsed = JSON.parse(text);
    if (!isPlainObjectRecord(parsed)) {
      throw new Error("\u79BB\u7EBF API \u6587\u6863\u683C\u5F0F\u975E\u6CD5\uFF1A\u6839\u8282\u70B9\u5FC5\u987B\u662F\u5BF9\u8C61\u3002");
    }
    const document = parsed;
    const callableItems = Array.isArray(document.projections?.callableApis) ? document.projections.callableApis : [];
    const typeItems = Array.isArray(document.projections?.types) ? document.projections.types : [];
    const allItems = [...callableItems, ...typeItems];
    const itemById = /* @__PURE__ */ new Map();
    for (const item of allItems) {
      itemById.set(item.id, item);
    }
    apiCache = {
      allItems,
      callableItems,
      typeItems,
      itemById,
      keywordIndex: buildKeywordIndex(document.queryIndexes?.symbolIdByKeyword)
    };
    return apiCache;
  }
  async function handleApiSearchTask(payload) {
    if (!isPlainObjectRecord(payload)) {
      throw new Error("api/search \u4EFB\u52A1\u53C2\u6570\u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002");
    }
    const query = String(payload.query ?? "").trim();
    if (query.length === 0) {
      throw new Error("api_search \u7F3A\u5C11 query \u53C2\u6570\u3002");
    }
    const scope = String(payload.scope ?? "all").trim().toLowerCase();
    if (!["all", "callable", "type"].includes(scope)) {
      throw new Error("scope \u4EC5\u652F\u6301 all/callable/type\u3002");
    }
    const ownerFilter = String(payload.owner ?? "").trim().toLowerCase();
    const limit = parseBoundedIntegerValue(payload.limit, 10, 1, API_SEARCH_MAX_LIMIT);
    const cache = await loadApiCache();
    const terms = splitTerms(query);
    const queryLower = query.toLowerCase();
    const scopedItems = getScopedItems(cache, scope);
    const allowIdSet = new Set(scopedItems.map((item) => item.id));
    const scoreById = /* @__PURE__ */ new Map();
    for (const term of terms) {
      const ids = cache.keywordIndex.get(term) ?? [];
      for (const id of ids) {
        if (!allowIdSet.has(id)) {
          continue;
        }
        scoreById.set(id, (scoreById.get(id) ?? 0) + 10);
      }
    }
    for (const id of scoreById.keys()) {
      const item = cache.itemById.get(id);
      if (!item) {
        continue;
      }
      const nameWords = String(item.name ?? "").split(/(?=[A-Z])|_/).map((w) => w.toLowerCase()).filter((w) => w.length > 0);
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
    const filteredItems = [...scoreById.entries()].map(([id, score]) => {
      const item = cache.itemById.get(id);
      if (!item) {
        return null;
      }
      if (ownerFilter.length > 0 && !String(item.ownerFullName ?? "").toLowerCase().includes(ownerFilter)) {
        return null;
      }
      return {
        id: item.id,
        name: item.name,
        fullName: item.fullName,
        kind: item.kind,
        ownerFullName: item.ownerFullName,
        summary: item.summary,
        signatureText: item.signatureText ?? "",
        typeText: item.typeText ?? "",
        returnType: item.returnType ?? "",
        parameters: Array.isArray(item.parameters) ? item.parameters : [],
        score
      };
    }).filter((item) => item !== null).sort((left, right) => {
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
      items
    };
  }

  // src/mcp/auto-layout-handler.ts
  function resolveSchDocumentApi() {
    const edaGlobal = globalThis.eda;
    if (!edaGlobal || typeof edaGlobal !== "object") {
      throw new Error("EDA \u73AF\u5883\u672A\u5C31\u7EEA\uFF0C\u65E0\u6CD5\u8BBF\u95EE eda \u5168\u5C40\u5BF9\u8C61\u3002");
    }
    const schDocModule = edaGlobal.sch_Document;
    if (!isPlainObjectRecord(schDocModule) || typeof schDocModule.autoLayout !== "function") {
      throw new Error("\u672A\u627E\u5230 eda.sch_Document.autoLayout API\u3002\u6B64\u529F\u80FD\u9700\u8981 EDA \u652F\u6301 BETA \u529F\u80FD\uFF0C\u8BF7\u786E\u4FDD\u4F7F\u7528\u6700\u65B0\u7248\u672C\u7684\u5609\u7ACB\u521B EDA \u4E13\u4E1A\u7248\u3002");
    }
    return {
      context: schDocModule,
      autoLayout: schDocModule.autoLayout
    };
  }
  function normalizeUuids(raw) {
    if (raw === void 0 || raw === null) {
      return void 0;
    }
    if (!Array.isArray(raw)) {
      throw new TypeError("uuids \u5FC5\u987B\u4E3A\u6570\u7EC4\u3002");
    }
    if (raw.length === 0) {
      return void 0;
    }
    const result = [];
    for (let i = 0; i < raw.length; i += 1) {
      const uuid = String(raw[i] ?? "").trim();
      if (uuid.length === 0) {
        throw new Error(`uuids[${String(i)}] \u4E0D\u80FD\u4E3A\u7A7A\u5B57\u7B26\u4E32\u3002`);
      }
      result.push(uuid);
    }
    return result;
  }
  function normalizeDesignatorDeviceTypeMap(raw) {
    if (raw === void 0 || raw === null) {
      return void 0;
    }
    if (!isPlainObjectRecord(raw)) {
      throw new TypeError("designatorDeviceTypeMap \u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002");
    }
    const validTypes = /* @__PURE__ */ new Set(["resistor", "capacitor", "inductive", "diode", "triode", "oscillator", "chip", "otherDevice"]);
    const result = {};
    for (const key in raw) {
      if (Object.prototype.hasOwnProperty.call(raw, key)) {
        const value = String(raw[key] ?? "").trim();
        if (!validTypes.has(value)) {
          throw new Error(`designatorDeviceTypeMap["${key}"] \u7684\u503C "${value}" \u4E0D\u662F\u6709\u6548\u7684\u5668\u4EF6\u7C7B\u578B\u3002\u6709\u6548\u7C7B\u578B\uFF1Aresistor, capacitor, inductive, diode, triode, oscillator, chip, otherDevice\u3002`);
        }
        result[key] = value;
      }
    }
    return Object.keys(result).length > 0 ? result : void 0;
  }
  async function handleAutoLayoutTask(payload) {
    try {
      const schDocApi = resolveSchDocumentApi();
      let props;
      if (payload !== null && payload !== void 0) {
        if (!isPlainObjectRecord(payload)) {
          throw new TypeError("auto/layout \u4EFB\u52A1\u53C2\u6570\u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002");
        }
        const uuids = normalizeUuids(payload.uuids);
        const designatorDeviceTypeMap = normalizeDesignatorDeviceTypeMap(payload.designatorDeviceTypeMap);
        const netlist = payload.netlist;
        if (uuids || designatorDeviceTypeMap || netlist) {
          props = {
            uuids,
            netlist,
            designatorDeviceTypeMap
          };
        }
      }
      const result = await Promise.resolve(schDocApi.autoLayout.call(schDocApi.context, props));
      return {
        ok: true,
        result,
        message: props?.uuids ? `\u5DF2\u5BF9 ${String(props.uuids.length)} \u4E2A\u6307\u5B9A\u5668\u4EF6\u6267\u884C\u81EA\u52A8\u5E03\u5C40\u3002` : "\u5DF2\u5BF9\u6240\u6709\u5668\u4EF6\u6267\u884C\u81EA\u52A8\u5E03\u5C40\u3002"
      };
    } catch (error) {
      return {
        ok: false,
        error: toSafeErrorMessage(error),
        errorCode: "AUTO_LAYOUT_FAILED"
      };
    }
  }

  // src/mcp/auto-routing-handler.ts
  function resolveSchDocumentApi2() {
    const edaGlobal = globalThis.eda;
    if (!edaGlobal || typeof edaGlobal !== "object") {
      throw new Error("EDA \u73AF\u5883\u672A\u5C31\u7EEA\uFF0C\u65E0\u6CD5\u8BBF\u95EE eda \u5168\u5C40\u5BF9\u8C61\u3002");
    }
    const schDocModule = edaGlobal.sch_Document;
    if (!isPlainObjectRecord(schDocModule) || typeof schDocModule.autoRouting !== "function") {
      throw new Error("\u672A\u627E\u5230 eda.sch_Document.autoRouting API\u3002\u6B64\u529F\u80FD\u9700\u8981 EDA \u652F\u6301 BETA \u529F\u80FD\uFF0C\u8BF7\u786E\u4FDD\u4F7F\u7528\u6700\u65B0\u7248\u672C\u7684\u5609\u7ACB\u521B EDA \u4E13\u4E1A\u7248\u3002");
    }
    return {
      context: schDocModule,
      autoRouting: schDocModule.autoRouting
    };
  }
  function normalizeUuids2(raw) {
    if (raw === void 0 || raw === null) {
      return void 0;
    }
    if (!Array.isArray(raw)) {
      throw new TypeError("uuids \u5FC5\u987B\u4E3A\u6570\u7EC4\u3002");
    }
    if (raw.length === 0) {
      return void 0;
    }
    const result = [];
    for (let i = 0; i < raw.length; i += 1) {
      const uuid = String(raw[i] ?? "").trim();
      if (uuid.length === 0) {
        throw new Error(`uuids[${String(i)}] \u4E0D\u80FD\u4E3A\u7A7A\u5B57\u7B26\u4E32\u3002`);
      }
      result.push(uuid);
    }
    return result;
  }
  function normalizeDesignatorDeviceTypeMap2(raw) {
    if (raw === void 0 || raw === null) {
      return void 0;
    }
    if (!isPlainObjectRecord(raw)) {
      throw new TypeError("designatorDeviceTypeMap \u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002");
    }
    const validTypes = /* @__PURE__ */ new Set(["resistor", "capacitor", "inductive", "diode", "triode", "oscillator", "chip", "otherDevice"]);
    const result = {};
    for (const key in raw) {
      if (Object.prototype.hasOwnProperty.call(raw, key)) {
        const value = String(raw[key] ?? "").trim();
        if (!validTypes.has(value)) {
          throw new Error(`designatorDeviceTypeMap["${key}"] \u7684\u503C "${value}" \u4E0D\u662F\u6709\u6548\u7684\u5668\u4EF6\u7C7B\u578B\u3002\u6709\u6548\u7C7B\u578B\uFF1Aresistor, capacitor, inductive, diode, triode, oscillator, chip, otherDevice\u3002`);
        }
        result[key] = value;
      }
    }
    return Object.keys(result).length > 0 ? result : void 0;
  }
  async function handleAutoRoutingTask(payload) {
    try {
      const schDocApi = resolveSchDocumentApi2();
      let props;
      if (payload !== null && payload !== void 0) {
        if (!isPlainObjectRecord(payload)) {
          throw new TypeError("auto/routing \u4EFB\u52A1\u53C2\u6570\u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002");
        }
        const uuids = normalizeUuids2(payload.uuids);
        const designatorDeviceTypeMap = normalizeDesignatorDeviceTypeMap2(payload.designatorDeviceTypeMap);
        const netlist = payload.netlist;
        if (uuids || designatorDeviceTypeMap || netlist) {
          props = {
            uuids,
            netlist,
            designatorDeviceTypeMap
          };
        }
      }
      const result = await Promise.resolve(schDocApi.autoRouting.call(schDocApi.context, props));
      return {
        ok: true,
        result,
        message: props?.uuids ? `\u5DF2\u5BF9 ${String(props.uuids.length)} \u4E2A\u6307\u5B9A\u7F51\u7EDC\u6267\u884C\u81EA\u52A8\u5E03\u7EBF\u3002` : "\u5DF2\u5BF9\u6240\u6709\u672A\u5E03\u7EBF\u7684\u7F51\u7EDC\u6267\u884C\u81EA\u52A8\u5E03\u7EBF\u3002"
      };
    } catch (error) {
      return {
        ok: false,
        error: toSafeErrorMessage(error),
        errorCode: "AUTO_ROUTING_FAILED"
      };
    }
  }

  // src/mcp/component-place-handler.ts
  var COMPONENT_PLACE_PROTOCOL = "component-place/v1";
  var activePlaceSessions = /* @__PURE__ */ new Map();
  function createPlaceSessionId() {
    return `component_place_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
  function delay(ms) {
    return new Promise((resolve) => {
      globalThis.setTimeout(resolve, ms);
    });
  }
  function normalizeComponentPlaceItem(raw, index) {
    if (!isPlainObjectRecord(raw)) {
      throw new TypeError(`components[${String(index)}] \u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002`);
    }
    const uuid = String(raw.uuid ?? "").trim();
    const libraryUuid = String(raw.libraryUuid ?? "").trim();
    if (uuid.length === 0) {
      throw new Error(`components[${String(index)}].uuid \u4E0D\u80FD\u4E3A\u7A7A\u3002`);
    }
    if (libraryUuid.length === 0) {
      throw new Error(`components[${String(index)}].libraryUuid \u4E0D\u80FD\u4E3A\u7A7A\u3002`);
    }
    return {
      uuid,
      libraryUuid,
      name: String(raw.name ?? "").trim(),
      footprintName: String(raw.footprintName ?? "").trim(),
      subPartName: String(raw.subPartName ?? "").trim()
    };
  }
  function resolveTimeoutSeconds(rawValue) {
    if (rawValue === void 0 || rawValue === null || rawValue === "") {
      return 60;
    }
    const timeoutSeconds = Number(rawValue);
    if (!Number.isFinite(timeoutSeconds)) {
      throw new TypeError("timeoutSeconds \u5FC5\u987B\u4E3A\u6570\u5B57\u3002");
    }
    if (!Number.isInteger(timeoutSeconds)) {
      throw new TypeError("timeoutSeconds \u5FC5\u987B\u4E3A\u6574\u6570\u3002");
    }
    if (timeoutSeconds < 30 || timeoutSeconds > 180) {
      throw new Error("timeoutSeconds \u8D85\u51FA\u5141\u8BB8\u8303\u56F4\uFF0C\u5FC5\u987B\u5728 30 \u5230 180 \u79D2\u4E4B\u95F4\u3002");
    }
    return timeoutSeconds;
  }
  function formatComponentTitle(component) {
    if (component.name.length > 0) {
      return component.name;
    }
    return `${component.libraryUuid}/${component.uuid}`;
  }
  function resolvePlaceComponentApi() {
    const edaGlobal = globalThis.eda;
    if (!edaGlobal || typeof edaGlobal !== "object") {
      throw new Error("EDA \u73AF\u5883\u672A\u5C31\u7EEA\uFF0C\u65E0\u6CD5\u8BBF\u95EE eda \u5168\u5C40\u5BF9\u8C61\u3002");
    }
    const componentModule = edaGlobal.sch_PrimitiveComponent;
    if (!isPlainObjectRecord(componentModule) || typeof componentModule.placeComponentWithMouse !== "function" || typeof componentModule.getAllPrimitiveId !== "function") {
      throw new Error("\u672A\u627E\u5230 eda.sch_PrimitiveComponent.placeComponentWithMouse API\u3002");
    }
    return {
      context: componentModule,
      placeComponentWithMouse: componentModule.placeComponentWithMouse,
      getAllPrimitiveId: componentModule.getAllPrimitiveId
    };
  }
  function resolveFollowMouseTipApi() {
    const edaGlobal = globalThis.eda;
    if (!edaGlobal || typeof edaGlobal !== "object") {
      return null;
    }
    const messageModule = edaGlobal.sys_Message;
    if (!isPlainObjectRecord(messageModule) || typeof messageModule.showFollowMouseTip !== "function" || typeof messageModule.removeFollowMouseTip !== "function") {
      return null;
    }
    return {
      context: messageModule,
      show: messageModule.showFollowMouseTip,
      remove: messageModule.removeFollowMouseTip
    };
  }
  async function cleanupPlaceSession(sessionId) {
    const session = activePlaceSessions.get(sessionId);
    if (!session) {
      return;
    }
    activePlaceSessions.delete(sessionId);
    if (session.cancelHandler) {
      const docRef = globalThis.document;
      if (docRef) {
        docRef.removeEventListener("mousedown", session.cancelHandler, { capture: true });
      }
      session.cancelHandler = null;
    }
    if (session.followMouseTipApi) {
      try {
        await session.followMouseTipApi.remove.call(session.followMouseTipApi.context, session.tipText);
      } catch {
      }
    }
  }
  async function handleComponentPlaceTask(payload) {
    if (!isPlainObjectRecord(payload)) {
      throw new TypeError("component/place \u4EFB\u52A1\u53C2\u6570\u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002");
    }
    const rawComponents = payload.components;
    if (!Array.isArray(rawComponents)) {
      throw new TypeError("\u7F3A\u5C11 components \u53C2\u6570\uFF0C\u4E14\u5176\u5FC5\u987B\u4E3A\u6570\u7EC4\u3002");
    }
    if (rawComponents.length < 1) {
      throw new Error("components \u4E0D\u80FD\u4E3A\u7A7A\uFF0C\u81F3\u5C11\u9700\u8981\u63D0\u4F9B\u4E00\u4E2A\u5F85\u653E\u7F6E\u5668\u4EF6\u3002");
    }
    if (rawComponents.length > 50) {
      throw new Error("components \u6570\u91CF\u8FC7\u591A\uFF0C\u5355\u6B21\u6700\u591A\u5141\u8BB8 50 \u4E2A\u5668\u4EF6\u3002");
    }
    const timeoutSeconds = resolveTimeoutSeconds(payload.timeoutSeconds);
    const components = rawComponents.map((item, index) => normalizeComponentPlaceItem(item, index));
    const placement = {
      protocol: COMPONENT_PLACE_PROTOCOL,
      title: "\u539F\u7406\u56FE\u5668\u4EF6\u653E\u7F6E",
      description: `\u8BF7\u6309\u987A\u5E8F\u5728\u539F\u7406\u56FE\u4E2D\u653E\u7F6E\u4EE5\u4E0B ${String(components.length)} \u4E2A\u5668\u4EF6\u3002\u5355\u4E2A\u5668\u4EF6\u8D85\u65F6\u540E\uFF0C\u5DE5\u5177\u4F1A\u5728\u5F53\u524D\u5C1D\u8BD5\u7ED3\u675F\u540E\u81EA\u52A8\u91CD\u8BD5 1 \u6B21\u3002`,
      components,
      timeoutSeconds,
      retryCount: 1
    };
    return {
      ok: true,
      placement,
      message: `\u5DF2\u521B\u5EFA ${String(components.length)} \u4E2A\u5668\u4EF6\u7684\u4EA4\u4E92\u653E\u7F6E\u4EFB\u52A1\u3002`
    };
  }
  async function handleComponentPlaceStartTask(payload) {
    if (!isPlainObjectRecord(payload)) {
      throw new TypeError("component/place/start \u4EFB\u52A1\u53C2\u6570\u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002");
    }
    const component = normalizeComponentPlaceItem(payload.component, 0);
    const timeoutSeconds = resolveTimeoutSeconds(payload.timeoutSeconds);
    const timeoutMs = timeoutSeconds * 1e3;
    const placeApi = resolvePlaceComponentApi();
    const followMouseTipApi = resolveFollowMouseTipApi();
    const tipText = `\u8BF7\u5728\u539F\u7406\u56FE\u4E2D\u653E\u7F6E\u5668\u4EF6\uFF1A${formatComponentTitle(component)}`;
    if (followMouseTipApi) {
      void Promise.resolve(followMouseTipApi.show.call(followMouseTipApi.context, tipText, timeoutMs)).catch(() => void 0);
    }
    try {
      const started2 = await Promise.resolve(placeApi.placeComponentWithMouse.call(
        placeApi.context,
        { uuid: component.uuid, libraryUuid: component.libraryUuid },
        component.subPartName || void 0
      ));
      if (!started2) {
        if (followMouseTipApi) {
          try {
            await followMouseTipApi.remove.call(followMouseTipApi.context, tipText);
          } catch {
          }
        }
        return {
          ok: false,
          error: "placeComponentWithMouse \u8FD4\u56DE false\uFF0C\u4EA4\u4E92\u653E\u7F6E\u4F1A\u8BDD\u672A\u80FD\u542F\u52A8\u3002"
        };
      }
      await delay(500);
      const referenceIds = /* @__PURE__ */ new Set();
      try {
        const currentIds = await Promise.resolve(placeApi.getAllPrimitiveId.call(placeApi.context));
        for (let index = 0; index < currentIds.length; index += 1) {
          const primitiveId = String(currentIds[index] || "").trim();
          if (primitiveId.length > 0) {
            referenceIds.add(primitiveId);
          }
        }
      } catch (error) {
        console.warn("\u83B7\u53D6\u57FA\u7EBF\u56FE\u5143\u5217\u8868\u5931\u8D25\uFF0C\u5C06\u4F7F\u7528\u7A7A\u57FA\u7EBF\uFF1A", toSafeErrorMessage(error));
      }
      const sessionId = createPlaceSessionId();
      const session = {
        sessionId,
        referenceIds,
        tipText,
        followMouseTipApi,
        placeApi,
        createdAt: Date.now(),
        cancelledByRightClick: false,
        cancelHandler: null
      };
      activePlaceSessions.set(sessionId, session);
      const docRef = globalThis.document;
      if (docRef) {
        session.cancelHandler = (event) => {
          if (event.button !== 2) {
            return;
          }
          const sess = activePlaceSessions.get(sessionId);
          if (sess) {
            sess.cancelledByRightClick = true;
          }
        };
        docRef.addEventListener("mousedown", session.cancelHandler, { capture: true });
      }
      return {
        ok: true,
        sessionId
      };
    } catch (error) {
      if (followMouseTipApi) {
        try {
          await followMouseTipApi.remove.call(followMouseTipApi.context, tipText);
        } catch {
        }
      }
      return {
        ok: false,
        error: toSafeErrorMessage(error)
      };
    }
  }
  async function handleComponentPlaceCheckTask(payload) {
    if (!isPlainObjectRecord(payload)) {
      throw new TypeError("component/place/check \u4EFB\u52A1\u53C2\u6570\u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002");
    }
    const sessionId = String(payload.sessionId ?? "").trim();
    if (sessionId.length === 0) {
      throw new Error("component/place/check \u7F3A\u5C11 sessionId \u53C2\u6570\u3002");
    }
    const session = activePlaceSessions.get(sessionId);
    if (!session) {
      return {
        ok: false,
        error: "\u672A\u627E\u5230\u5BF9\u5E94\u7684\u5668\u4EF6\u653E\u7F6E\u4F1A\u8BDD\u3002"
      };
    }
    try {
      if (session.cancelledByRightClick) {
        await cleanupPlaceSession(sessionId);
        return {
          ok: true,
          placed: false,
          userCancelled: true
        };
      }
      const currentIds = await Promise.resolve(session.placeApi.getAllPrimitiveId.call(session.placeApi.context));
      for (let index = 0; index < currentIds.length; index += 1) {
        const primitiveId = String(currentIds[index] || "").trim();
        if (primitiveId.length > 0 && !session.referenceIds.has(primitiveId)) {
          await cleanupPlaceSession(sessionId);
          return {
            ok: true,
            placed: true,
            userCancelled: false
          };
        }
      }
      if (session.referenceIds.size > 0) {
        const currentIdSet = new Set(currentIds.map((id) => String(id || "").trim()).filter((id) => id.length > 0));
        for (const refId of session.referenceIds) {
          if (!currentIdSet.has(refId)) {
            await cleanupPlaceSession(sessionId);
            return {
              ok: true,
              placed: false,
              userCancelled: true
            };
          }
        }
      }
      return {
        ok: true,
        placed: false,
        userCancelled: false
      };
    } catch (error) {
      return {
        ok: false,
        error: toSafeErrorMessage(error)
      };
    }
  }
  async function handleComponentPlaceCloseTask(payload) {
    if (!isPlainObjectRecord(payload)) {
      throw new TypeError("component/place/close \u4EFB\u52A1\u53C2\u6570\u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002");
    }
    const sessionId = String(payload.sessionId ?? "").trim();
    if (sessionId.length === 0) {
      throw new Error("component/place/close \u7F3A\u5C11 sessionId \u53C2\u6570\u3002");
    }
    await cleanupPlaceSession(sessionId);
    return {
      ok: true
    };
  }

  // src/mcp/component-place-auto-handler.ts
  var DEFAULT_GRID_START_X = 0;
  var DEFAULT_GRID_START_Y = 0;
  var DEFAULT_GRID_SPACING_X = 1500;
  var DEFAULT_GRID_SPACING_Y = 1500;
  var DEFAULT_GRID_COLUMNS = 4;
  var DEFAULT_LINEAR_START_X = 0;
  var DEFAULT_LINEAR_START_Y = 0;
  var DEFAULT_LINEAR_SPACING = 1500;
  var DEFAULT_FIXED_X = 0;
  var DEFAULT_FIXED_Y = 0;
  function normalizeComponentPlaceAutoItem(raw, index) {
    if (!isPlainObjectRecord(raw)) {
      throw new TypeError(`components[${String(index)}] \u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002`);
    }
    const uuid = String(raw.uuid ?? "").trim();
    const libraryUuid = String(raw.libraryUuid ?? "").trim();
    if (uuid.length === 0) {
      throw new Error(`components[${String(index)}].uuid \u4E0D\u80FD\u4E3A\u7A7A\u3002`);
    }
    if (libraryUuid.length === 0) {
      throw new Error(`components[${String(index)}].libraryUuid \u4E0D\u80FD\u4E3A\u7A7A\u3002`);
    }
    const item = {
      uuid,
      libraryUuid,
      name: String(raw.name ?? "").trim(),
      subPartName: String(raw.subPartName ?? "").trim()
    };
    if (raw.x !== void 0 && raw.x !== null) {
      const x = Number(raw.x);
      if (!Number.isFinite(x)) {
        throw new TypeError(`components[${String(index)}].x \u5FC5\u987B\u4E3A\u6570\u5B57\u3002`);
      }
      item.x = x;
    }
    if (raw.y !== void 0 && raw.y !== null) {
      const y = Number(raw.y);
      if (!Number.isFinite(y)) {
        throw new TypeError(`components[${String(index)}].y \u5FC5\u987B\u4E3A\u6570\u5B57\u3002`);
      }
      item.y = y;
    }
    if (raw.rotation !== void 0 && raw.rotation !== null) {
      const rotation = Number(raw.rotation);
      if (!Number.isFinite(rotation)) {
        throw new TypeError(`components[${String(index)}].rotation \u5FC5\u987B\u4E3A\u6570\u5B57\u3002`);
      }
      if (![0, 90, 180, 270].includes(rotation)) {
        throw new Error(`components[${String(index)}].rotation \u53EA\u80FD\u4E3A 0\u300190\u3001180\u3001270\u3002`);
      }
      item.rotation = rotation;
    }
    if (raw.mirror !== void 0 && raw.mirror !== null) {
      item.mirror = Boolean(raw.mirror);
    }
    return item;
  }
  function parseGridLayoutConfig(raw) {
    if (!isPlainObjectRecord(raw)) {
      return {};
    }
    const config = {};
    if (raw.startX !== void 0 && raw.startX !== null) {
      const startX = Number(raw.startX);
      if (Number.isFinite(startX)) {
        config.startX = startX;
      }
    }
    if (raw.startY !== void 0 && raw.startY !== null) {
      const startY = Number(raw.startY);
      if (Number.isFinite(startY)) {
        config.startY = startY;
      }
    }
    if (raw.spacingX !== void 0 && raw.spacingX !== null) {
      const spacingX = Number(raw.spacingX);
      if (Number.isFinite(spacingX)) {
        config.spacingX = spacingX;
      }
    }
    if (raw.spacingY !== void 0 && raw.spacingY !== null) {
      const spacingY = Number(raw.spacingY);
      if (Number.isFinite(spacingY)) {
        config.spacingY = spacingY;
      }
    }
    if (raw.columns !== void 0 && raw.columns !== null) {
      const columns = Number(raw.columns);
      if (Number.isFinite(columns) && Number.isInteger(columns) && columns > 0) {
        config.columns = columns;
      }
    }
    return config;
  }
  function parseLinearLayoutConfig(raw) {
    if (!isPlainObjectRecord(raw)) {
      return {};
    }
    const config = {};
    if (raw.startX !== void 0 && raw.startX !== null) {
      const startX = Number(raw.startX);
      if (Number.isFinite(startX)) {
        config.startX = startX;
      }
    }
    if (raw.startY !== void 0 && raw.startY !== null) {
      const startY = Number(raw.startY);
      if (Number.isFinite(startY)) {
        config.startY = startY;
      }
    }
    if (raw.spacing !== void 0 && raw.spacing !== null) {
      const spacing = Number(raw.spacing);
      if (Number.isFinite(spacing)) {
        config.spacing = spacing;
      }
    }
    return config;
  }
  function parseFixedPositionConfig(raw) {
    if (!isPlainObjectRecord(raw)) {
      return {};
    }
    const config = {};
    if (raw.x !== void 0 && raw.x !== null) {
      const x = Number(raw.x);
      if (Number.isFinite(x)) {
        config.x = x;
      }
    }
    if (raw.y !== void 0 && raw.y !== null) {
      const y = Number(raw.y);
      if (Number.isFinite(y)) {
        config.y = y;
      }
    }
    return config;
  }
  function calculateComponentPosition(index, component, layoutStrategy, gridConfig, linearConfig, fixedConfig) {
    if (component.x !== void 0 && component.y !== void 0) {
      return { x: component.x, y: component.y };
    }
    if (layoutStrategy === "grid") {
      const startX2 = gridConfig.startX ?? DEFAULT_GRID_START_X;
      const startY2 = gridConfig.startY ?? DEFAULT_GRID_START_Y;
      const spacingX2 = gridConfig.spacingX ?? DEFAULT_GRID_SPACING_X;
      const spacingY2 = gridConfig.spacingY ?? DEFAULT_GRID_SPACING_Y;
      const columns2 = gridConfig.columns ?? DEFAULT_GRID_COLUMNS;
      const row2 = Math.floor(index / columns2);
      const col2 = index % columns2;
      return {
        x: startX2 + col2 * spacingX2,
        y: startY2 + row2 * spacingY2
      };
    }
    if (layoutStrategy === "horizontal") {
      const startX2 = linearConfig.startX ?? DEFAULT_LINEAR_START_X;
      const startY2 = linearConfig.startY ?? DEFAULT_LINEAR_START_Y;
      const spacing = linearConfig.spacing ?? DEFAULT_LINEAR_SPACING;
      return {
        x: startX2 + index * spacing,
        y: startY2
      };
    }
    if (layoutStrategy === "vertical") {
      const startX2 = linearConfig.startX ?? DEFAULT_LINEAR_START_X;
      const startY2 = linearConfig.startY ?? DEFAULT_LINEAR_START_Y;
      const spacing = linearConfig.spacing ?? DEFAULT_LINEAR_SPACING;
      return {
        x: startX2,
        y: startY2 + index * spacing
      };
    }
    if (layoutStrategy === "fixed") {
      const x = fixedConfig.x ?? DEFAULT_FIXED_X;
      const y = fixedConfig.y ?? DEFAULT_FIXED_Y;
      return { x, y };
    }
    const startX = DEFAULT_GRID_START_X;
    const startY = DEFAULT_GRID_START_Y;
    const spacingX = DEFAULT_GRID_SPACING_X;
    const spacingY = DEFAULT_GRID_SPACING_Y;
    const columns = DEFAULT_GRID_COLUMNS;
    const row = Math.floor(index / columns);
    const col = index % columns;
    return {
      x: startX + col * spacingX,
      y: startY + row * spacingY
    };
  }
  function resolveComponentCreateApi() {
    if (typeof eda === "undefined" || !eda || typeof eda !== "object") {
      throw new Error("EDA \u73AF\u5883\u672A\u5C31\u7EEA\uFF0C\u65E0\u6CD5\u8BBF\u95EE eda \u5168\u5C40\u5BF9\u8C61\u3002");
    }
    const componentModule = eda.sch_PrimitiveComponent;
    if (!componentModule || typeof componentModule.create !== "function") {
      throw new Error("\u672A\u627E\u5230 eda.sch_PrimitiveComponent.create API\u3002");
    }
    return {
      context: componentModule,
      create: componentModule.create
    };
  }
  async function handleComponentPlaceAutoTask(payload) {
    if (!isPlainObjectRecord(payload)) {
      throw new TypeError("component/place-auto \u4EFB\u52A1\u53C2\u6570\u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002");
    }
    const rawComponents = payload.components;
    if (!Array.isArray(rawComponents)) {
      throw new TypeError("\u7F3A\u5C11 components \u53C2\u6570\uFF0C\u4E14\u5176\u5FC5\u987B\u4E3A\u6570\u7EC4\u3002");
    }
    if (rawComponents.length < 1) {
      throw new Error("components \u4E0D\u80FD\u4E3A\u7A7A\uFF0C\u81F3\u5C11\u9700\u8981\u63D0\u4F9B\u4E00\u4E2A\u5F85\u653E\u7F6E\u5668\u4EF6\u3002");
    }
    if (rawComponents.length > 100) {
      throw new Error("components \u6570\u91CF\u8FC7\u591A\uFF0C\u5355\u6B21\u6700\u591A\u5141\u8BB8 100 \u4E2A\u5668\u4EF6\u3002");
    }
    const layoutStrategy = String(payload.layoutStrategy ?? "grid").trim().toLowerCase();
    if (!["grid", "horizontal", "vertical", "fixed"].includes(layoutStrategy)) {
      throw new Error("layoutStrategy \u53EA\u80FD\u4E3A grid\u3001horizontal\u3001vertical\u3001fixed\u3002");
    }
    const gridConfig = parseGridLayoutConfig(payload.gridLayout);
    const linearConfig = parseLinearLayoutConfig(payload.linearLayout);
    const fixedConfig = parseFixedPositionConfig(payload.fixedPosition);
    const components = rawComponents.map(
      (item, index) => normalizeComponentPlaceAutoItem(item, index)
    );
    const api = resolveComponentCreateApi();
    const placedComponents = [];
    const failedComponents = [];
    for (let index = 0; index < components.length; index += 1) {
      const component = components[index];
      const position = calculateComponentPosition(
        index,
        component,
        layoutStrategy,
        gridConfig,
        linearConfig,
        fixedConfig
      );
      try {
        await Promise.resolve(
          api.create.call(
            api.context,
            { uuid: component.uuid, libraryUuid: component.libraryUuid },
            position.x,
            position.y,
            component.subPartName || void 0,
            component.rotation ?? 0,
            component.mirror ?? false,
            true,
            true
          )
        );
        placedComponents.push({
          uuid: component.uuid,
          libraryUuid: component.libraryUuid,
          x: position.x,
          y: position.y
        });
      } catch (error) {
        failedComponents.push({
          uuid: component.uuid,
          libraryUuid: component.libraryUuid,
          error: toSafeErrorMessage(error)
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
        message: `\u653E\u7F6E\u4E86 ${String(placedComponents.length)} \u4E2A\u5668\u4EF6\uFF0C${String(failedComponents.length)} \u4E2A\u5931\u8D25\u3002`
      };
    }
    return {
      ok: true,
      placedCount: placedComponents.length,
      totalCount: components.length,
      placedComponents,
      message: `\u6210\u529F\u653E\u7F6E\u4E86\u5168\u90E8 ${String(components.length)} \u4E2A\u5668\u4EF6\u3002`
    };
  }

  // src/mcp/component-select-handler.ts
  var COMPONENT_SELECT_PROTOCOL = "component-select/v1";
  var COMPONENT_SELECT_DEFAULT_LIMIT = 20;
  var AMBIGUOUS_VALUE_TOKEN_PATTERN = /^\d+(?:\.\d+)?[kmgunp]$/i;
  var VALUE_UNIT_REQUIRED_COMPONENT_KEYWORDS = [
    "\u7535\u963B",
    "resistor",
    "\u7535\u5BB9",
    "capacitor",
    "cap",
    "\u7535\u611F",
    "inductor"
  ];
  function keywordRequiresValueUnit(keyword) {
    const normalizedKeyword = keyword.toLowerCase();
    return VALUE_UNIT_REQUIRED_COMPONENT_KEYWORDS.some((componentKeyword) => normalizedKeyword.includes(componentKeyword));
  }
  function findKeywordTokenMissingUnit(keyword) {
    if (!keywordRequiresValueUnit(keyword)) {
      return null;
    }
    const keywordTokens = keyword.split(/\s+/).map((token) => token.trim()).filter(Boolean);
    for (const keywordToken of keywordTokens) {
      const normalizedToken = keywordToken.replace(/^[,，;；]+|[,，;；]+$/g, "");
      if (!normalizedToken || !/\d/.test(normalizedToken)) {
        continue;
      }
      if (AMBIGUOUS_VALUE_TOKEN_PATTERN.test(normalizedToken)) {
        return normalizedToken;
      }
    }
    return null;
  }
  function mapDeviceSearchItem(raw) {
    const item = raw && typeof raw === "object" ? raw : {};
    return {
      uuid: String(item.uuid ?? "").trim(),
      libraryUuid: String(item.libraryUuid ?? item.libraryuuid ?? "").trim(),
      name: String(item.name ?? "").trim(),
      symbolName: String(item.symbolName ?? item.symbolname ?? "").trim(),
      footprintName: String(item.footprintName ?? item.footprintname ?? "").trim(),
      description: String(item.description ?? "").trim(),
      manufacturer: String(item.manufacturer ?? "").trim(),
      manufacturerId: String(item.manufacturerId ?? item.manufacturerid ?? "").trim(),
      supplier: String(item.supplier ?? "").trim(),
      supplierId: String(item.supplierId ?? item.supplierid ?? "").trim(),
      lcscInventory: Number(item.lcscInventory ?? item.lcscinventory ?? 0),
      lcscPrice: Number(item.lcscPrice ?? item.lcscprice ?? 0)
    };
  }
  function getLibDeviceApi() {
    const libDevice = eda.lib_Device;
    if (!isPlainObjectRecord(libDevice) || typeof libDevice.search !== "function") {
      throw new Error("\u672A\u627E\u5230 eda.lib_Device.search API\uFF0C\u8BF7\u786E\u8BA4\u5F53\u524D EDA \u7248\u672C\u652F\u6301\u5668\u4EF6\u5E93\u641C\u7D22\u3002");
    }
    return libDevice;
  }
  async function handleComponentSelectTask(payload) {
    debugLog("[DEBUG] component-select handler called, payload:", JSON.stringify(payload));
    if (!isPlainObjectRecord(payload)) {
      throw new TypeError("component/select \u4EFB\u52A1\u53C2\u6570\u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002");
    }
    const keyword = String(payload.keyword ?? "").trim();
    debugLog("[DEBUG] component-select keyword:", keyword);
    if (keyword.length === 0) {
      throw new Error("component_select \u7F3A\u5C11 keyword \u53C2\u6570\u3002");
    }
    const keywordTokenMissingUnit = findKeywordTokenMissingUnit(keyword);
    if (keywordTokenMissingUnit) {
      throw new Error(`\u7535\u963B\u3001\u7535\u5BB9\u3001\u7535\u611F\u8FD9\u7C7B\u5668\u4EF6\u7684\u963B\u503C/\u5BB9\u503C/\u611F\u503C\u5FC5\u987B\u5E26\u5355\u4F4D\u7B26\u53F7\uFF0C\u68C0\u6D4B\u5230\u201C${keywordTokenMissingUnit}\u201D\u7F3A\u5C11\u5355\u4F4D\u3002\u8BF7\u6539\u4E3A\u5E26\u5355\u4F4D\u7684\u5199\u6CD5\u540E\u91CD\u8BD5\uFF0C\u4F8B\u5982\u7535\u963B\u4F7F\u7528 1k\u03A9\uFF0C\u7535\u5BB9\u4F7F\u7528 100nF\uFF0C\u7535\u611F\u4F7F\u7528 10uH\u3002`);
    }
    const limit = parseBoundedIntegerValue(payload.limit, COMPONENT_SELECT_DEFAULT_LIMIT, 2, 20);
    const page = parseBoundedIntegerValue(payload.page, 1, 1, 9999);
    debugLog("[DEBUG] component-select calling getLibDeviceApi");
    const libDevice = getLibDeviceApi();
    debugLog("[DEBUG] component-select got libDevice, calling search");
    let rawResults;
    try {
      rawResults = await libDevice.search(keyword, void 0, void 0, void 0, limit, page);
      debugLog("[DEBUG] component-select search returned:", Array.isArray(rawResults) ? rawResults.length : "not-array", "items");
    } catch (error) {
      debugLog("[DEBUG] component-select search failed:", error);
      throw new Error(`\u5668\u4EF6\u641C\u7D22\u5931\u8D25\uFF1A${toSafeErrorMessage(error)}`);
    }
    if (!Array.isArray(rawResults) || rawResults.length === 0) {
      return {
        ok: false,
        error: `\u672A\u5728\u7ACB\u521B\u5546\u57CE\u4E2D\u627E\u5230\u5339\u914D\u201C${keyword}\u201D\u7684\u5668\u4EF6\uFF0C\u8BF7\u8C03\u6574\u5173\u952E\u8BCD\u540E\u91CD\u8BD5\u3002`
      };
    }
    const candidates = rawResults.map(mapDeviceSearchItem).filter((item) => item.uuid.length > 0 && item.libraryUuid.length > 0);
    if (candidates.length === 0) {
      return {
        ok: false,
        error: "\u641C\u7D22\u7ED3\u679C\u7F3A\u5C11\u5FC5\u8981\u7684 uuid \u6216 libraryUuid \u5B57\u6BB5\uFF0C\u65E0\u6CD5\u7EE7\u7EED\u9009\u578B\u3002"
      };
    }
    const selection = {
      protocol: COMPONENT_SELECT_PROTOCOL,
      title: `\u5668\u4EF6\u9009\u578B\uFF1A${keyword}`,
      description: `\u4EE5\u4E0B\u662F\u7CFB\u7EDF\u5E93\u4E2D\u201C${keyword}\u201D\u7684\u641C\u7D22\u7ED3\u679C\uFF0C\u8BF7\u5148\u786E\u8BA4\u5177\u4F53\u578B\u53F7\u540E\u518D\u7EE7\u7EED\u653E\u7F6E\u3002`,
      candidates,
      pageSize: limit,
      currentPage: page
    };
    return {
      ok: true,
      selection
    };
  }

  // src/mcp/context-handler.ts
  async function buildContextSnapshot(scope) {
    const currentDocumentInfo = await safeCall(() => eda.dmt_SelectControl.getCurrentDocumentInfo());
    const currentProjectInfo = await safeCall(() => eda.dmt_Project.getCurrentProjectInfo());
    const currentBoardInfo = await safeCall(() => eda.dmt_Board.getCurrentBoardInfo());
    const currentSchematicInfo = await safeCall(() => eda.dmt_Schematic.getCurrentSchematicInfo());
    const currentSchematicPageInfo = await safeCall(() => eda.dmt_Schematic.getCurrentSchematicPageInfo());
    const currentPcbInfo = await safeCall(() => eda.dmt_Pcb.getCurrentPcbInfo());
    const currentPanelInfo = await safeCall(() => eda.dmt_Panel.getCurrentPanelInfo());
    const selectedPcbPrimitiveIds = await safeCall(() => eda.pcb_SelectControl.getAllSelectedPrimitives_PrimitiveId()) ?? [];
    const selectedSchPrimitiveIds = await safeCall(() => eda.sch_SelectControl.getAllSelectedPrimitives_PrimitiveId()) ?? [];
    return {
      scope,
      capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
      currentDocumentInfo: toSerializable(currentDocumentInfo),
      currentProjectInfo: toSerializable(currentProjectInfo),
      currentBoardInfo: toSerializable(currentBoardInfo),
      currentSchematicInfo: toSerializable(currentSchematicInfo),
      currentSchematicPageInfo: toSerializable(currentSchematicPageInfo),
      currentPcbInfo: toSerializable(currentPcbInfo),
      currentPanelInfo: toSerializable(currentPanelInfo),
      selectedPcbPrimitiveIds: toSerializable(selectedPcbPrimitiveIds),
      selectedSchPrimitiveIds: toSerializable(selectedSchPrimitiveIds)
    };
  }
  async function handleEdaContextTask(payload) {
    const scope = isPlainObjectRecord(payload) ? String(payload.scope ?? "").trim() : "";
    return await buildContextSnapshot(scope);
  }

  // src/mcp/invoke-handler.ts
  function resolveSegmentKey(target, segment) {
    if (segment in target) {
      return segment;
    }
    const normalizedSegment = segment.toLowerCase();
    for (const key of Object.keys(target)) {
      if (key.toLowerCase() !== normalizedSegment) {
        continue;
      }
      return key;
    }
    throw new Error(`\u8C03\u7528\u8DEF\u5F84\u4E0D\u5B58\u5728: ${segment}`);
  }
  var FORBIDDEN_SEGMENT_NAMES = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
  function resolveApiCallable(apiFullName) {
    const normalized = apiFullName.trim();
    if (normalized.length === 0) {
      throw new Error("\u7F3A\u5C11 apiFullName\u3002");
    }
    const segments = normalized.split(".");
    if (segments.length < 3 || segments.some((item) => item.length === 0)) {
      throw new Error(`apiFullName \u683C\u5F0F\u975E\u6CD5: "${apiFullName}"\u3002\u6B63\u786E\u683C\u5F0F\u4E3A eda.\u6A21\u5757\u540D.\u65B9\u6CD5\u540D\uFF08\u4EE5\u201C.\u201D\u5206\u9694\u7684\u81F3\u5C11\u4E09\u6BB5\u8DEF\u5F84\uFF09\u3002`);
    }
    if (segments.some((s) => FORBIDDEN_SEGMENT_NAMES.has(s))) {
      throw new Error(`apiFullName \u5305\u542B\u975E\u6CD5\u5C5E\u6027\u540D\u3002`);
    }
    let current = eda;
    for (let index = 1; index < segments.length - 1; index += 1) {
      if (!isPlainObjectRecord(current)) {
        throw new Error(`\u8C03\u7528\u8DEF\u5F84\u65E0\u6548: ${normalized}`);
      }
      const segment = segments[index];
      const segmentKey = resolveSegmentKey(current, segment);
      current = current[segmentKey];
    }
    if (!isPlainObjectRecord(current)) {
      throw new Error(`\u8C03\u7528\u76EE\u6807\u65E0\u6548: ${apiFullName}`);
    }
    const methodKey = resolveSegmentKey(current, segments[segments.length - 1]);
    const callable = current[methodKey];
    if (typeof callable !== "function") {
      throw new TypeError(`\u76EE\u6807\u4E0D\u53EF\u8C03\u7528: ${apiFullName}`);
    }
    return {
      callable,
      thisArg: current,
      resolvedPath: normalized
    };
  }
  async function handleApiInvokeTask(payload) {
    if (!isPlainObjectRecord(payload)) {
      throw new Error("invoke \u4EFB\u52A1\u53C2\u6570\u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002");
    }
    const apiFullName = String(payload.apiFullName ?? "").trim();
    const { callable, thisArg, resolvedPath } = resolveApiCallable(apiFullName);
    const invokeArgs = Array.isArray(payload.args) ? payload.args : [];
    const invokeResult = await Promise.resolve(callable.apply(thisArg, invokeArgs));
    return {
      apiFullName: resolvedPath,
      result: await toSerializableAsync(invokeResult)
    };
  }

  // src/mcp/schematic-read-handler.ts
  function getSyncState(obj, method, fallback) {
    try {
      const fn = obj?.[method];
      if (typeof fn === "function") {
        const result = fn.call(obj);
        return result != null ? result : fallback;
      }
    } catch {
    }
    return fallback;
  }
  function buildPinCoordinateKey(x, y) {
    return `${Math.round(x)}_${Math.round(y)}`;
  }
  function addWireEdgesToAdjacencyGraph(lineData, graph) {
    if (!Array.isArray(lineData) || lineData.length === 0) {
      return;
    }
    function addEdge(keyA, keyB) {
      if (keyA === keyB) {
        return;
      }
      let setA = graph.get(keyA);
      if (!setA) {
        setA = /* @__PURE__ */ new Set();
        graph.set(keyA, setA);
      }
      setA.add(keyB);
      let setB = graph.get(keyB);
      if (!setB) {
        setB = /* @__PURE__ */ new Set();
        graph.set(keyB, setB);
      }
      setB.add(keyA);
    }
    if (Array.isArray(lineData[0])) {
      for (let i = 0; i + 1 < lineData.length; i++) {
        const a = lineData[i];
        const b = lineData[i + 1];
        if (Array.isArray(a) && a.length >= 2 && Array.isArray(b) && b.length >= 2) {
          addEdge(buildPinCoordinateKey(a[0], a[1]), buildPinCoordinateKey(b[0], b[1]));
        }
      }
    } else {
      for (let i = 0; i + 3 < lineData.length; i += 2) {
        addEdge(
          buildPinCoordinateKey(lineData[i], lineData[i + 1]),
          buildPinCoordinateKey(lineData[i + 2], lineData[i + 3])
        );
      }
    }
  }
  function propagateNetworkNamesViaBFS(coordinateToNetworkNameMap, wireAdjacencyGraph) {
    const queue = Array.from(coordinateToNetworkNameMap.keys());
    const visited = new Set(queue);
    let head = 0;
    while (head < queue.length) {
      const currKey = queue[head++];
      const networkName = coordinateToNetworkNameMap.get(currKey);
      const neighbors = wireAdjacencyGraph.get(currKey);
      if (!neighbors) {
        continue;
      }
      for (const neighborKey of neighbors) {
        if (visited.has(neighborKey)) {
          continue;
        }
        visited.add(neighborKey);
        coordinateToNetworkNameMap.set(neighborKey, networkName);
        queue.push(neighborKey);
      }
    }
  }
  async function readSchematicCircuit() {
    const componentListRaw = await safeCall(() => Promise.resolve(eda.sch_PrimitiveComponent.getAll(void 0, true)));
    if (!Array.isArray(componentListRaw)) {
      return { ok: false, error: "\u5668\u4EF6\u5217\u8868\u83B7\u53D6\u5931\u8D25\uFF0Csch_PrimitiveComponent.getAll \u672A\u8FD4\u56DE\u6570\u7EC4\u3002" };
    }
    const coordinateToNetworkNameMap = /* @__PURE__ */ new Map();
    const wireAdjacencyGraph = /* @__PURE__ */ new Map();
    const wireListRaw = await safeCall(() => Promise.resolve(eda.sch_PrimitiveWire.getAll()));
    if (Array.isArray(wireListRaw)) {
      for (const rawWire of wireListRaw) {
        const lineData = getSyncState(rawWire, "getState_Line", null);
        addWireEdgesToAdjacencyGraph(lineData, wireAdjacencyGraph);
        const wireName = getSyncState(rawWire, "getState_Net", "");
        if (wireName.length > 0 && Array.isArray(lineData)) {
          const flat = Array.isArray(lineData[0]) ? lineData.flatMap((p) => p) : lineData;
          for (let i = 0; i + 1 < flat.length; i += 2) {
            const key = buildPinCoordinateKey(flat[i], flat[i + 1]);
            if (!coordinateToNetworkNameMap.has(key)) {
              coordinateToNetworkNameMap.set(key, wireName);
            }
          }
        }
      }
    }
    for (const rawComponent of componentListRaw) {
      const netFlagNetworkName = getSyncState(rawComponent, "getState_Net", "");
      if (netFlagNetworkName.length > 0) {
        const x = getSyncState(rawComponent, "getState_X", 0);
        const y = getSyncState(rawComponent, "getState_Y", 0);
        coordinateToNetworkNameMap.set(buildPinCoordinateKey(x, y), netFlagNetworkName);
      }
    }
    propagateNetworkNamesViaBFS(coordinateToNetworkNameMap, wireAdjacencyGraph);
    const networkToPinRefSetMap = /* @__PURE__ */ new Map();
    const components = [];
    for (const rawComponent of componentListRaw) {
      const componentDesignator = getSyncState(rawComponent, "getState_Designator", "");
      const netFlagNetworkName = getSyncState(rawComponent, "getState_Net", "");
      if (componentDesignator.length === 0 && netFlagNetworkName.length === 0) {
        continue;
      }
      if (netFlagNetworkName.length > 0) {
        const primitiveId2 = getSyncState(rawComponent, "getState_PrimitiveId", "");
        const pinRef = `${netFlagNetworkName}.1`;
        let networkPinSet = networkToPinRefSetMap.get(netFlagNetworkName);
        if (!networkPinSet) {
          networkPinSet = /* @__PURE__ */ new Set();
          networkToPinRefSetMap.set(netFlagNetworkName, networkPinSet);
        }
        networkPinSet.add(pinRef);
        components.push({
          componentInstanceId: primitiveId2,
          componentDesignator: netFlagNetworkName,
          componentSymbolName: netFlagNetworkName,
          schematicSubPartName: "",
          pins: [{
            pinNumber: "1",
            pinSignalName: netFlagNetworkName,
            pinElectricalType: "power",
            connectedNetworkName: netFlagNetworkName,
            hasNoConnectMark: false
          }]
        });
        continue;
      }
      const primitiveId = getSyncState(rawComponent, "getState_PrimitiveId", "");
      const pinsRaw = await safeCall(() => Promise.resolve(eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(primitiveId)));
      if (pinsRaw !== void 0 && !Array.isArray(pinsRaw)) {
        return { ok: false, error: `\u5668\u4EF6 ${componentDesignator} \u7684\u5F15\u811A\u5217\u8868\u683C\u5F0F\u5F02\u5E38\u3002` };
      }
      const pins = [];
      for (const rawPin of Array.isArray(pinsRaw) ? pinsRaw : []) {
        const pinNumber = getSyncState(rawPin, "getState_PinNumber", "");
        const pinSignalName = getSyncState(rawPin, "getState_PinName", "");
        const pinElectricalType = getSyncState(rawPin, "getState_PinType", "");
        const pinConnectionX = getSyncState(rawPin, "getState_X", 0);
        const pinConnectionY = getSyncState(rawPin, "getState_Y", 0);
        const hasNoConnectMark = getSyncState(rawPin, "getState_NoConnected", false);
        const coordinateKey = buildPinCoordinateKey(pinConnectionX, pinConnectionY);
        const connectedNetworkName = coordinateToNetworkNameMap.get(coordinateKey) ?? "";
        if (connectedNetworkName.length > 0) {
          const pinRef = `${componentDesignator}.${pinNumber || pinSignalName}`;
          let networkPinSet = networkToPinRefSetMap.get(connectedNetworkName);
          if (!networkPinSet) {
            networkPinSet = /* @__PURE__ */ new Set();
            networkToPinRefSetMap.set(connectedNetworkName, networkPinSet);
          }
          networkPinSet.add(pinRef);
        }
        pins.push({ pinNumber, pinSignalName, pinElectricalType, connectedNetworkName, hasNoConnectMark });
      }
      components.push({
        componentInstanceId: primitiveId,
        componentDesignator,
        componentSymbolName: getSyncState(rawComponent, "getState_Name", ""),
        schematicSubPartName: getSyncState(rawComponent, "getState_SubPartName", ""),
        pins
      });
    }
    const networks = [];
    for (const [networkName, pinRefSet] of networkToPinRefSetMap) {
      networks.push({
        networkName,
        connectedPinRefs: Array.from(pinRefSet).sort()
      });
    }
    networks.sort((a, b) => a.networkName.localeCompare(b.networkName));
    const drcRawResult = await safeCall(() => Promise.resolve(eda.sch_Drc.check(false, false, true)));
    const drcCheckPassed = drcRawResult === true;
    return {
      ok: true,
      data: JSON.stringify({
        drcCheckPassed,
        componentCount: components.length,
        networkCount: networks.length,
        components,
        networks
      })
    };
  }
  async function handleSchematicReadTask(_payload) {
    const result = await readSchematicCircuit();
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return {
      ok: true,
      schematicCircuitSnapshot: result.data
    };
  }

  // src/mcp/schematic-review-handler.ts
  async function handleSchematicReviewTask(_payload) {
    const drcRawResult = await safeCall(() => Promise.resolve(eda.sch_Drc.check(false, false, true)));
    const drcCheckPassed = drcRawResult === true;
    const netlistFile = await safeCall(() => Promise.resolve(eda.sch_ManufactureData.getNetlistFile()));
    if (!netlistFile) {
      return {
        ok: false,
        error: "\u7F51\u8868\u6587\u4EF6\u83B7\u53D6\u5931\u8D25\uFF0Csch_ManufactureData.getNetlistFile \u8FD4\u56DE\u7A7A\u3002"
      };
    }
    const netlistFileObj = netlistFile;
    if (typeof netlistFileObj.text !== "function") {
      return { ok: false, error: "\u7F51\u8868\u6587\u4EF6\u5BF9\u8C61\u683C\u5F0F\u5F02\u5E38\uFF0C\u65E0\u6CD5\u8BFB\u53D6\u6587\u672C\u5185\u5BB9\u3002" };
    }
    const netlistText = await netlistFileObj.text();
    if (!netlistText || netlistText.trim().length === 0) {
      return { ok: false, error: "\u7F51\u8868\u6587\u4EF6\u5185\u5BB9\u4E3A\u7A7A\uFF0C\u8BF7\u786E\u8BA4\u539F\u7406\u56FE\u4E0D\u4E3A\u7A7A\u3002" };
    }
    return {
      ok: true,
      drcCheckPassed,
      netlistText
    };
  }

  // src/mcp/netlabel-place-handler.ts
  function normalizePlacement(raw, index) {
    if (!isPlainObjectRecord(raw)) {
      throw new TypeError(`placements[${String(index)}] \u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002`);
    }
    const componentId = String(raw.componentId ?? "").trim();
    const pinIdentifier = String(raw.pinIdentifier ?? "").trim();
    const netName = String(raw.netName ?? "").trim();
    if (componentId.length === 0) {
      throw new Error(`placements[${String(index)}].componentId \u4E0D\u80FD\u4E3A\u7A7A\u3002`);
    }
    if (pinIdentifier.length === 0) {
      throw new Error(`placements[${String(index)}].pinIdentifier \u4E0D\u80FD\u4E3A\u7A7A\u3002`);
    }
    if (netName.length === 0) {
      throw new Error(`placements[${String(index)}].netName \u4E0D\u80FD\u4E3A\u7A7A\u3002`);
    }
    return { componentId, pinIdentifier, netName };
  }
  function resolveComponentApi() {
    const edaGlobal = globalThis.eda;
    if (!edaGlobal || typeof edaGlobal !== "object") {
      throw new Error("EDA \u73AF\u5883\u672A\u5C31\u7EEA\uFF0C\u65E0\u6CD5\u8BBF\u95EE eda \u5168\u5C40\u5BF9\u8C61\u3002");
    }
    const componentModule = edaGlobal.sch_PrimitiveComponent;
    if (!isPlainObjectRecord(componentModule) || typeof componentModule.getAllPinsByPrimitiveId !== "function") {
      throw new Error("\u672A\u627E\u5230 eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId API\u3002");
    }
    return {
      context: componentModule,
      getAllPinsByPrimitiveId: componentModule.getAllPinsByPrimitiveId
    };
  }
  function resolveAttributeApi() {
    const edaGlobal = globalThis.eda;
    if (!edaGlobal || typeof edaGlobal !== "object") {
      throw new Error("EDA \u73AF\u5883\u672A\u5C31\u7EEA\uFF0C\u65E0\u6CD5\u8BBF\u95EE eda \u5168\u5C40\u5BF9\u8C61\u3002");
    }
    const attributeModule = edaGlobal.sch_PrimitiveAttribute;
    if (!isPlainObjectRecord(attributeModule) || typeof attributeModule.createNetLabel !== "function") {
      throw new Error("\u672A\u627E\u5230 eda.sch_PrimitiveAttribute.createNetLabel API\u3002");
    }
    return {
      context: attributeModule,
      createNetLabel: attributeModule.createNetLabel
    };
  }
  function resolveNetFlagApi() {
    const edaGlobal = globalThis.eda;
    if (!edaGlobal || typeof edaGlobal !== "object") {
      throw new Error("EDA \u73AF\u5883\u672A\u5C31\u7EEA\uFF0C\u65E0\u6CD5\u8BBF\u95EE eda \u5168\u5C40\u5BF9\u8C61\u3002");
    }
    const componentModule = edaGlobal.sch_PrimitiveComponent;
    if (!isPlainObjectRecord(componentModule) || typeof componentModule.createNetFlag !== "function") {
      throw new Error("\u672A\u627E\u5230 eda.sch_PrimitiveComponent.createNetFlag API\u3002");
    }
    return {
      context: componentModule,
      createNetFlag: componentModule.createNetFlag
    };
  }
  function findPin(pins, identifier) {
    for (let i = 0; i < pins.length; i += 1) {
      const pin = pins[i];
      if (!isPlainObjectRecord(pin)) {
        continue;
      }
      const pinNumber = String(pin.pinNumber ?? "").trim();
      const pinName = String(pin.pinName ?? "").trim();
      const net = String(pin.net ?? "").trim();
      if (pinNumber === identifier || pinName === identifier || net.length > 0 && net === identifier) {
        return {
          x: Number(pin.x ?? 0),
          y: Number(pin.y ?? 0),
          rotation: Number(pin.rotation ?? 0),
          pinNumber,
          pinName,
          net: net.length > 0 ? net : void 0
        };
      }
    }
    return null;
  }
  function calculateLabelOffset(rotation) {
    const baseOffset = 15;
    const normalizedRotation = (rotation % 360 + 360) % 360;
    if (normalizedRotation >= 315 || normalizedRotation < 45) {
      return { x: baseOffset, y: 0 };
    }
    if (normalizedRotation >= 45 && normalizedRotation < 135) {
      return { x: 0, y: -baseOffset };
    }
    if (normalizedRotation >= 135 && normalizedRotation < 225) {
      return { x: -baseOffset, y: 0 };
    }
    return { x: 0, y: baseOffset };
  }
  function detectNetFlagType(netName) {
    const name = netName.toUpperCase();
    if (/^(VCC|VDD|V\+|\+\d+V|\+\d+\.\d+V|VBUS|VIN|VPWR|VBAT|VSYS)/.test(name) || name === "VCC" || name === "VDD") {
      return "Power";
    }
    if (/^(PE|PGND|PROTECTIVE|EARTH)/.test(name)) {
      return "ProtectGround";
    }
    if (/^(AGND|ANALOG|GND_A)/.test(name)) {
      return "AnalogGround";
    }
    if (/^(GND|VSS|V-|DGND|GROUND|GND_D)/.test(name) || name === "GND" || name === "VSS") {
      return "Ground";
    }
    return null;
  }
  async function handleNetLabelPlaceTask(payload) {
    if (!isPlainObjectRecord(payload)) {
      throw new TypeError("netlabel/place \u4EFB\u52A1\u53C2\u6570\u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002");
    }
    const rawPlacements = payload.placements;
    if (!Array.isArray(rawPlacements)) {
      throw new TypeError("\u7F3A\u5C11 placements \u53C2\u6570\uFF0C\u4E14\u5176\u5FC5\u987B\u4E3A\u6570\u7EC4\u3002");
    }
    if (rawPlacements.length < 1) {
      throw new Error("placements \u4E0D\u80FD\u4E3A\u7A7A\uFF0C\u81F3\u5C11\u9700\u8981\u63D0\u4F9B\u4E00\u4E2A\u5F85\u653E\u7F6E\u7684\u7F51\u7EDC\u6807\u7B7E\u3002");
    }
    if (rawPlacements.length > 100) {
      throw new Error("placements \u6570\u91CF\u8FC7\u591A\uFF0C\u5355\u6B21\u6700\u591A\u5141\u8BB8 100 \u4E2A\u7F51\u7EDC\u6807\u7B7E\u3002");
    }
    const placements = rawPlacements.map(
      (item, index) => normalizePlacement(item, index)
    );
    const componentApi = resolveComponentApi();
    const attributeApi = resolveAttributeApi();
    const netFlagApi = resolveNetFlagApi();
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    for (let i = 0; i < placements.length; i += 1) {
      const placement = placements[i];
      try {
        const pins = await Promise.resolve(
          componentApi.getAllPinsByPrimitiveId.call(componentApi.context, placement.componentId)
        );
        if (!Array.isArray(pins) || pins.length === 0) {
          results.push({
            index: i,
            componentId: placement.componentId,
            pinIdentifier: placement.pinIdentifier,
            netName: placement.netName,
            success: false,
            error: "\u672A\u627E\u5230\u5668\u4EF6\u5F15\u811A\uFF0C\u8BF7\u68C0\u67E5 componentId \u662F\u5426\u6B63\u786E\u3002"
          });
          failureCount += 1;
          continue;
        }
        const pin = findPin(pins, placement.pinIdentifier);
        if (!pin) {
          results.push({
            index: i,
            componentId: placement.componentId,
            pinIdentifier: placement.pinIdentifier,
            netName: placement.netName,
            success: false,
            error: `\u672A\u627E\u5230\u5F15\u811A "${placement.pinIdentifier}"\uFF0C\u8BF7\u68C0\u67E5\u5F15\u811A\u7F16\u53F7\u6216\u540D\u79F0\u3002`
          });
          failureCount += 1;
          continue;
        }
        const offset = calculateLabelOffset(pin.rotation);
        const labelX = pin.x + offset.x;
        const labelY = pin.y + offset.y;
        const netFlagType = detectNetFlagType(placement.netName);
        let result;
        if (netFlagType) {
          result = await Promise.resolve(
            netFlagApi.createNetFlag.call(
              netFlagApi.context,
              netFlagType,
              placement.netName,
              labelX,
              labelY,
              0,
              // rotation
              false
              // mirror
            )
          );
        } else {
          result = await Promise.resolve(
            attributeApi.createNetLabel.call(attributeApi.context, labelX, labelY, placement.netName)
          );
        }
        if (result) {
          results.push({
            index: i,
            componentId: placement.componentId,
            pinIdentifier: placement.pinIdentifier,
            netName: placement.netName,
            success: true,
            type: netFlagType || "NetLabel",
            position: { x: labelX, y: labelY }
          });
          successCount += 1;
        } else {
          results.push({
            index: i,
            componentId: placement.componentId,
            pinIdentifier: placement.pinIdentifier,
            netName: placement.netName,
            success: false,
            error: "API \u8FD4\u56DE\u7A7A\u7ED3\u679C\uFF0C\u521B\u5EFA\u5931\u8D25\u3002"
          });
          failureCount += 1;
        }
      } catch (error) {
        results.push({
          index: i,
          componentId: placement.componentId,
          pinIdentifier: placement.pinIdentifier,
          netName: placement.netName,
          success: false,
          error: toSafeErrorMessage(error)
        });
        failureCount += 1;
      }
    }
    return {
      ok: true,
      successCount,
      failureCount,
      total: placements.length,
      results,
      message: `\u7F51\u7EDC\u6807\u7B7E\u653E\u7F6E\u5B8C\u6210\uFF1A\u6210\u529F ${String(successCount)} \u4E2A\uFF0C\u5931\u8D25 ${String(failureCount)} \u4E2A\u3002`
    };
  }

  // src/mcp/netlabel-modify-handler.ts
  function resolveComponentApi2() {
    const edaGlobal = globalThis.eda;
    if (!edaGlobal || typeof edaGlobal !== "object") {
      throw new Error("EDA \u73AF\u5883\u672A\u5C31\u7EEA\uFF0C\u65E0\u6CD5\u8BBF\u95EE eda \u5168\u5C40\u5BF9\u8C61\u3002");
    }
    const componentModule = edaGlobal.sch_PrimitiveComponent;
    if (!isPlainObjectRecord(componentModule) || typeof componentModule.getAllPinsByPrimitiveId !== "function") {
      throw new Error("\u672A\u627E\u5230 eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId API\u3002");
    }
    return {
      context: componentModule,
      getAllPinsByPrimitiveId: componentModule.getAllPinsByPrimitiveId
    };
  }
  function resolveAttributeApi2() {
    const edaGlobal = globalThis.eda;
    if (!edaGlobal || typeof edaGlobal !== "object") {
      throw new Error("EDA \u73AF\u5883\u672A\u5C31\u7EEA\uFF0C\u65E0\u6CD5\u8BBF\u95EE eda \u5168\u5C40\u5BF9\u8C61\u3002");
    }
    const attributeModule = edaGlobal.sch_PrimitiveAttribute;
    if (!isPlainObjectRecord(attributeModule) || typeof attributeModule.modify !== "function" || typeof attributeModule.get !== "function") {
      throw new Error("\u672A\u627E\u5230 eda.sch_PrimitiveAttribute API\u3002");
    }
    return {
      context: attributeModule,
      modify: attributeModule.modify,
      get: attributeModule.get
    };
  }
  function resolveDocumentApi() {
    const edaGlobal = globalThis.eda;
    if (!edaGlobal || typeof edaGlobal !== "object") {
      throw new Error("EDA \u73AF\u5883\u672A\u5C31\u7EEA\uFF0C\u65E0\u6CD5\u8BBF\u95EE eda \u5168\u5C40\u5BF9\u8C61\u3002");
    }
    const documentModule = edaGlobal.sch_Document;
    if (!isPlainObjectRecord(documentModule) || typeof documentModule.getPrimitivesInRegion !== "function") {
      throw new Error("\u672A\u627E\u5230 eda.sch_Document.getPrimitivesInRegion API\u3002");
    }
    return {
      context: documentModule,
      getPrimitivesInRegion: documentModule.getPrimitivesInRegion
    };
  }
  function findPin2(pins, identifier) {
    for (let i = 0; i < pins.length; i += 1) {
      const pin = pins[i];
      if (!isPlainObjectRecord(pin)) {
        continue;
      }
      const pinNumber = String(pin.pinNumber ?? "").trim();
      const pinName = String(pin.pinName ?? "").trim();
      if (pinNumber === identifier || pinName === identifier) {
        return {
          x: Number(pin.x ?? 0),
          y: Number(pin.y ?? 0),
          pinNumber,
          pinName
        };
      }
    }
    return null;
  }
  function findNetLabelNearPin(primitives, pinX, pinY) {
    const searchRadius = 30;
    for (let i = 0; i < primitives.length; i += 1) {
      const primitive = primitives[i];
      if (!isPlainObjectRecord(primitive)) {
        continue;
      }
      const primitiveType = String(primitive.primitiveType ?? "");
      if (primitiveType !== "ATTRIBUTE") {
        continue;
      }
      const x = Number(primitive.x ?? 0);
      const y = Number(primitive.y ?? 0);
      const distance = Math.sqrt((x - pinX) ** 2 + (y - pinY) ** 2);
      if (distance <= searchRadius) {
        const primitiveId = String(primitive.primitiveId ?? "").trim();
        if (primitiveId.length > 0) {
          return primitiveId;
        }
      }
    }
    return null;
  }
  async function handleNetLabelModifyTask(payload) {
    if (!isPlainObjectRecord(payload)) {
      throw new TypeError("netlabel/modify \u4EFB\u52A1\u53C2\u6570\u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002");
    }
    const target = payload.target;
    const newNetName = String(payload.newNetName ?? "").trim();
    if (!isPlainObjectRecord(target)) {
      throw new TypeError("target \u53C2\u6570\u5FC5\u987B\u4E3A\u5BF9\u8C61\u3002");
    }
    if (newNetName.length === 0) {
      throw new Error("newNetName \u4E0D\u80FD\u4E3A\u7A7A\u3002");
    }
    const targetType = String(target.type ?? "").trim();
    let primitiveId = null;
    let oldNetName;
    if (targetType === "primitiveId") {
      primitiveId = String(target.primitiveId ?? "").trim();
      if (primitiveId.length === 0) {
        throw new Error("target.primitiveId \u4E0D\u80FD\u4E3A\u7A7A\u3002");
      }
    } else if (targetType === "pin") {
      const componentId = String(target.componentId ?? "").trim();
      const pinIdentifier = String(target.pinIdentifier ?? "").trim();
      if (componentId.length === 0) {
        throw new Error("target.componentId \u4E0D\u80FD\u4E3A\u7A7A\u3002");
      }
      if (pinIdentifier.length === 0) {
        throw new Error("target.pinIdentifier \u4E0D\u80FD\u4E3A\u7A7A\u3002");
      }
      const componentApi = resolveComponentApi2();
      const documentApi = resolveDocumentApi();
      const pins = await Promise.resolve(
        componentApi.getAllPinsByPrimitiveId.call(componentApi.context, componentId)
      );
      if (!Array.isArray(pins) || pins.length === 0) {
        throw new Error("\u672A\u627E\u5230\u5668\u4EF6\u5F15\u811A\uFF0C\u8BF7\u68C0\u67E5 componentId \u662F\u5426\u6B63\u786E\u3002");
      }
      const pin = findPin2(pins, pinIdentifier);
      if (!pin) {
        throw new Error(`\u672A\u627E\u5230\u5F15\u811A "${pinIdentifier}"\uFF0C\u8BF7\u68C0\u67E5\u5F15\u811A\u7F16\u53F7\u6216\u540D\u79F0\u3002`);
      }
      const searchRadius = 30;
      const primitives = await Promise.resolve(
        documentApi.getPrimitivesInRegion.call(
          documentApi.context,
          pin.x - searchRadius,
          pin.y - searchRadius,
          pin.x + searchRadius,
          pin.y + searchRadius
        )
      );
      if (!Array.isArray(primitives)) {
        throw new Error("getPrimitivesInRegion \u8FD4\u56DE\u65E0\u6548\u7ED3\u679C\u3002");
      }
      primitiveId = findNetLabelNearPin(primitives, pin.x, pin.y);
      if (!primitiveId) {
        throw new Error(`\u5728\u5F15\u811A "${pinIdentifier}" \u9644\u8FD1\u672A\u627E\u5230\u7F51\u7EDC\u6807\u7B7E\uFF0C\u8BF7\u68C0\u67E5\u662F\u5426\u5DF2\u653E\u7F6E\u3002`);
      }
    } else {
      throw new Error('target.type \u5FC5\u987B\u4E3A "primitiveId" \u6216 "pin"\u3002');
    }
    const attributeApi = resolveAttributeApi2();
    try {
      const currentAttribute = await Promise.resolve(
        attributeApi.get.call(attributeApi.context, primitiveId)
      );
      if (isPlainObjectRecord(currentAttribute)) {
        oldNetName = String(currentAttribute.value ?? "").trim();
      }
    } catch {
    }
    const result = await Promise.resolve(
      attributeApi.modify.call(attributeApi.context, primitiveId, {
        value: newNetName
      })
    );
    if (!result) {
      return {
        ok: false,
        error: "API \u8FD4\u56DE\u7A7A\u7ED3\u679C\uFF0C\u4FEE\u6539\u5931\u8D25\u3002"
      };
    }
    return {
      ok: true,
      primitiveId,
      oldNetName: oldNetName || "(\u672A\u77E5)",
      newNetName,
      message: `\u7F51\u7EDC\u6807\u7B7E\u5DF2\u4FEE\u6539\uFF1A${oldNetName || "(\u672A\u77E5)"} \u2192 ${newNetName}`
    };
  }

  // src/runtime/bridge-runtime-client.ts
  var MCP_SERVER_URL = "ws://127.0.0.1:8765/bridge/ws";
  var PAGE_CHECK_INTERVAL_MS = 1e3;
  var BRIDGE_TASK_HANDLERS = {
    "/bridge/jlceda/api/index": handleApiIndexTask,
    "/bridge/jlceda/api/search": handleApiSearchTask,
    "/bridge/jlceda/api/invoke": handleApiInvokeTask,
    "/bridge/jlceda/auto/layout": handleAutoLayoutTask,
    "/bridge/jlceda/auto/routing": handleAutoRoutingTask,
    "/bridge/jlceda/component/place/check": handleComponentPlaceCheckTask,
    "/bridge/jlceda/component/place/close": handleComponentPlaceCloseTask,
    "/bridge/jlceda/component/place/start": handleComponentPlaceStartTask,
    "/bridge/jlceda/component/place": handleComponentPlaceTask,
    "/bridge/jlceda/component/place-auto": handleComponentPlaceAutoTask,
    "/bridge/jlceda/component/select": handleComponentSelectTask,
    "/bridge/jlceda/context": handleEdaContextTask,
    "/bridge/jlceda/schematic/read": handleSchematicReadTask,
    "/bridge/jlceda/schematic/review": handleSchematicReviewTask,
    "/bridge/jlceda/netlabel/place": handleNetLabelPlaceTask,
    "/bridge/jlceda/netlabel/modify": handleNetLabelModifyTask
  };
  var transport;
  var started = false;
  var pageCheckTimer;
  async function isValidPageTypeAsync() {
    try {
      const docInfo = await eda.dmt_SelectControl.getCurrentDocumentInfo();
      if (docInfo && docInfo.documentType !== void 0) {
        const validTypes = [1, 3];
        return validTypes.includes(docInfo.documentType);
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  function startBridgeRuntime() {
    if (started) {
      debugLog("[Bridge Runtime] Already started");
      return;
    }
    started = true;
    debugLog("[Bridge Runtime] Starting bridge runtime (client mode)");
    connectionStatusManager.markServerStarted();
    startPageCheck();
  }
  function startPageCheck() {
    if (pageCheckTimer) {
      return;
    }
    globalThis.setTimeout(() => {
      pageCheckTimer = globalThis.setInterval(async () => {
        const shouldBeActive = await isValidPageTypeAsync();
        if (shouldBeActive && !transport) {
          startClient();
        } else if (!shouldBeActive && transport) {
          stopClient();
        }
      }, PAGE_CHECK_INTERVAL_MS);
      isValidPageTypeAsync().then((isValid) => {
        if (isValid) {
          startClient();
        }
      }).catch(() => {
      });
    }, 3e3);
  }
  function startClient() {
    if (transport) {
      return;
    }
    debugLog("[Bridge Runtime] Starting client connection");
    connectionStatusManager.markServerStarted();
    transport = new BridgeTransport(MCP_SERVER_URL, {
      onTask: async (requestId, path, payload) => {
        return await handleTask(path, payload);
      }
    });
    transport.start().catch((error) => {
      debugLog("[Bridge Runtime] Failed to start client: " + toSafeErrorMessage(error));
      transport = void 0;
    });
  }
  function stopClient() {
    if (!transport) {
      return;
    }
    debugLog("[Bridge Runtime] Stopping client (page type changed)");
    transport.stop();
    transport = void 0;
    try {
      eda.sys_Message.showToastMessage(
        "\u5DF2\u65AD\u5F00MCP\u670D\u52A1\u5668\u8FDE\u63A5\uFF08\u9875\u9762\u5207\u6362\uFF09",
        2,
        // WARNING
        2
      );
    } catch (e) {
    }
  }
  function stopBridgeRuntime() {
    if (!started) {
      return;
    }
    if (pageCheckTimer) {
      globalThis.clearInterval(pageCheckTimer);
      pageCheckTimer = void 0;
    }
    stopClient();
    started = false;
    debugLog("[Bridge Runtime] Bridge runtime stopped");
  }
  function restartBridgeServer() {
    debugLog("[Bridge Runtime] Manual restart requested");
    connectionStatusManager.clear();
    connectionStatusManager.markServerStarted();
    stopClient();
    try {
      eda.sys_Message.showToastMessage(
        "\u6B63\u5728\u91CD\u65B0\u8FDE\u63A5MCP\u670D\u52A1\u5668...",
        2,
        // WARNING
        2
      );
    } catch (e) {
    }
    globalThis.setTimeout(async () => {
      const isValid = await isValidPageTypeAsync();
      if (isValid) {
        startClient();
      } else {
        try {
          const docInfo = await eda.dmt_SelectControl.getCurrentDocumentInfo();
          let message = "\u5F53\u524D\u4E0D\u5728\u539F\u7406\u56FE\u6216PCB\u9875\u9762\n\n";
          if (docInfo && docInfo.documentType !== void 0) {
            const typeNames = {
              "-1": "Home\uFF08\u5F00\u59CB\u9875\uFF09",
              "0": "Blank\uFF08\u7A7A\u767D\uFF09",
              "1": "Schematic Page\uFF08\u539F\u7406\u56FE\uFF09\u2705",
              "3": "PCB \u2705",
              "5": "Project\uFF08\u5DE5\u7A0B\uFF09"
            };
            const typeName = typeNames[String(docInfo.documentType)] || "\u672A\u77E5(" + docInfo.documentType + ")";
            message += "\u5F53\u524D\u6587\u6863\u7C7B\u578B: " + typeName + "\n\n";
          }
          message += "\u5C06\u5728\u6253\u5F00\u539F\u7406\u56FE/PCB\u65F6\u81EA\u52A8\u8FDE\u63A5\u3002";
          eda.sys_Dialog.showInformationMessage(message, "MCP Bridge \u91CD\u542F");
        } catch (e) {
          debugLog("[Bridge Runtime] Failed to get document info: " + e);
        }
      }
    }, 500);
  }
  async function handleTask(path, payload) {
    debugLog("[Bridge Runtime] Handling task: " + path);
    const handler = BRIDGE_TASK_HANDLERS[path];
    if (!handler) {
      throw new Error("Unknown task path: " + path);
    }
    try {
      const result = await handler(payload);
      debugLog("[Bridge Runtime] Task completed: " + path);
      return result;
    } catch (error) {
      debugLog("[Bridge Runtime] Task failed: " + path + ", error: " + toSafeErrorMessage(error));
      throw error;
    }
  }

  // src/index.ts
  function activate(status, arg) {
    startBridgeRuntime();
  }
  function deactivate() {
    stopBridgeRuntime();
  }
  function restartServer() {
    restartBridgeServer();
  }
  function viewConnectionStatus() {
    const statusText = connectionStatusManager.getStatusSummary();
    eda.sys_Dialog.showInformationMessage(statusText, "MCP Bridge \u8FDE\u63A5\u72B6\u6001");
  }
  function openSettingsPage() {
    const hasConnections = connectionStatusManager.hasActiveConnections();
    const connectionCount = connectionStatusManager.getConnectionCount();
    let message = "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n";
    message += "  MCP Bridge \u5BA2\u6237\u7AEF\u6A21\u5F0F v2.0\n";
    message += "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n\n";
    message += "\u670D\u52A1\u5668\u5730\u5740:\n";
    message += "  ws://127.0.0.1:8765/bridge/ws\n\n";
    if (hasConnections) {
      message += "\u2705 \u5F53\u524D\u72B6\u6001: \u5DF2\u8FDE\u63A5\n\n";
    } else {
      message += "\u26A0\uFE0F  \u5F53\u524D\u72B6\u6001: \u672A\u8FDE\u63A5\n\n";
      message += "\u63D0\u793A:\n";
      message += "1. \u8BF7\u786E\u4FDDMCP\u670D\u52A1\u5668\u6B63\u5728\u8FD0\u884C\n";
      message += "2. \u8BF7\u786E\u4FDDOpenCode\u5DF2\u542F\u52A8\n\n";
    }
    message += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n";
    message += "\u5BA2\u6237\u7AEF\u6A21\u5F0F\u8BF4\u660E:\n";
    message += "\u2022 \u81EA\u52A8\u68C0\u6D4B\u9875\u9762\u7C7B\u578B\n";
    message += "\u2022 \u4EC5\u5728\u539F\u7406\u56FE/PCB\u9875\u9762\u8FDE\u63A5\n";
    message += "\u2022 \u8FDE\u63A5\u5230MCP\u670D\u52A1\u5668\uFF08\u7AEF\u53E38765\uFF09\n";
    message += "\u2022 \u5982\u9047\u95EE\u9898\u53EF\u624B\u52A8\u91CD\u542F\n\n";
    message += "\u67E5\u770B\u8BE6\u7EC6\u8FDE\u63A5\u72B6\u6001\uFF0C\u8BF7\u70B9\u51FB\u83DC\u5355:\n";
    message += "\u300CMCP Bridge \u2192 \u8FDE\u63A5\u72B6\u6001\u300D\n\n";
    message += "\u91CD\u542F\u8FDE\u63A5\uFF0C\u8BF7\u70B9\u51FB\u83DC\u5355:\n";
    message += "\u300CMCP Bridge \u2192 \u91CD\u542F\u670D\u52A1\u5668\u300D";
    eda.sys_Dialog.showInformationMessage(message, "MCP Bridge \u8BBE\u7F6E");
  }
  function about() {
    eda.sys_Dialog.showInformationMessage(
      eda.sys_I18n.text("MCP Bridge (Server Mode)", void 0, void 0, version),
      eda.sys_I18n.text("About")
    );
  }
  function viewDebugLog() {
    const log = getDebugLog();
    if (!log) {
      eda.sys_Dialog.showInformationMessage("\u6682\u65E0\u8C03\u8BD5\u65E5\u5FD7", "\u8C03\u8BD5\u65E5\u5FD7");
      return;
    }
    eda.sys_Dialog.showInformationMessage(log, "\u8C03\u8BD5\u65E5\u5FD7 (\u6700\u8FD1100\u6761)");
  }
  function clearDebugLogAction() {
    clearDebugLog();
    eda.sys_Dialog.showInformationMessage("\u8C03\u8BD5\u65E5\u5FD7\u5DF2\u6E05\u7A7A", "\u8C03\u8BD5\u65E5\u5FD7");
  }
  return __toCommonJS(src_exports);
})();

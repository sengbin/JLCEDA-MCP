"use strict";
var edaEsbuildExportName = (() => {
  // src/bridge/config.ts
  var MCP_SERVER_URL_CONFIG_KEY = "jlc_mcp_server_url";
  var MCP_SERVER_URL_CHANGED_TOPIC = "jlc_mcp_server_url_changed";
  var DEFAULT_MCP_WS_URL = "ws://127.0.0.1:8765/bridge/ws";
  function getMcpServerUrlChangedTopic() {
    return MCP_SERVER_URL_CHANGED_TOPIC;
  }
  function normalizeMcpUrl(raw) {
    const normalized = String(raw ?? "").trim();
    if (normalized.length === 0) {
      throw new Error("\u6865\u63A5 WebSocket \u5730\u5740\u4E0D\u80FD\u4E3A\u7A7A\u3002");
    }
    let parsed;
    try {
      parsed = new URL(normalized);
    } catch {
      throw new Error("\u6865\u63A5\u5730\u5740\u5FC5\u987B\u662F\u5B8C\u6574\u7684 ws:// \u6216 wss:// \u5730\u5740\u3002");
    }
    if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
      throw new Error("\u6865\u63A5\u5730\u5740\u534F\u8BAE\u4EC5\u652F\u6301 ws:// \u6216 wss://\u3002");
    }
    return normalized;
  }
  function getConfiguredMcpUrl() {
    const value = eda.sys_Storage.getExtensionUserConfig(MCP_SERVER_URL_CONFIG_KEY);
    if (typeof value !== "string" || value.trim().length === 0) {
      return DEFAULT_MCP_WS_URL;
    }
    try {
      return normalizeMcpUrl(value);
    } catch {
      return DEFAULT_MCP_WS_URL;
    }
  }
  async function saveConfiguredMcpUrl(bridgeWebSocketUrl) {
    await eda.sys_Storage.setExtensionUserConfig(MCP_SERVER_URL_CONFIG_KEY, normalizeMcpUrl(bridgeWebSocketUrl));
  }

  // src/logging/log.ts
  var LOG_FIELD_ORDER = [
    "timestamp",
    "level",
    "source",
    "module",
    "event",
    "summary",
    "message",
    "runtimeStatus",
    "bridgeStatus",
    "bridgeWebSocketUrl",
    "host",
    "port",
    "contextKey",
    "clientId",
    "activeClientId",
    "leaseTerm",
    "bridgeClientCount",
    "detail",
    "errorCode"
  ];
  var LOG_FIELD_LABELS = {
    timestamp: "\u65F6\u95F4",
    level: "\u7EA7\u522B",
    source: "\u6765\u6E90",
    module: "\u6A21\u5757",
    event: "\u4E8B\u4EF6",
    summary: "\u6458\u8981",
    message: "\u6D88\u606F",
    runtimeStatus: "\u8FD0\u884C\u65F6\u72B6\u6001",
    bridgeStatus: "\u6865\u63A5\u72B6\u6001",
    bridgeWebSocketUrl: "\u6865\u63A5\u5730\u5740",
    host: "\u76D1\u542C\u5730\u5740",
    port: "\u76D1\u542C\u7AEF\u53E3",
    contextKey: "\u4E0A\u4E0B\u6587\u952E",
    clientId: "\u5BA2\u6237\u7AEFID",
    activeClientId: "\u6D3B\u52A8\u5BA2\u6237\u7AEFID",
    leaseTerm: "\u79DF\u7EA6",
    bridgeClientCount: "\u5BA2\u6237\u7AEF\u6570\u91CF",
    detail: "\u8BE6\u60C5",
    errorCode: "\u9519\u8BEF\u7801"
  };
  var BRIDGE_LOG_LIMIT = 200;
  function normalizeText(value) {
    return String(value ?? "").trim();
  }
  function formatBeijingTimeOnly(date) {
    try {
      return new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(date);
    } catch {
      const utcMillis = date.getTime();
      const beijingDate = new Date(utcMillis + 8 * 60 * 60 * 1e3);
      const hh = String(beijingDate.getUTCHours()).padStart(2, "0");
      const mm = String(beijingDate.getUTCMinutes()).padStart(2, "0");
      const ss = String(beijingDate.getUTCSeconds()).padStart(2, "0");
      return `${hh}:${mm}:${ss}`;
    }
  }
  function createLogId(timestamp, event, module) {
    return `${Date.parse(timestamp) || Date.now()}_${module}_${event}`;
  }
  function compactFields(fields) {
    const compacted = {};
    for (const [key, value] of Object.entries(fields)) {
      const normalizedValue = normalizeText(value);
      if (normalizedValue.length === 0) {
        continue;
      }
      compacted[key] = normalizedValue;
    }
    return compacted;
  }
  var BridgeLogPipeline = class {
    logs = [];
    listener;
    /**
     * 获取统一日志字段定义。
     * @returns 字段顺序、字段标签与默认可见字段。
     */
    getFieldSchema() {
      return {
        fieldOrder: [...LOG_FIELD_ORDER],
        fieldLabels: { ...LOG_FIELD_LABELS },
        defaultVisibleFields: [...LOG_FIELD_ORDER]
      };
    }
    /**
     * 构造 Bridge 日志。
     * @param input 构造参数。
     * @returns 统一日志记录。
     */
    createEntry(input) {
      const now = /* @__PURE__ */ new Date();
      const timestamp = now.toISOString();
      const displayTime = formatBeijingTimeOnly(now);
      const fields = compactFields({
        timestamp: displayTime,
        level: input.level,
        source: "bridge",
        module: input.module,
        event: input.event,
        summary: input.summary,
        message: input.message,
        runtimeStatus: input.runtimeStatus,
        bridgeStatus: input.bridgeStatus,
        bridgeWebSocketUrl: input.bridgeWebSocketUrl,
        host: input.host,
        port: input.port,
        contextKey: input.contextKey,
        clientId: input.clientId,
        activeClientId: input.activeClientId,
        leaseTerm: input.leaseTerm,
        bridgeClientCount: input.bridgeClientCount,
        detail: input.detail,
        errorCode: input.errorCode
      });
      return {
        id: createLogId(timestamp, input.event, input.module),
        timestamp,
        level: input.level,
        fields
      };
    }
    /**
     * 追加日志到本地缓存并通知监听器。
     * @param logEntry 日志实体。
     * @returns 原日志实体。
     */
    append(logEntry) {
      this.logs.push(logEntry);
      if (this.logs.length > BRIDGE_LOG_LIMIT) {
        this.logs.splice(0, this.logs.length - BRIDGE_LOG_LIMIT);
      }
      if (this.listener) {
        try {
          this.listener(logEntry);
        } catch {
        }
      }
      return logEntry;
    }
    /**
     * 设置日志监听器。
     * @param listener 监听回调。
     */
    setListener(listener) {
      this.listener = listener;
    }
    /**
     * 格式化日志为可输出文本。
     * @param logEntry 日志实体。
     * @returns JSON 字符串。
     */
    format(logEntry) {
      return JSON.stringify({
        id: logEntry.id,
        timestamp: logEntry.timestamp,
        level: logEntry.level,
        ...logEntry.fields
      });
    }
    /**
     * 校验统一日志结构。
     * @param value 待校验对象。
     * @returns 是否为合法日志。
     */
    isUnifiedLogEntry(value) {
      if (!value || typeof value !== "object") {
        return false;
      }
      const recordValue = value;
      if (typeof recordValue.id !== "string" || normalizeText(recordValue.id).length === 0) {
        return false;
      }
      if (typeof recordValue.timestamp !== "string" || normalizeText(recordValue.timestamp).length === 0) {
        return false;
      }
      if (recordValue.level !== "info" && recordValue.level !== "success" && recordValue.level !== "warning" && recordValue.level !== "error") {
        return false;
      }
      if (!recordValue.fields || typeof recordValue.fields !== "object" || Array.isArray(recordValue.fields)) {
        return false;
      }
      return true;
    }
    /**
     * 判断日志是否属于连接信息类日志。
     * @param logEntry 要判断的日志记录。
     * @returns 是否为连接信息日志。
     */
    isConnectionInfoLog(logEntry) {
      const fields = logEntry.fields;
      const event = String(fields.event ?? "").trim();
      if (event.startsWith("status.role.") || event.startsWith("status.connect") || event.includes("bridge.websocket")) {
        return true;
      }
      return ["clientId", "activeClientId", "bridgeClientCount", "leaseTerm"].some((fieldKey) => String(fields[fieldKey] ?? "").trim().length > 0);
    }
  };
  var bridgeLogPipeline = new BridgeLogPipeline();

  // src/state/state-manager.ts
  var BridgeStateManager = class _BridgeStateManager {
    static text = {
      // 连接状态文案：用于连接过程、角色显示与失败提示。
      connection: {
        connectingWaiting: "\u7B49\u5F85\u670D\u52A1\u7AEF stdio \u542F\u52A8",
        connectingService: "\u6B63\u5728\u8FDE\u63A5\u6865\u63A5\u670D\u52A1",
        connected: "\u5DF2\u8FDE\u63A5",
        connectSuccessToast: "\u6865\u63A5\u8FDE\u63A5\u6210\u529F\u3002",
        disconnected: "\u672A\u8FDE\u63A5",
        websocketConnecting: "\u8FDE\u63A5\u4E2D",
        connectFailed: "\u7EE7\u7EED\u7B49\u5F85\u670D\u52A1\u7AEF stdio \u542F\u52A8",
        connectFailedRetryDetail: "\u8FDE\u63A5\u5931\u8D25\uFF0C\u7CFB\u7EDF\u5C06\u81EA\u52A8\u91CD\u8BD5",
        standby: "\u5F53\u524D\u9875\u9762\u5F85\u547D\u4E2D",
        currentClientPrefix: "\u5F53\u524D\u5BA2\u6237\u7AEF\uFF1A",
        activeClientPrefix: "\u5F53\u524D\u6D3B\u52A8\u5BA2\u6237\u7AEF\uFF1A",
        standbyDetailFallback: "\u5176\u4ED6\u9875\u9762\u6B63\u5728\u6301\u6709\u6865\u63A5\u8FDE\u63A5\u3002"
      },
      // 页面设置文案：用于设置页初始化、校验与保存反馈。
      settings: {
        statusInitFailed: "\u72B6\u6001\u521D\u59CB\u5316\u5931\u8D25",
        configInvalid: "\u914D\u7F6E\u65E0\u6548",
        configSaved: "\u914D\u7F6E\u5DF2\u4FDD\u5B58\u3002",
        settingsInitFailedSummary: "\u72B6\u6001\u521D\u59CB\u5316\u5931\u8D25",
        settingsConfigInvalidSummary: "\u9875\u9762\u914D\u7F6E\u65E0\u6548",
        settingsPublishFailedSummary: "\u914D\u7F6E\u66F4\u65B0\u6D88\u606F\u53D1\u9001\u5931\u8D25"
      },
      // 运行时业务文案：用于任务执行、角色变更与状态同步日志。
      runtime: {
        roleReasonSummary: "\u6865\u63A5\u89D2\u8272\u53D8\u66F4",
        statusSaveFailedSummary: "\u6865\u63A5\u72B6\u6001\u4FDD\u5B58\u5931\u8D25",
        statusPublishFailedSummary: "\u6865\u63A5\u72B6\u6001\u5E7F\u64AD\u5931\u8D25",
        connectedToastFailedSummary: "\u8FDE\u63A5\u6210\u529F\u63D0\u793A\u53D1\u9001\u5931\u8D25",
        activePublishFailedSummary: "\u6D3B\u52A8\u72B6\u6001\u5E7F\u64AD\u5931\u8D25",
        taskFailedSummary: "\u6865\u63A5\u4EFB\u52A1\u6267\u884C\u5931\u8D25",
        contextSyncFailedSummary: "\u6865\u63A5\u4E0A\u4E0B\u6587\u540C\u6B65\u5931\u8D25",
        serverErrorSummary: "\u6865\u63A5\u670D\u52A1\u7AEF\u8FD4\u56DE\u9519\u8BEF",
        contextNotInitialized: "\u6865\u63A5\u4E0A\u4E0B\u6587\u5C1A\u672A\u521D\u59CB\u5316\u3002",
        taskRejectedStandby: "\u5F53\u524D\u5BA2\u6237\u7AEF\u5904\u4E8E\u5F85\u547D\u72B6\u6001\uFF0C\u62D2\u7EDD\u6267\u884C\u4EFB\u52A1\u3002",
        taskLeaseExpired: "\u4EFB\u52A1\u79DF\u7EA6\u5DF2\u8FC7\u671F\u3002",
        taskPathUnsupportedPrefix: "\u4E0D\u652F\u6301\u7684\u4EFB\u52A1\u8DEF\u5F84\uFF1A"
      },
      // 传输层文案：用于 WebSocket 协议解析、连接生命周期与保活异常。
      transport: {
        unknownMessageFormat: "\u6536\u5230\u65E0\u6CD5\u8BC6\u522B\u7684\u6865\u63A5\u6D88\u606F\u683C\u5F0F\u3002",
        invalidMessageRoot: "\u6865\u63A5\u6D88\u606F\u683C\u5F0F\u975E\u6CD5\uFF0C\u6839\u8282\u70B9\u5FC5\u987B\u662F\u5BF9\u8C61\u3002",
        missingType: "\u6865\u63A5\u6D88\u606F\u7F3A\u5C11 type \u5B57\u6BB5\u3002",
        unknownTypePrefix: "\u6536\u5230\u672A\u77E5\u670D\u52A1\u7AEF\u6D88\u606F\u7C7B\u578B: ",
        closed: "\u6865\u63A5\u8FDE\u63A5\u5DF2\u5173\u95ED\u3002",
        closeReason: "\u6865\u63A5\u8FDE\u63A5\u5DF2\u5173\u95ED",
        connectFailedPrefix: "\u6865\u63A5\u8FDE\u63A5\u5931\u8D25\uFF1A",
        messageHandleFailedPrefix: "\u6865\u63A5\u6D88\u606F\u5904\u7406\u5931\u8D25\uFF1A",
        waitingStdio: "\u6B63\u5728\u7B49\u5F85 stdio \u542F\u52A8\uFF0C\u670D\u52A1\u542F\u52A8\u540E\u5C06\u81EA\u52A8\u8FDE\u63A5\u3002",
        handshakeTimeout: "\u6865\u63A5\u8FDE\u63A5\u63E1\u624B\u8D85\u65F6\u3002",
        heartbeatSendFailedPrefix: "\u6865\u63A5\u5FC3\u8DF3\u53D1\u9001\u5931\u8D25\uFF1A",
        serverIdleTimeout: "\u6865\u63A5\u670D\u52A1\u7AEF\u957F\u65F6\u95F4\u65E0\u54CD\u5E94\u3002"
      }
    };
    /**
     * 生成连接中状态。
     * @returns 连接状态快照。
     */
    createConnectingSnapshot() {
      return {
        bridgeType: "connecting",
        bridgeText: _BridgeStateManager.text.connection.connectingWaiting,
        websocketType: "connecting",
        websocketText: _BridgeStateManager.text.connection.websocketConnecting,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    /**
     * 生成角色状态。
     * @param role 当前角色。
     * @param displayClientId 当前客户端标识。
     * @param displayActiveClientId 当前活动客户端标识。
     * @returns 连接状态快照。
     */
    createRoleSnapshot(role, displayClientId, displayActiveClientId) {
      const websocketText = displayClientId.length > 0 ? `${_BridgeStateManager.text.connection.currentClientPrefix}${displayClientId}` : _BridgeStateManager.text.connection.connected;
      if (role === "active") {
        return {
          bridgeType: "connected",
          bridgeText: _BridgeStateManager.text.connection.connected,
          websocketType: "connected",
          websocketText,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      const activeLabel = displayActiveClientId.length > 0 ? `${_BridgeStateManager.text.connection.activeClientPrefix}${displayActiveClientId}` : _BridgeStateManager.text.connection.standby;
      return {
        bridgeType: "connecting",
        bridgeText: activeLabel,
        websocketType: "connected",
        websocketText,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    /**
     * 生成连接失败状态。
     * @param detail 失败详情。
     * @returns 连接状态快照。
     */
    createFailedSnapshot(detail) {
      const normalizedDetail = String(detail ?? "").trim() || _BridgeStateManager.text.connection.connectFailedRetryDetail;
      return {
        bridgeType: "error",
        bridgeText: _BridgeStateManager.text.connection.connectFailed,
        websocketType: "error",
        websocketText: normalizedDetail,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    /**
     * 生成未在编辑页时的待连接状态。
     * @returns 连接状态快照。
     */
    createNotEditablePageSnapshot() {
      return {
        bridgeType: "connecting",
        bridgeText: _BridgeStateManager.text.connection.disconnected,
        websocketType: "connecting",
        websocketText: _BridgeStateManager.text.connection.disconnected,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    /**
     * 计算桥接状态展示文本。
     * @param bridgeType 桥接状态类型。
     * @param bridgeText 桥接状态文案。
     * @returns 展示文本。
     */
    getBridgeDisplayText(bridgeType, bridgeText) {
      if (bridgeType === "connected" && bridgeText === _BridgeStateManager.text.connection.connected) {
        return `${_BridgeStateManager.text.connection.connected}\u3002`;
      }
      return bridgeText;
    }
    /**
     * 判断桥接文案是否为“等待连接”样式。
     * @param bridgeType 桥接状态类型。
     * @param bridgeText 桥接状态文案。
     * @returns 是否为等待文案。
     */
    isBridgeWaitingMessage(bridgeType, bridgeText) {
      return bridgeType === "connecting" && bridgeText === _BridgeStateManager.text.connection.connectingWaiting;
    }
    /**
     * 判断 WebSocket 文案是否为“等待连接”样式。
     * @param websocketType websocket 状态类型。
     * @param websocketText websocket 状态文案。
     * @returns 是否为等待文案。
     */
    isSocketWaitingMessage(websocketType, websocketText) {
      return websocketType === "connecting" && websocketText === _BridgeStateManager.text.connection.websocketConnecting;
    }
  };

  // src/utils.ts
  function isPlainObjectRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function toSafeErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  // src/state/status-store.ts
  var MCP_CONNECTION_STATUS_KEY = "jlc_mcp_connection_status";
  function isConnectionStatusSnapshot(value) {
    if (!isPlainObjectRecord(value)) {
      return false;
    }
    const validTypes = /* @__PURE__ */ new Set(["connecting", "connected", "error"]);
    return validTypes.has(String(value.bridgeType ?? "").trim()) && validTypes.has(String(value.websocketType ?? "").trim()) && typeof value.bridgeText === "string" && typeof value.websocketText === "string" && typeof value.updatedAt === "string";
  }
  function readConnectionStatus() {
    try {
      const raw = eda.sys_Storage.getExtensionUserConfig(MCP_CONNECTION_STATUS_KEY);
      return isConnectionStatusSnapshot(raw) ? raw : void 0;
    } catch {
      return void 0;
    }
  }

  // src/page/settings.ts
  var CONFIG_TOAST_TIMER_SECONDS = 3;
  var savedServerUrlValue = "";
  var savingServerConfig = false;
  var bridgeStateManager = new BridgeStateManager();
  var BRIDGE_STATUS_TEXT = BridgeStateManager.text;
  function showConfigToast(message, messageType) {
    eda.sys_Message.showToastMessage(message, messageType, CONFIG_TOAST_TIMER_SECONDS);
  }
  function writeSettingsWarningLog(event, summary, message, detail = "", errorCode = "") {
    const logEntry = bridgeLogPipeline.append(bridgeLogPipeline.createEntry({
      level: "warning",
      module: "settings-page",
      event,
      summary,
      message,
      bridgeWebSocketUrl: getConfiguredMcpUrl(),
      detail,
      errorCode
    }));
    console.warn(bridgeLogPipeline.format(logEntry));
  }
  function getElement(id, elementType, elementLabel) {
    const element = document.getElementById(id);
    if (!(element instanceof elementType)) {
      throw new TypeError(`\u9875\u9762\u7F3A\u5C11${elementLabel}\u63A7\u4EF6: ${id}`);
    }
    return element;
  }
  function syncSaveButtonState() {
    const input = getElement("serverUrl", HTMLInputElement, "\u8F93\u5165");
    const button = getElement("saveButton", HTMLButtonElement, "\u6309\u94AE");
    button.disabled = savingServerConfig || input.value === savedServerUrlValue;
  }
  function setStatus(bridgeType, bridgeText, websocketType, websocketText) {
    const bridgeStatusText = getElement("bridgeStatusText", HTMLParagraphElement, "\u6865\u63A5\u72B6\u6001\u5C55\u793A");
    const socketStatusText = getElement("socketStatusText", HTMLParagraphElement, "WebSocket \u72B6\u6001\u5C55\u793A");
    bridgeStatusText.className = `status-text status-${bridgeType}`;
    bridgeStatusText.textContent = bridgeStateManager.getBridgeDisplayText(bridgeType, bridgeText);
    bridgeStatusText.classList.toggle("is-waiting-message", bridgeStateManager.isBridgeWaitingMessage(bridgeType, bridgeText));
    socketStatusText.className = `status-text status-${websocketType}`;
    socketStatusText.textContent = websocketText;
    socketStatusText.classList.toggle("is-waiting-message", bridgeStateManager.isSocketWaitingMessage(websocketType, websocketText));
  }
  function applyBridgeStatus(snapshot) {
    setStatus(snapshot.bridgeType, snapshot.bridgeText, snapshot.websocketType, snapshot.websocketText);
  }
  var STALE_STATUS_MS = 3e3;
  function startStatusMonitor() {
    globalThis.setInterval(() => {
      const snapshot = readConnectionStatus();
      if (isConnectionStatusSnapshot(snapshot)) {
        const age = Date.now() - new Date(snapshot.updatedAt).getTime();
        if (age <= STALE_STATUS_MS) {
          applyBridgeStatus(snapshot);
        }
      }
    }, 1e3);
  }
  async function saveServerConfig() {
    const input = getElement("serverUrl", HTMLInputElement, "\u8F93\u5165");
    const button = getElement("saveButton", HTMLButtonElement, "\u6309\u94AE");
    if (button.disabled) {
      return;
    }
    savingServerConfig = true;
    syncSaveButtonState();
    try {
      const normalizedUrl = normalizeMcpUrl(input.value);
      await saveConfiguredMcpUrl(normalizedUrl);
      savedServerUrlValue = normalizedUrl;
      input.value = normalizedUrl;
      try {
        eda.sys_MessageBus.publish(getMcpServerUrlChangedTopic(), normalizedUrl);
      } catch (error) {
        const message = toSafeErrorMessage(error);
        writeSettingsWarningLog("settings.config.publish.failed", BRIDGE_STATUS_TEXT.settings.settingsPublishFailedSummary, message, message, "settings_publish_failed");
      }
      showConfigToast(BRIDGE_STATUS_TEXT.settings.configSaved, ESYS_ToastMessageType.SUCCESS);
    } catch (error) {
      showConfigToast(`\u4FDD\u5B58\u5931\u8D25\uFF1A${toSafeErrorMessage(error)}`, ESYS_ToastMessageType.ERROR);
    } finally {
      savingServerConfig = false;
      syncSaveButtonState();
    }
  }
  function bootstrapPage() {
    const button = getElement("saveButton", HTMLButtonElement, "\u6309\u94AE");
    const input = getElement("serverUrl", HTMLInputElement, "\u8F93\u5165");
    savedServerUrlValue = getConfiguredMcpUrl() || DEFAULT_MCP_WS_URL;
    input.value = savedServerUrlValue;
    syncSaveButtonState();
    button.addEventListener("click", () => {
      void saveServerConfig();
    });
    input.addEventListener("input", () => {
      syncSaveButtonState();
    });
    try {
      normalizeMcpUrl(input.value);
      setStatus("connecting", "\u2013", "connecting", "\u2013");
      try {
        startStatusMonitor();
      } catch (error) {
        const message = toSafeErrorMessage(error);
        writeSettingsWarningLog("settings.status.init.failed", BRIDGE_STATUS_TEXT.settings.settingsInitFailedSummary, message, message, "settings_init_failed");
        setStatus("error", BRIDGE_STATUS_TEXT.settings.statusInitFailed, "error", message);
      }
    } catch (error) {
      const message = toSafeErrorMessage(error);
      writeSettingsWarningLog("settings.config.invalid", BRIDGE_STATUS_TEXT.settings.settingsConfigInvalidSummary, message, message, "settings_config_invalid");
      setStatus("error", BRIDGE_STATUS_TEXT.settings.configInvalid, "error", message);
    }
  }
  bootstrapPage();
})();

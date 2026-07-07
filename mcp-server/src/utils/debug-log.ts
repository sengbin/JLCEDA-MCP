/**
 * 调试日志工具（简化版，无实际存储）
 */

export function debugLog(message: string): void {
  // 在纯MCP版本中，直接输出到stderr
  process.stderr.write(`[DEBUG] ${message}\n`);
}

export function addDebugLog(message: string): void {
  debugLog(message);
}

export function getDebugLog(): string | null {
  return null;
}

export function clearDebugLog(): void {
  // No-op in pure MCP version
}

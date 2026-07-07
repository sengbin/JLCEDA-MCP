/**
 * 通用工具函数
 */

export async function safeCall<T>(executor: () => Promise<T>): Promise<T | undefined> {
  try {
    return await executor();
  } catch {
    return undefined;
  }
}

export function isPlainObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function parseBoundedIntegerValue(
  value: unknown,
  defaultValue: number,
  min: number,
  max: number
): number {
  const num = Number(value);
  if (!Number.isInteger(num) || num < min || num > max) {
    return defaultValue;
  }
  return num;
}

export function toSerializable(value: unknown, depth = 0, seen?: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'function') {
    const functionName = (value as any).name;
    return `[Function ${typeof functionName === 'string' && functionName.length > 0 ? functionName : 'anonymous'}]`;
  }

  if (depth >= 4) {
    return '[MaxDepthExceeded]';
  }

  const tracked = seen ?? new WeakSet<object>();
  if (typeof value === 'object') {
    if (tracked.has(value as object)) {
      return '[Circular]';
    }
    tracked.add(value as object);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 120).map(item => toSerializable(item, depth + 1, tracked));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isPlainObjectRecord(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      output[key] = toSerializable(child, depth + 1, tracked);
    }
    return output;
  }

  return String(value);
}

export async function toSerializableAsync(value: unknown, depth = 0, seen?: WeakSet<object>): Promise<unknown> {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'function') {
    const functionName = (value as any).name;
    return `[Function ${typeof functionName === 'string' && functionName.length > 0 ? functionName : 'anonymous'}]`;
  }

  if (depth >= 4) {
    return '[MaxDepthExceeded]';
  }

  const tracked = seen ?? new WeakSet<object>();
  if (typeof value === 'object') {
    if (tracked.has(value as object)) {
      return '[Circular]';
    }
    tracked.add(value as object);
  }

  if (Array.isArray(value)) {
    return await Promise.all(value.slice(0, 120).map(item => toSerializableAsync(item, depth + 1, tracked)));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isPlainObjectRecord(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      output[key] = await toSerializableAsync(child, depth + 1, tracked);
    }
    return output;
  }

  return String(value);
}

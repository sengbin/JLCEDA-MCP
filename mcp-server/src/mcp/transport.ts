/**
 * ------------------------------------------------------------------------
 * 名称：stdio 传输层
 * 说明：处理标准输入输出的JSON-RPC消息传输
 * ------------------------------------------------------------------------
 */

import * as readline from 'readline';

export interface StdioTransport {
  start: () => void;
  write: (payload: unknown) => void;
}

/**
 * 创建stdio传输对象
 * @param onLine 收到单行输入后的回调
 * @returns 传输对象
 */
export function createStdioTransport(onLine: (line: string) => Promise<void>): StdioTransport {
  let requestChain: Promise<void> = Promise.resolve();

  return {
    start: () => {
      const reader = readline.createInterface({
        input: process.stdin,
        crlfDelay: Infinity,
        terminal: false,
      });

      reader.on('line', (line) => {
        requestChain = requestChain.then(async () => {
          await onLine(line);
        }).catch((error: unknown) => {
          process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        });
      });
    },
    write: (payload: unknown) => {
      process.stdout.write(`${JSON.stringify(payload)}\n`);
    },
  };
}

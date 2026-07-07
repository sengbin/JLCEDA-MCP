/**
 * ------------------------------------------------------------------------
 * 名称：桥接全工程原理图审查任务处理
 * 说明：调用 sch_ManufactureData.getNetlistFile 获取全工程（所有原理图页面）的网表文件，
 *       将网表文本直接输出供 AI 分析，覆盖多页原理图的所有器件与网络连接关系。
 * 作者：Lion
 * 邮箱：chengbin@3578.cn
 * 日期：2026-03-31
 * ------------------------------------------------------------------------
 */

import { safeCall } from '../utils/index.js';

/**
 * 处理全工程原理图审查任务。
 * @param _payload 任务参数（当前未使用）。
 * @returns 读取结果，含全工程网表文本。
 */
export async function handleSchematicReviewTask(_payload: unknown): Promise<unknown> {
	// ── 第一步：执行 DRC 检查 ────────────────────────────────────────────────
	const drcRawResult = await safeCall<unknown>(() => Promise.resolve(eda.sch_Drc.check(false, false, true)));
	const drcCheckPassed = drcRawResult === true;

	// ── 第二步：获取全工程网表 ───────────────────────────────────────────────
	const netlistFile: unknown = await safeCall<unknown>(() => Promise.resolve(eda.sch_ManufactureData.getNetlistFile()));
	if (!netlistFile) {
		return {
			ok: false,
			error: '网表文件获取失败，sch_ManufactureData.getNetlistFile 返回空。',
		};
	}

	const netlistFileObj = netlistFile as { text?: () => Promise<string> };
	if (typeof netlistFileObj.text !== 'function') {
		return { ok: false, error: '网表文件对象格式异常，无法读取文本内容。' };
	}

	const netlistText: string = await netlistFileObj.text();
	if (!netlistText || netlistText.trim().length === 0) {
		return { ok: false, error: '网表文件内容为空，请确认原理图不为空。' };
	}

	return {
		ok: true,
		drcCheckPassed,
		netlistText,
	};
}

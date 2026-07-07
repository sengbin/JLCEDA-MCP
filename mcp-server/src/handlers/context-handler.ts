/**
 * ------------------------------------------------------------------------
 * 名称：桥接上下文任务处理
 * 说明：采集当前 EDA 环境上下文并输出可序列化快照。
 * 作者：Lion
 * 邮箱：chengbin@3578.cn
 * 日期：2026-03-12
 * 备注：仅处理 context/get 任务。
 * ------------------------------------------------------------------------
 */

import { isPlainObjectRecord, safeCall, toSerializable } from '../utils/index.js';

// 组装上下文快照。
async function buildContextSnapshot(scope: string): Promise<Record<string, unknown>> {
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
		capturedAt: new Date().toISOString(),
		currentDocumentInfo: toSerializable(currentDocumentInfo),
		currentProjectInfo: toSerializable(currentProjectInfo),
		currentBoardInfo: toSerializable(currentBoardInfo),
		currentSchematicInfo: toSerializable(currentSchematicInfo),
		currentSchematicPageInfo: toSerializable(currentSchematicPageInfo),
		currentPcbInfo: toSerializable(currentPcbInfo),
		currentPanelInfo: toSerializable(currentPanelInfo),
		selectedPcbPrimitiveIds: toSerializable(selectedPcbPrimitiveIds),
		selectedSchPrimitiveIds: toSerializable(selectedSchPrimitiveIds),
	};
}

/**
 * 处理上下文查询任务。
 * @param payload 任务参数。
 * @returns 当前上下文快照。
 */
export async function handleEdaContextTask(payload: unknown): Promise<unknown> {
	const scope = isPlainObjectRecord(payload) ? String(payload.scope ?? '').trim() : '';
	return await buildContextSnapshot(scope);
}

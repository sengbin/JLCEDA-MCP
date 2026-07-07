/**
 * ------------------------------------------------------------------------
 * 名称：桥接原理图语义读取任务处理
 * 说明：实时扫描当前原理图，输出以电路语义为核心的结构化 JSON。
 *       数据来源：sch_PrimitiveComponent（器件与引脚）、sch_PrimitiveWire（导线网络名）。
 *       完全基于 EDA 内存状态，无需生成网表文件，刚修改/刚放置的器件立即可见。
 * 作者：Lion
 * 邮箱：chengbin@3578.cn
 * 日期：2026-03-31
 * ------------------------------------------------------------------------
 */

import { safeCall } from '../utils/index.js';

// 安全调用同步 getter 方法，获取指定类型的值。
function getSyncState<T>(obj: unknown, method: string, fallback: T): T {
	try {
		const fn = (obj as Record<string, unknown>)?.[method];
		if (typeof fn === 'function') {
			const result: unknown = (fn as () => unknown).call(obj);
			return result != null ? (result as T) : fallback;
		}
	}
	catch { /* ignore */ }
	return fallback;
}

// 引脚连接点坐标键，用于在坐标→网络名映射中查找。
// 使用 Math.round 消除 EDA 坐标中的浮点精度误差（如 324.99999999999994 vs 325）。
function buildPinCoordinateKey(x: number, y: number): string {
	return `${Math.round(x)}_${Math.round(y)}`;
}

// 从多段线坐标中提取相邻端点对，向邻接图中添加双向边。
// getState_Line 返回 [x1, y1, x2, y2, ...] 平铺形态或 [[x1,y1],[x2,y2],...] 嵌套形态。
function addWireEdgesToAdjacencyGraph(lineData: unknown, graph: Map<string, Set<string>>): void {
	if (!Array.isArray(lineData) || lineData.length === 0) {
		return;
	}

	function addEdge(keyA: string, keyB: string): void {
		if (keyA === keyB) {
			return;
		}
		let setA = graph.get(keyA);
		if (!setA) {
			setA = new Set();
			graph.set(keyA, setA);
		}
		setA.add(keyB);
		let setB = graph.get(keyB);
		if (!setB) {
			setB = new Set();
			graph.set(keyB, setB);
		}
		setB.add(keyA);
	}

	if (Array.isArray(lineData[0])) {
		// [[x1, y1], [x2, y2], ...] 嵌套形态：相邻点之间连边
		for (let i = 0; i + 1 < lineData.length; i++) {
			const a = lineData[i] as unknown[];
			const b = lineData[i + 1] as unknown[];
			if (Array.isArray(a) && a.length >= 2 && Array.isArray(b) && b.length >= 2) {
				addEdge(buildPinCoordinateKey(a[0] as number, a[1] as number), buildPinCoordinateKey(b[0] as number, b[1] as number));
			}
		}
	}
	else {
		// [x1, y1, x2, y2, ...] 平铺形态：每两个相邻坐标对之间连边
		for (let i = 0; i + 3 < lineData.length; i += 2) {
			addEdge(
				buildPinCoordinateKey(lineData[i] as number, lineData[i + 1] as number),
				buildPinCoordinateKey(lineData[i + 2] as number, lineData[i + 3] as number),
			);
		}
	}
}

// BFS：沿导线邻接图将已知网络名传播到所有相连坐标。
function propagateNetworkNamesViaBFS(
	coordinateToNetworkNameMap: Map<string, string>,
	wireAdjacencyGraph: Map<string, Set<string>>,
): void {
	const queue: string[] = Array.from(coordinateToNetworkNameMap.keys());
	const visited = new Set<string>(queue);
	let head = 0;
	while (head < queue.length) {
		const currKey = queue[head++];
		const networkName = coordinateToNetworkNameMap.get(currKey)!;
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

// 扫描原理图并输出电路语义 JSON 字符串。
async function readSchematicCircuit(): Promise<{ ok: true; data: string } | { ok: false; error: string }> {
	// ── 第一步：获取所有器件实例 ──────────────────────────────────────────
	const componentListRaw = await safeCall<unknown>(() => Promise.resolve(eda.sch_PrimitiveComponent.getAll(undefined, true)));
	if (!Array.isArray(componentListRaw)) {
		return { ok: false, error: '器件列表获取失败，sch_PrimitiveComponent.getAll 未返回数组。' };
	}

	// ── 第二步：构建坐标→网络名映射（BFS 沿导线传播） ──────────────────────
	// 种子来源 1：网络标志器件坐标（VCC/GND 等），net name = getState_Net()。
	// 种子来源 2：导线自身携带网络名（非电源网络，如 NET1/NET2 等自动命名网络）。
	// BFS：以种子坐标为起点，沿导线邻接图传播网络名到所有相连坐标。
	const coordinateToNetworkNameMap: Map<string, string> = new Map();

	// 收集所有导线，构建坐标邻接图，同时将有网络名的导线端点作为种子。
	const wireAdjacencyGraph: Map<string, Set<string>> = new Map();
	const wireListRaw = await safeCall<unknown>(() => Promise.resolve(eda.sch_PrimitiveWire.getAll()));
	if (Array.isArray(wireListRaw)) {
		for (const rawWire of wireListRaw) {
			const lineData: unknown = getSyncState<unknown>(rawWire, 'getState_Line', null);
			addWireEdgesToAdjacencyGraph(lineData, wireAdjacencyGraph);
			// 导线自身已有网络名时，将其所有端点作为种子。
			const wireName = getSyncState<string>(rawWire, 'getState_Net', '');
			if (wireName.length > 0 && Array.isArray(lineData)) {
				const flat = Array.isArray(lineData[0])
					? (lineData as number[][]).flatMap(p => p)
					: (lineData as number[]);
				for (let i = 0; i + 1 < flat.length; i += 2) {
					const key = buildPinCoordinateKey(flat[i], flat[i + 1]);
					if (!coordinateToNetworkNameMap.has(key)) {
						coordinateToNetworkNameMap.set(key, wireName);
					}
				}
			}
		}
	}

	// 将网络标志器件坐标写入种子映射（优先级高于导线自身名称，允许覆盖）。
	for (const rawComponent of componentListRaw) {
		const netFlagNetworkName = getSyncState<string>(rawComponent, 'getState_Net', '');
		if (netFlagNetworkName.length > 0) {
			const x = getSyncState<number>(rawComponent, 'getState_X', 0);
			const y = getSyncState<number>(rawComponent, 'getState_Y', 0);
			coordinateToNetworkNameMap.set(buildPinCoordinateKey(x, y), netFlagNetworkName);
		}
	}

	// BFS 传播：从所有种子坐标出发，沿导线邻接图扩散网络名。
	propagateNetworkNamesViaBFS(coordinateToNetworkNameMap, wireAdjacencyGraph);

	// ── 第三步：遍历器件，组装语义输出结构 ──────────────────────────────────
	interface PinSemanticInfo {
		pinNumber: string;
		pinSignalName: string;
		pinElectricalType: string;
		connectedNetworkName: string;
		hasNoConnectMark: boolean;
	}

	interface ComponentSemanticInfo {
		componentInstanceId: string;
		componentDesignator: string;
		componentSymbolName: string;
		schematicSubPartName: string;
		pins: PinSemanticInfo[];
	}

	const networkToPinRefSetMap: Map<string, Set<string>> = new Map();
	const components: ComponentSemanticInfo[] = [];

	for (const rawComponent of componentListRaw) {
		const componentDesignator = getSyncState<string>(rawComponent, 'getState_Designator', '');
		const netFlagNetworkName = getSyncState<string>(rawComponent, 'getState_Net', '');

		if (componentDesignator.length === 0 && netFlagNetworkName.length === 0) {
			continue;
		}

		if (netFlagNetworkName.length > 0) {
			// 网络标志器件（VCC/GND 等）：以网络名作为位号，展示为单引脚语义条目。
			const primitiveId = getSyncState<string>(rawComponent, 'getState_PrimitiveId', '');
			const pinRef = `${netFlagNetworkName}.1`;
			let networkPinSet = networkToPinRefSetMap.get(netFlagNetworkName);
			if (!networkPinSet) {
				networkPinSet = new Set();
				networkToPinRefSetMap.set(netFlagNetworkName, networkPinSet);
			}
			networkPinSet.add(pinRef);
			components.push({
				componentInstanceId: primitiveId,
				componentDesignator: netFlagNetworkName,
				componentSymbolName: netFlagNetworkName,
				schematicSubPartName: '',
				pins: [{
					pinNumber: '1',
					pinSignalName: netFlagNetworkName,
					pinElectricalType: 'power',
					connectedNetworkName: netFlagNetworkName,
					hasNoConnectMark: false,
				}],
			});
			continue;
		}

		// 普通器件：获取所有引脚并查找连接网络名。
		const primitiveId = getSyncState<string>(rawComponent, 'getState_PrimitiveId', '');
		const pinsRaw = await safeCall<unknown>(() => Promise.resolve(eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(primitiveId)));
		if (pinsRaw !== undefined && !Array.isArray(pinsRaw)) {
			return { ok: false, error: `器件 ${componentDesignator} 的引脚列表格式异常。` };
		}

		const pins: PinSemanticInfo[] = [];
		for (const rawPin of Array.isArray(pinsRaw) ? pinsRaw : []) {
			const pinNumber = getSyncState<string>(rawPin, 'getState_PinNumber', '');
			const pinSignalName = getSyncState<string>(rawPin, 'getState_PinName', '');
			const pinElectricalType = getSyncState<string>(rawPin, 'getState_PinType', '');
			const pinConnectionX = getSyncState<number>(rawPin, 'getState_X', 0);
			const pinConnectionY = getSyncState<number>(rawPin, 'getState_Y', 0);
			const hasNoConnectMark = getSyncState<boolean>(rawPin, 'getState_NoConnected', false);

			const coordinateKey = buildPinCoordinateKey(pinConnectionX, pinConnectionY);
			const connectedNetworkName = coordinateToNetworkNameMap.get(coordinateKey) ?? '';

			if (connectedNetworkName.length > 0) {
				const pinRef = `${componentDesignator}.${pinNumber || pinSignalName}`;
				let networkPinSet = networkToPinRefSetMap.get(connectedNetworkName);
				if (!networkPinSet) {
					networkPinSet = new Set();
					networkToPinRefSetMap.set(connectedNetworkName, networkPinSet);
				}
				networkPinSet.add(pinRef);
			}

			pins.push({ pinNumber, pinSignalName, pinElectricalType, connectedNetworkName, hasNoConnectMark });
		}

		components.push({
			componentInstanceId: primitiveId,
			componentDesignator,
			componentSymbolName: getSyncState<string>(rawComponent, 'getState_Name', ''),
			schematicSubPartName: getSyncState<string>(rawComponent, 'getState_SubPartName', ''),
			pins,
		});
	}

	// ── 第四步：将网络映射转为按网络名排序的数组 ────────────────────────────
	interface NetworkSemanticInfo {
		networkName: string;
		connectedPinRefs: string[];
	}

	const networks: NetworkSemanticInfo[] = [];
	for (const [networkName, pinRefSet] of networkToPinRefSetMap) {
		networks.push({
			networkName,
			connectedPinRefs: Array.from(pinRefSet).sort(),
		});
	}
	networks.sort((a, b) => a.networkName.localeCompare(b.networkName));

	// ── 第五步：执行 DRC 检查 ────────────────────────────────────────────────
	const drcRawResult = await safeCall<unknown>(() => Promise.resolve(eda.sch_Drc.check(false, false, true)));
	const drcCheckPassed = drcRawResult === true;

	return {
		ok: true,
		data: JSON.stringify({
			drcCheckPassed,
			componentCount: components.length,
			networkCount: networks.length,
			components,
			networks,
		}),
	};
}

/**
 * 处理原理图语义读取任务。
 * @param _payload 任务参数（当前未使用）。
 * @returns 读取结果，含完整电路语义快照。
 */
export async function handleSchematicReadTask(_payload: unknown): Promise<unknown> {
	const result = await readSchematicCircuit();
	if (!result.ok) {
		return { ok: false, error: (result as any).error };
	}

	return {
		ok: true,
		schematicCircuitSnapshot: result.data,
	};
}

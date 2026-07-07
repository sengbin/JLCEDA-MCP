# JLCEDA MCP 简化版改造计划

## 目标
移除所有侧栏依赖，使其可以在 OpenCode 等没有 VS Code 侧栏的环境中使用。

## 改造方案

### 方案 B：返回候选列表让 AI 选择（已选定）

#### component_select 改造
- 移除用户交互流程
- 直接返回前 5 个候选器件的完整信息
- AI 根据规格、库存、价格等信息选择最合适的器件

#### component_place 改造  
- 移除侧栏交互式放置流程
- 调用 EDA 自动放置 API（需要调研 `eda.sch_Place` 相关 API）

## 需要修改的文件

### 核心修改

1. **mcp-hub/src/server/mcp/tool-dispatcher.ts**
   - 简化 `handleComponentSelect()` 方法（行 524-641）
   - 简化 `handleComponentPlace()` 方法（行 643-865）
   - 移除侧栏交互相关的私有方法
   - 移除 `skippedSelectKeywords` 相关逻辑

2. **mcp-hub/src/server/mcp/tool-dispatcher.ts** - 移除导入
   ```typescript
   // 删除这些导入
   import {
     clearSidebarInteractionRequest,
     clearSidebarInteractionResponse,
     type SidebarComponentPlaceInteraction,
     type SidebarComponentPlaceItem,
     type SidebarComponentPlaceRowState,
     type SidebarComponentSelectCandidate,
     type SidebarComponentSelectInteraction,
     type SidebarInteractionRequest,
     type SidebarInteractionResponse,
     readSidebarInteractionResponse,
     writeSidebarInteractionRequest,
   } from '../../state/sidebar-interaction';
   ```

3. **mcp-hub/package.json**
   - 移除 `viewsContainers` 配置（行 25-32）
   - 移除 `views` 配置（行 34-42）
   - 移除 `closeSidebarOnOpenEditor` 配置项

4. **mcp-hub/src/extension.ts**
   - 移除侧栏初始化代码

### 可选删除（精简代码）

- `mcp-hub/src/sidebar/` - 整个目录
- `mcp-hub/src/state/sidebar-interaction.ts`
- `mcp-hub/src/logging/sidebar-log.ts`

## 代码改造详情

### handleComponentSelect 简化版

```typescript
// 桥接执行器件搜索。（简化版：无侧栏交互）
private async handleComponentSelect(argumentsObject: Record<string, unknown>): Promise<unknown> {
  const keyword = String(argumentsObject.keyword ?? '').trim();
  if (keyword.length === 0) {
    throw new Error('component_select 缺少 keyword 参数。');
  }

  // 硬拦截：VCC/GND 等电源/地符号不进选型流程
  if (ToolDispatcher.NET_FLAG_KEYWORDS.has(keyword.toLowerCase())) {
    return {
      ok: false,
      errorCode: 'NET_FLAG_NOT_SELECTABLE',
      message: `电源/地符号（${keyword}）不需要选型，也不能通过 component_place 放置。电源/地符号需要用户在 EDA 中手动放置。`,
    };
  }

  const limit = parseBoundedIntegerValue(argumentsObject.limit, 5, 2, 20);
  const searchResult = await enqueueBridgeRequest('/bridge/jlceda/component/select', {
    keyword,
    limit,
    page: 1,
  }, DEFAULT_BRIDGE_TIMEOUT_MS);
  
  const payload = this.parseComponentSelectBridgePayload(searchResult);
  if (!payload) {
    return searchResult;
  }

  // 自动模式：返回前 5 个候选器件供 AI 选择
  if (payload.candidates.length === 0) {
    return {
      ok: false,
      errorCode: 'NO_CANDIDATES_FOUND',
      message: `未找到匹配"${keyword}"的器件，请调整关键词后重试。`,
    };
  }

  return {
    ok: true,
    keyword,
    candidates: payload.candidates.slice(0, 5),
    message: `找到 ${payload.candidates.length} 个候选器件。请从 candidates 列表中选择最合适的一个（根据规格、库存、价格等因素判断）。选中后使用其 uuid 和 libraryUuid 调用 component_place 进行放置。`,
  };
}
```

### handleComponentPlace 简化版（需要调研 EDA API）

```typescript
// 桥接创建器件放置任务。（简化版：调用自动放置 API）
private async handleComponentPlace(argumentsObject: Record<string, unknown>): Promise<unknown> {
  const components = argumentsObject.components;
  if (!Array.isArray(components)) {
    throw new Error('component_place 缺少 components 参数，且其必须为数组。');
  }

  // 方案 1：如果 EDA 支持自动放置 API
  // 需要调研 eda.sch_Place.placeComponent() 或类似 API
  const results = [];
  for (const component of components) {
    try {
      const result = await enqueueBridgeRequest('/bridge/jlceda/component/auto-place', {
        uuid: component.uuid,
        libraryUuid: component.libraryUuid,
        name: component.name,
      }, DEFAULT_BRIDGE_TIMEOUT_MS);
      results.push(result);
    } catch (error) {
      results.push({
        ok: false,
        component,
        error: toSafeErrorMessage(error),
      });
    }
  }

  return {
    ok: true,
    results,
    message: `已尝试放置 ${components.length} 个器件。`,
  };
}
```

## 实施步骤

1. **备份当前版本**
   ```bash
   git checkout -b simplified-no-sidebar
   ```

2. **修改 tool-dispatcher.ts**
   - 替换 handleComponentSelect 方法
   - 替换 handleComponentPlace 方法
   - 移除侧栏相关私有方法

3. **调研 EDA 自动放置 API**
   - 查看 `mcp-bridge/src/mcp/api-index-handler.ts` 中的 API 列表
   - 搜索 `sch_Place` 相关 API
   - 确定自动放置的实现方式

4. **修改 package.json**
   - 移除侧栏配置

5. **修改 extension.ts**
   - 移除侧栏初始化

6. **构建测试**
   ```bash
   cd mcp-hub
   npm run build
   ```

7. **测试验证**
   - 安装新版本扩展
   - 测试 component_select 是否返回候选列表
   - 测试 component_place 是否能自动放置

## 注意事项

- **component_place 的自动放置功能需要确认 EDA API 是否支持**
- 如果不支持自动放置，可能需要返回提示信息让用户手动操作
- 超时时间可能需要调整（目前是 30 秒）

## 后续优化

- 添加配置项控制是否启用自动选择模式
- 支持通过环境变量或配置文件自定义选择策略
- 优化错误处理和日志记录

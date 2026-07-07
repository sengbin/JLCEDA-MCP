# AGENTS.md

## Repository structure

Dual-package monorepo for JLCEDA EDA integration via MCP protocol:

- `mcp-hub/` — VS Code/Cursor extension, exposes MCP tools over stdio/http, hosts WebSocket bridge server
- `mcp-bridge/` — JLCEDA EDA extension, connects to mcp-hub via WebSocket, executes EDA operations
- `build/` — shared output directory for both `.vsix` and `.eext` packages
- `tool/` — utility scripts for offline doc generation

No root-level build orchestration. Each package builds independently.

## Build commands

Must cd into each package directory first:

```bash
# mcp-hub
cd mcp-hub
npm install
npm run build        # produces ../build/jlceda-mcp-hub-{version}.vsix

# mcp-bridge  
cd mcp-bridge
npm install
npm run build        # produces ../build/jlceda-mcp-bridge-{version}.eext
```

Build outputs land in `../build/`, not within each package.

**mcp-hub** uses esbuild + inline vsce packaging (all in package.json script).  
**mcp-bridge** uses esbuild + ts-node for build orchestration.

## Other commands

**mcp-hub:**
- `npm run watch` — rebuild on file changes
- `npm run typecheck` — run tsc without emitting
- `npm run lint` — eslint check
- `npm run clean` — remove out/

**mcp-bridge:**
- `npm run compile` — esbuild only (no packaging)
- `npm run lint` — eslint check
- `npm run fix` — eslint auto-fix

Pre-commit hooks with lint-staged are configured in mcp-bridge only.

## Cross-package coordination

When adding or changing MCP tools:

1. Update tool schema in `mcp-hub/resources/mcp-tool-definitions.json`
2. Update bridge task handler in both `mcp-hub/src/` and `mcp-bridge/src/`
3. Update README.md in both packages + root
4. Update CHANGELOG.md in both packages

Tool definitions and bridge task paths must stay in sync across both packages.

## Testing and verification

No automated test suite exists. Manual verification requires:

- Installing both extensions (mcp-hub in VS Code/Cursor, mcp-bridge in JLCEDA EDA Professional)
- Opening an EDA schematic/PCB project
- Confirming WebSocket bridge connection (default: `ws://127.0.0.1:8765/bridge/ws`)
- Invoking MCP tools from Copilot/Cursor Chat

## Architecture notes

```
JLCEDA EDA (mcp-bridge) ←→ WebSocket ←→ mcp-hub (VS Code/Cursor) ←→ stdio/http MCP ←→ AI client
```

mcp-hub acts as both MCP server and WebSocket bridge host. mcp-bridge is a client that connects to the bridge and executes operations in EDA.

Only schematic and PCB pages can establish bridge connections. Multiple EDA pages may connect, but only the active role executes tasks.

## Requirements

- Node.js 20+
- VS Code 1.105+ (for mcp-hub development/debugging)
- JLCEDA EDA Professional (for mcp-bridge installation and testing)

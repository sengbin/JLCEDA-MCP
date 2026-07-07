@echo off
REM ========================================
REM JLCEDA MCP Server - 启动脚本
REM ========================================

echo.
echo ========================================
echo   JLCEDA MCP Server
echo ========================================
echo.

cd /d "%~dp0"

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查 dist 目录
if not exist "dist\index.js" (
    echo [错误] 未找到编译文件
    echo 请先运行: npm run build
    pause
    exit /b 1
)

echo [信息] 启动 MCP 服务器...
echo.

REM 启动服务器
node dist/index.js

echo.
echo [信息] 服务器已停止
pause

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' 获取脚本所在目录
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)

' 切换到脚本目录
objShell.CurrentDirectory = strScriptPath

' 后台启动服务器（无窗口）
objShell.Run "node dist\index.js", 0, False

' 提示用户
WScript.Echo "JLCEDA MCP Server 已在后台启动" & vbCrLf & vbCrLf & _
             "运行状态检查: node check-server.mjs" & vbCrLf & _
             "停止服务器: 任务管理器 -> 结束 node.exe 进程"

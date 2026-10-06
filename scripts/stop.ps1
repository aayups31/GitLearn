$ErrorActionPreference = 'Stop'
$projectDirectory = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$pidFile = Join-Path $projectDirectory '.local\companion.pid'
if (-not (Test-Path -LiteralPath $pidFile)) { Write-Output 'No launcher process is recorded. If you used npm start, stop that terminal with Ctrl+C.'; exit 0 }
$companionProcessId = [int](Get-Content -LiteralPath $pidFile)
$companionProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $companionProcessId" -ErrorAction SilentlyContinue
$serverFile = Join-Path $projectDirectory 'dist\server\index.js'
if ($companionProcess) {
    if ($companionProcess.Name -ne 'node.exe' -or -not $companionProcess.CommandLine -or $companionProcess.CommandLine.IndexOf($serverFile, [StringComparison]::OrdinalIgnoreCase) -lt 0) { throw 'The recorded process belongs to another program. Stop GitLearn from its terminal instead.' }
    Stop-Process -Id $companionProcessId
}
Remove-Item -LiteralPath $pidFile -Force
Write-Output 'GitLearn stopped. Your saved sessions and history stay on your computer.'

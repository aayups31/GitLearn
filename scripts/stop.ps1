$ErrorActionPreference = 'Stop'
$projectDirectory = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$pidFile = Join-Path $projectDirectory '.local\companion.pid'
if (-not (Test-Path -LiteralPath $pidFile)) { Write-Output 'No launcher process is recorded. If you used npm start, stop that terminal with Ctrl+C.'; exit 0 }
$companionProcessId = [int](Get-Content -LiteralPath $pidFile)
$companionProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $companionProcessId" -ErrorAction SilentlyContinue
$serverFile = Join-Path $projectDirectory 'dist\server\index.js'
if ($companionProcess) {
    if ($companionProcess.Name -ne 'node.exe' -or -not $companionProcess.CommandLine -or $companionProcess.CommandLine.IndexOf($serverFile, [StringComparison]::OrdinalIgnoreCase) -lt 0) { throw 'The recorded process belongs to another program. Stop GitLearn from its terminal instead.' }
    & (Join-Path $env:SystemRoot 'System32\taskkill.exe') /PID $companionProcessId /T /F | Out-Null
    if ($LASTEXITCODE -ne 0 -and (Get-Process -Id $companionProcessId -ErrorAction SilentlyContinue)) { throw 'GitLearn could not stop its local processes. Try again or stop the companion from its terminal.' }
}
Remove-Item -LiteralPath $pidFile -Force
Write-Output 'GitLearn stopped. Your saved sessions and history stay on your computer.'

param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectDirectory = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $projectDirectory
$companionUrl = 'http://127.0.0.1:47831'
try {
    $health = Invoke-RestMethod -Uri "$companionUrl/api/health" -TimeoutSec 2
    if ($health.name -eq 'GitLearn') { if (-not $NoBrowser) { Start-Process $companionUrl }; exit 0 }
} catch {}
$runtime = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $runtime) { throw 'Install Node.js 24 or newer, then open Start OutClass again.' }
$runtimeVersion = & $runtime.Source --version
if ([int]($runtimeVersion.TrimStart('v').Split('.')[0]) -lt 24) { throw 'OutClass needs Node.js 24 or newer.' }
if (-not (Test-Path -LiteralPath (Join-Path $projectDirectory 'node_modules'))) {
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw 'Dependency setup failed. Check your internet connection and try again.' }
}
$serverFile = Join-Path $projectDirectory 'dist\server\index.js'
if (-not (Test-Path -LiteralPath $serverFile)) {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'The build failed. See the messages above.' }
}
$localDirectory = Join-Path $projectDirectory '.local'
New-Item -ItemType Directory -Path $localDirectory -Force | Out-Null
$startedProcess = Start-Process -FilePath $runtime.Source -ArgumentList @('"' + $serverFile + '"') -WorkingDirectory $projectDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $localDirectory 'companion.log') -RedirectStandardError (Join-Path $localDirectory 'companion-error.log')
Set-Content -LiteralPath (Join-Path $localDirectory 'companion.pid') -Value $startedProcess.Id
for ($attempt = 0; $attempt -lt 25; $attempt++) {
    Start-Sleep -Milliseconds 400
    try {
        $health = Invoke-RestMethod -Uri "$companionUrl/api/health" -TimeoutSec 2
        if ($health.name -eq 'GitLearn') { if (-not $NoBrowser) { Start-Process $companionUrl }; exit 0 }
    } catch {}
}
throw 'The companion did not start. Check .local/companion-error.log or run npm start in this folder.'

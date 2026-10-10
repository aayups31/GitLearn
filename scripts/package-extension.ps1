$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$extensionPath = Join-Path $taskRoot 'dist\extension'
if (-not (Test-Path -LiteralPath (Join-Path $extensionPath 'manifest.json'))) { throw 'Run npm run build first.' }
$releasePath = Join-Path $taskRoot 'dist\releases'
New-Item -ItemType Directory -Force -Path $releasePath | Out-Null
$version = (Get-Content -LiteralPath (Join-Path $extensionPath 'manifest.json') -Raw | ConvertFrom-Json).version
$zipPath = Join-Path $releasePath "GitLearn-Chrome-$version.zip"
Compress-Archive -Path (Join-Path $extensionPath '*') -DestinationPath $zipPath -Force
Write-Output "Chrome upload package: $zipPath"

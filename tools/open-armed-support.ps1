$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$entryUrl = 'http://127.0.0.1:5196/preview/armed-support-showcase-20261111/'
function Test-ArmedEntry {
    try {
        $reply = Invoke-WebRequest -Uri $entryUrl -TimeoutSec 2
        return $reply.StatusCode -eq 200 -and $reply.Content -match '武装支援'
    } catch { return $false }
}
if (-not (Test-ArmedEntry)) {
    Start-Process -FilePath 'node' -ArgumentList 'tools/serve-armed-support.mjs' -WorkingDirectory $projectPath -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 250
        if (Test-ArmedEntry) { break }
    }
}
if (-not (Test-ArmedEntry)) { throw '本地展示服务未就绪，请在项目目录运行 node tools/serve-armed-support.mjs 查看原因。' }
Start-Process $entryUrl

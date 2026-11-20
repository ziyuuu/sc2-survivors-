# Only disposable game resource caches; never player saves, cookies or account data.
[CmdletBinding()]
param([switch]$Execute)
$ErrorActionPreference = 'Stop'
$applyCleanup = $Execute.IsPresent
. (Join-Path $PSScriptRoot 'cleanup-retired-browser-caches-20261112.ps1')
$recordedAtUtc = [DateTimeOffset]::Parse('2026-11-16T03:00:00Z').UtcDateTime
$originUrl = 'https://sc2-v04-private-test-20261027.yuuuu-g.chatgpt.site'
$profiles = @{
    Edge = 'C:\Users\zyuu\AppData\Local\Microsoft\Edge\User Data\Default'
    Codex = 'C:\Users\zyuu\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Roaming\Codex\web\Codex\Default\Partitions\codex-browser-app'
}
$records = ConvertFrom-Csv @'
Browser,Port,Id,IndexHash,Files,Bytes,Stores
Edge,0,b10c79738631be2fde2d931e37236fee06c3c2f9,55bc0341d81223e4e3dfff6879661bf5b58977dee63509e7b4038072e6a3549c,3745,352459099,c7218aae-4fd9-4594-abe6-e9ab5e8e603b
Codex,0,b10c79738631be2fde2d931e37236fee06c3c2f9,ea0a1ef3a7429cbd6ee1bb7a45d6b3c71b1c747a6ced5163f79fe9cf8fbf8ef2,3474,237984390,06cf1b80-7ceb-4fa0-b430-696435b59be1|45ad8b18-9462-44d7-b64a-7221926cf84a
'@
$processes = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('ChatGPT.exe','chrome.exe','Codex.exe','msedge.exe') })
$busy = @{
    Codex = @($processes | Where-Object { $_.CommandLine -match 'codex[\\/]web[\\/]codex|codex-browser-app' }).Count -gt 0
    Edge = @($processes | Where-Object { $_.Name -eq 'msedge.exe' -and $_.CommandLine -notmatch '--type=' -and ($_.CommandLine -notmatch '--user-data-dir' -or $_.CommandLine -match 'Microsoft[\\/]Edge[\\/]User Data') }).Count -gt 0
}
$script:removedBytes = 0L
$script:removedFiles = 0L
$before = (Get-PSDrive -Name C).Free
$results = foreach ($record in $records) {
    try {
        $profile = $profiles[$record.Browser]
        $index = Join-Path $profile ('Service Worker\CacheStorage\' + $record.Id + '\index.txt')
        if (Test-Path -LiteralPath $index -PathType Leaf) {
            $raw = [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($index))
            if (-not $raw.Contains($originUrl) -or -not $raw.Contains('sc2-resource-bytes-v1')) { throw 'Unexpected cache origin or resource store' }
        }
        $status = Clear-RecordedOrigin $profile $record $applyCleanup $busy[$record.Browser]
    } catch { $status = 'kept or partial: ' + $_.Exception.Message }
    [pscustomobject]@{ Browser=$record.Browser; Status=$status }
}
$after = (Get-PSDrive -Name C).Free
[pscustomobject]@{ Mode=if($applyCleanup){'execute'}else{'preview'}; Results=$results; RemovedFiles=$script:removedFiles; RemovedBytes=$script:removedBytes; NetFreeBytes=$after-$before } | ConvertTo-Json -Depth 4

# Preview by default. Run with -Execute after exiting the browsers to clear old QA downloads.
[CmdletBinding()]
param([switch]$Execute)
$ErrorActionPreference = 'Stop'

function Assert-PlainPath([string]$path) {
    if ((Resolve-Path -LiteralPath $path).ProviderPath -ne $path) { throw "Unexpected path: $path" }
    $part = Get-Item -LiteralPath $path -Force
    while ($part) {
        if ($part.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Reparse point: $($part.FullName)" }
        $part = if ($part -is [IO.DirectoryInfo]) { $part.Parent } else { $part.Directory }
    }
}

function Measure-RecordedCache([string]$path, $record, [bool]$staged) {
    Assert-PlainPath $path
    $allowed = @($record.Stores -split '\|')
    $stores = @(Get-ChildItem -LiteralPath $path -Directory -Force)
    $directFiles = @(Get-ChildItem -LiteralPath $path -File -Force)
    # An interrupt after removing the last file can leave an empty retired directory.
    if ($staged -and $directFiles.Count -eq 0 -and $stores.Count -eq 0) {
        return [pscustomobject]@{ Files=0; Bytes=0 }
    }
    if ($directFiles.Count -ne 1 -or $directFiles[0].Name -cne 'index.txt') { throw 'Unexpected index files' }
    $index = $directFiles[0]
    Assert-PlainPath $index.FullName
    if ((Get-FileHash -LiteralPath $index.FullName -Algorithm SHA256).Hash -ine $record.IndexHash) { throw 'Cache index changed' }
    if (-not $staged -and $allowed.Count -ne $stores.Count) { throw 'Cache list changed' }
    $walk = [Collections.Generic.Stack[IO.DirectoryInfo]]::new()
    foreach ($store in $stores) {
        if ($store.Name -notin $allowed -or $store.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Unexpected cache directory' }
        $walk.Push($store)
    }
    [long]$size = $index.Length
    [long]$count = 1
    while ($walk.Count) {
        foreach ($entry in $walk.Pop().EnumerateFileSystemInfos()) {
            if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Unexpected linked cache entry' }
            if ($entry -is [IO.DirectoryInfo]) { $walk.Push($entry); continue }
            if ($entry.LastWriteTimeUtc -gt $recordedAtUtc) { throw 'Cache was reused after inventory' }
            $size += $entry.Length
            $count++
        }
    }
    if ($size -gt [long]$record.Bytes -or $count -gt [long]$record.Files -or
        (-not $staged -and ($size -ne [long]$record.Bytes -or $count -ne [long]$record.Files))) { throw 'Cache contents changed' }
    [pscustomobject]@{ Files=$count; Bytes=$size }
}

function Clear-RecordedOrigin([string]$browserProfileDir, $record, [bool]$apply, [bool]$browserRunning) {
    if ($record.Id -cnotmatch '^[a-f0-9]{40}$') { throw 'Invalid origin ID' }
    $service = Join-Path $browserProfileDir 'Service Worker'
    $storage = Join-Path $service 'CacheStorage'
    $origin = Join-Path $storage $record.Id
    $retired = Join-Path $service ('.sc2-retired-20261112-' + $record.Id)
    $staged = Test-Path -LiteralPath $retired -PathType Container
    if (-not $staged -and -not (Test-Path -LiteralPath $origin -PathType Container)) { return 'already absent' }
    $selected = if ($staged) { $retired } else { $origin }
    $measured = Measure-RecordedCache $selected $record $staged
    if ($browserRunning) { return 'waiting for browser exit' }
    $listeners = [Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
    if ($listeners.Port -contains [int]$record.Port) { return 'test port active' }
    if (-not $apply) { return 'ready' }

    # Hold the existing profile locks only across the atomic retirement. A restarted
    # browser can create a new origin directory while the retired copy is discarded.
    $guards = [Collections.Generic.List[IO.Stream]]::new()
    try {
        foreach ($leaf in @('Service Worker\Database\LOCK','Local Storage\leveldb\LOCK')) {
            $lockPath = Join-Path $browserProfileDir $leaf
            if (Test-Path -LiteralPath $lockPath -PathType Leaf) {
                Assert-PlainPath $lockPath
                try { $guards.Add([IO.File]::Open($lockPath,'Open','Read','None')) }
                catch { return 'profile storage busy' }
            }
        }
        if (-not $staged) {
            Assert-PlainPath $origin
            if ([IO.Path]::GetDirectoryName($origin) -ne $storage -or [IO.Path]::GetDirectoryName($retired) -ne $service) { throw 'Retirement path escaped' }
            $measured = Measure-RecordedCache $origin $record $false
            if (([Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()).Port -contains [int]$record.Port) { return 'test port active' }
            [IO.Directory]::Move($origin,$retired)
        }
    } finally { foreach ($guard in $guards) { $guard.Dispose() } }

    Assert-PlainPath $retired
    foreach ($id in ($record.Stores -split '\|')) {
        if ($id -cnotmatch '^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$') { throw 'Invalid resource cache ID' }
        $leaf = Join-Path $retired $id
        if (Test-Path -LiteralPath $leaf -PathType Container) {
            Assert-PlainPath $leaf
            if ([IO.Path]::GetDirectoryName($leaf) -ne $retired) { throw 'Invalid retired cache path' }
            Remove-Item -LiteralPath $leaf -Recurse -Force -ErrorAction Stop
        }
    }
    $index = Join-Path $retired 'index.txt'
    if (Test-Path -LiteralPath $index -PathType Leaf) { Remove-Item -LiteralPath $index -Force }
    [IO.Directory]::Delete($retired,$false)
    $script:removedBytes += $measured.Bytes
    $script:removedFiles += $measured.Files
    return 'removed'
}

if ($MyInvocation.InvocationName -eq '.') { return }
# These fingerprints pin the decoded cache names, UUIDs and exact loopback origins.
$records = ConvertFrom-Csv @'
Browser,Port,Id,IndexHash,Files,Bytes,Stores
Edge,4809,73946cfa4c84e64a8f443acca04fefc5984dab6f,bedb4d08b1f01c7ebaef3553e9fd2cd7c3eccd7cd79e7d4df1587579ea8ecb30,738,33641822,e7eff214-6432-4808-97cd-00881b984261
Edge,18906,f3ed8a896b4d77ba40e20f4cda7e1ea973eb453e,673b34394ed98dd9ccbc4880e1c54966aed3887f4b32f7684677f47b0dc8a915,2270,415891612,e45225f4-358f-4723-9968-337672cd003a|26b59b78-36f7-464f-8884-b8c148351d17
Codex,4188,fb6a92cf09a3d98642cdf3f58a00a8ae00728101,f01c7f3c9f3d0351fd01ee48ed5f849e5ab513a3fca173a6c8bbc0875a396052,534,383880817,72b5c737-cede-464e-bb2a-6f3eb2ca40f0
Codex,4196,fc0594385ac4d932a14e0fa904a1e8a1967bf62c,aac2c49987362adcac8a9965871519fbab3d0836fb40ec7870f1d1cd7c18f3c3,580,403678902,8fcc8a6c-0626-415a-88a9-c58ede435277
Codex,4354,f0794a097edd4d0f74769eb1be44caa89c36325e,d3f7ee769dcb08b6ee84daf58caa7f71f8d471a56f9cd3b3407687b5193daeed,167,65419285,ec014615-8431-4001-8263-486e8980b4b9
Codex,4368,94e98f66faf0d71d92e4fb172c6ad7b22d734fcf,8dbd89fbb428177b168fe185ffcbc0386c670c45afcf658f4beaa83581ffe9f5,716,609120265,b4b1f2b4-1dd3-4a14-a3d4-7d04e44a5d10
Codex,4373,7b050532500f19f3a9156cf4e9bb7b2c4a4f1157,e05acaa318320daa18c14297b66ee90252f81b0853f9a80eea5c1628a25da48c,925,488401840,9bd947ce-97d7-4352-b4a7-264378f54cf7
Codex,4375,1c69aec539040f4b46eeaddfdd147284de5dfa6a,287e87ed9068dd47f88543e14aed2946861f17ee4adbb2e1594f15845ba3f6e4,213,76765936,e9d4bf49-5b2b-4fa3-a753-1c7ff5018dc2
Codex,4457,4d7af204f3e5bc4f03e0f42b78de3a278d487df5,5effd9d243101aebbf53b07c82ebe01db97ff794cdd9761d28dfb4579210791d,210,69237251,6f2198c2-7e7b-435d-9724-483166159b84
Codex,4461,01709fcbaed8475603a70a3747ff45c93df801d0,8ef809f786f3dbeb5cf34b4f2b51b6bc26510b50c7b1ac004d6dfa7c1dc4ac48,1159,146976367,4f7461fe-7ad7-42fd-8a6b-b3bf4fc70b7b
Codex,4466,379bb4c389b67b7f0927a3bef0def05343b159ca,0bdb6d323db93c4627ef459c5b4514e7751edb887a72a4dbe0f605364b373604,660,81654315,0df19096-98ef-4ba3-9902-8519a8eec66f
Codex,4474,15120fade59a291b154fdb48df48b313c5376db2,da88378e0fb06692ee0f26e2e8171dd1e1c3429f9cfc91a435362851398c6962,1652,609473913,c7ee20fb-dc87-4d57-b141-64d1201b8da4
Codex,4478,b7121d2554a62a6371ea5dfb092aad9d99296073,2a19ec3f0a0f7ecd8d723de75dc8e195dc309fa2768b41db9cd8b301ebd2903b,1632,578769695,b8f3a8f9-16d3-4871-be20-34d8474d33f5
Codex,4482,0665b64f2effbe50e1161691fd25ff7bfd6086b8,d3155b76f48a06657742128cc7c6bef635113c4adc87d9da23ae5055fcd50ed2,1622,617264333,0adf5a31-2448-470b-81d6-e63c405eb7da
Codex,4494,5bf693292854d3636770eb140635ee0b547a99c3,a2ae6860f66cecfe6e6b374c31aec2ce28b6bdc8da1f8514417e3a47ee2f13b2,1147,215829156,30bdfea2-6d59-4ffd-ad07-cafa47e253ba
Codex,4496,b8e4ee2ce60affcdf7af3de6448eda81d217c878,fc489de2c6b4fd2a70c49e5456958bbf49f46d177cd2f032abe9c8889b3bd2ec,1147,215832588,18994c79-c04b-4c78-9018-80fedd8bbb9b
Codex,18883,0e3549b37e4aa5f2f415321184db2e5f4bdf6e15,9d4075f1257f32a5ac4d19250e2a15017a5ce721de83f14403bdeb107f160070,1260,256285106,dcbf6d4b-71e4-4755-b693-a0bb70dc9b2b|84d48c3c-febd-4e2a-82b1-327294636caa
Codex,18889,b85756ccf0b63bd45f1e2a6c1cb0b6716e2afa44,7a2c6334160ee7363203650b5c37de9f0227b8fa14e52a074965101c957f9425,2378,457528668,950898cf-0007-401a-afb9-63d01cf032e1|543da567-8a2f-41cd-9deb-96c565740701
'@
$recordedAtUtc = [DateTimeOffset]::Parse('2026-11-12T07:21:00Z').UtcDateTime
$localRoot = 'C:\Users\zyuu\AppData\Local'
$profiles = @{
    Codex = Join-Path $localRoot 'Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Roaming\Codex\web\Codex\Default\Partitions\codex-browser-app'
    Edge = Join-Path $localRoot 'Microsoft\Edge\User Data\Default'
}
$processes = @(Get-CimInstance Win32_Process -Filter "Name='ChatGPT.exe' OR Name='chrome.exe' OR Name='Codex.exe' OR Name='msedge.exe'")
$busy = @{
    Codex = @($processes | Where-Object { $_.CommandLine -match 'codex[\\/]web[\\/]codex|codex-browser-app' }).Count -gt 0
    Edge = @($processes | Where-Object { $_.Name -eq 'msedge.exe' -and $_.CommandLine -notmatch '--type=' -and ($_.CommandLine -notmatch '--user-data-dir' -or $_.CommandLine -match 'Microsoft[\\/]Edge[\\/]User Data') }).Count -gt 0
}
$script:removedBytes = 0L
$script:removedFiles = 0L
$results = foreach ($record in $records) {
    try { $status = Clear-RecordedOrigin $profiles[$record.Browser] $record $Execute.IsPresent $busy[$record.Browser] }
    catch { $status = 'kept or partial: ' + $_.Exception.Message }
    [pscustomobject]@{ Browser=$record.Browser; Port=$record.Port; MiB=[math]::Round([long]$record.Bytes/1MB,2); Status=$status }
}
$results | Format-Table -AutoSize
[pscustomobject]@{ Mode=if($Execute) {'execute'} else {'preview'}; RemovedFiles=$script:removedFiles; RemovedBytes=$script:removedBytes }


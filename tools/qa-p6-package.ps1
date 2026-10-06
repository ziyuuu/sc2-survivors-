$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$p6Dist = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\dist'))
foreach ($p6Name in @('P6-Coze-Application-20261006', 'P6-Coze-Resources-From-Live-20261006')) {
    $p6Folder = (Resolve-Path -LiteralPath (Join-Path $p6Dist $p6Name)).Path
    $p6Zip = [System.IO.Path]::GetFullPath((Join-Path $p6Dist ($p6Name + '.zip')))
    if (-not $p6Folder.StartsWith($p6Dist + [System.IO.Path]::DirectorySeparatorChar) -or -not $p6Zip.StartsWith($p6Dist + [System.IO.Path]::DirectorySeparatorChar)) { throw 'P6 package path escaped dist' }
    if (Test-Path -LiteralPath $p6Zip) { throw "Preserve existing package: $p6Zip" }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($p6Folder, $p6Zip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    $p6Archive = [System.IO.Compression.ZipFile]::OpenRead($p6Zip)
    try {
        $p6Count = 0
        foreach ($p6Entry in $p6Archive.Entries) {
            if ($p6Entry.FullName.EndsWith('/')) { continue }
            $p6Relative = $p6Entry.FullName.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $p6Original = [System.IO.Path]::GetFullPath((Join-Path $p6Folder $p6Relative))
            if (-not $p6Original.StartsWith($p6Folder + [System.IO.Path]::DirectorySeparatorChar)) { throw 'Unsafe ZIP entry' }
            $p6Stream = $p6Entry.Open()
            try { $p6EntryHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($p6Stream)) } finally { $p6Stream.Dispose() }
            if ($p6EntryHash -ne (Get-FileHash -LiteralPath $p6Original -Algorithm SHA256).Hash) { throw "ZIP mismatch: $p6Original" }
            $p6Count++
        }
        [pscustomobject]@{File=$p6Zip;Entries=$p6Count;Bytes=(Get-Item -LiteralPath $p6Zip).Length;SHA256=(Get-FileHash -LiteralPath $p6Zip -Algorithm SHA256).Hash.ToLowerInvariant()} | ConvertTo-Json -Compress
    } finally { $p6Archive.Dispose() }
}

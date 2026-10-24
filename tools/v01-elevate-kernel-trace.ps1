param([Parameter(Mandatory=$true)][string]$RunDirectory)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$traceBase=[IO.Path]::GetFullPath('D:\星际\reports\local\v01-20261024')
$traceRoot=[IO.Path]::GetFullPath($RunDirectory)
if(-not $traceRoot.StartsWith($traceBase+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Trace directory must remain inside this task.'}
$traceShell='C:\Users\zyuu\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe'
$traceScript='D:\星际\tools\v01-run-kernel-trace.ps1'
$traceArguments=@('-NoProfile','-File',('"'+$traceScript+'"'),'-RunDirectory',('"'+$traceRoot+'"'))
$traceProcess=Start-Process -FilePath $traceShell -ArgumentList $traceArguments -Verb RunAs -WindowStyle Hidden -PassThru
Write-Output $traceProcess.Id

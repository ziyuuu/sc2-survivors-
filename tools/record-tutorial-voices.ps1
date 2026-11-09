$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Media.SpeechSynthesis.SpeechSynthesizer,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime]
$tutorialAwait=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
$tutorialRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../assets/generated/tutorial-voices-20261109'))
$tutorialPlan=Get-Content -LiteralPath (Join-Path $tutorialRoot 'plan.json') -Encoding UTF8 -Raw | ConvertFrom-Json
foreach($tutorialRow in $tutorialPlan.rows){
 $tutorialSynth=[Windows.Media.SpeechSynthesis.SpeechSynthesizer]::new()
 $tutorialSynth.Voice=[Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -eq $tutorialRow.voice } | Select-Object -First 1
 $tutorialOperation=$tutorialSynth.SynthesizeTextToStreamAsync($tutorialRow.text)
 $tutorialStream=$tutorialAwait.MakeGenericMethod([Windows.Media.SpeechSynthesis.SpeechSynthesisStream]).Invoke($null,@($tutorialOperation)).GetAwaiter().GetResult()
 $tutorialInput=[System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($tutorialStream.GetInputStreamAt(0))
 $tutorialFile=Join-Path $tutorialRoot ($tutorialRow.race+'-'+$tutorialRow.key+'.wav')
 $tutorialOutput=[IO.File]::Create($tutorialFile)
 try{$tutorialInput.CopyTo($tutorialOutput)}finally{$tutorialOutput.Dispose();$tutorialInput.Dispose();$tutorialStream.Dispose();$tutorialSynth.Dispose()}
}
Write-Output ('Recorded offline Chinese clips: '+$tutorialPlan.rows.Count)

$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Media.SpeechSynthesis.SpeechSynthesizer,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime]
$tutorialAwaitMethod=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
$tutorialOutput=Join-Path $PSScriptRoot '../reports/local/tutorial-polish-20261109/voice'
[IO.Directory]::CreateDirectory($tutorialOutput) | Out-Null
$tutorialText='移动到目标位置，小队会自动攻击。前往落点，掩护增援。返回旗舰后，安装带回的模块。'
$tutorialRows=@()
foreach($tutorialChoice in @(@{id='adjutant';name='Microsoft Huihui'},@{id='executor';name='Microsoft Kangkang'})){
 $tutorialSynth=[Windows.Media.SpeechSynthesis.SpeechSynthesizer]::new()
 $tutorialVoice=[Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -eq $tutorialChoice.name -and $_.Language -eq 'zh-CN' } | Select-Object -First 1
 if(-not $tutorialVoice){throw ('Missing offline voice: '+$tutorialChoice.name)}
 $tutorialSynth.Voice=$tutorialVoice
 $tutorialTask=$tutorialAwaitMethod.MakeGenericMethod([Windows.Media.SpeechSynthesis.SpeechSynthesisStream]).Invoke($null,@($tutorialSynth.SynthesizeTextToStreamAsync($tutorialText)))
 $tutorialStream=$tutorialTask.GetAwaiter().GetResult()
 $tutorialInput=[System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($tutorialStream.GetInputStreamAt(0))
 $tutorialFile=Join-Path $tutorialOutput ($tutorialChoice.id+'.wav')
 $tutorialDest=[IO.File]::Create($tutorialFile)
 try{$tutorialInput.CopyTo($tutorialDest)}finally{$tutorialDest.Dispose();$tutorialInput.Dispose();$tutorialStream.Dispose();$tutorialSynth.Dispose()}
 $tutorialRows+=@{role=$tutorialChoice.id;voice=$tutorialVoice.DisplayName;text=$tutorialText;file=[IO.Path]::GetFullPath($tutorialFile);source='Installed Windows offline Chinese TTS; generic synthesized voice, not original SC2 actor';sha256=(Get-FileHash -LiteralPath $tutorialFile -Algorithm SHA256).Hash}
}
$tutorialRows | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $tutorialOutput 'samples.json') -Encoding utf8
$tutorialRows | ConvertTo-Json -Depth 5

param(
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\..\..\test\fixtures\transcription\spanish-medical-equipment.wav')
)

$ErrorActionPreference = 'Stop'
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
if (-not $resolvedOutput.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Fixture output must remain inside the repository: $resolvedOutput"
}

[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($resolvedOutput)) | Out-Null
$voice = New-Object -ComObject SAPI.SpVoice
$spanishVoice = @($voice.GetVoices()) | Where-Object { $_.GetDescription() -match 'Spanish' } | Select-Object -First 1
if (-not $spanishVoice) { throw 'No local Spanish SAPI voice is installed.' }

$stream = New-Object -ComObject SAPI.SpFileStream
$stream.Open($resolvedOutput, 3, $false)
try {
  $voice.Voice = $spanishVoice
  $voice.Rate = -1
  $voice.AudioOutputStream = $stream
  [void]$voice.Speak('Observe un escaner de resonancia magnetica NovaMed en radiologia.')
} finally {
  $stream.Close()
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($stream)
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($voice)
}

Write-Output "Generated Spanish synthetic voice fixture at $resolvedOutput"

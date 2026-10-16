param([ValidateSet('manual','rehearsal','after-close','before-shutdown')][string]$Stage='manual')
$ErrorActionPreference='Stop'
$taskState=Join-Path $env:LOCALAPPDATA 'GKTSOlympiadTrial\v1'
$taskConfiguration=Get-Content -Encoding UTF8 -Raw -LiteralPath (Join-Path $taskState 'final-archive-settings.json') | ConvertFrom-Json
$taskNode=(Resolve-Path -LiteralPath $taskConfiguration.nodeExecutable).Path
$taskScript=Join-Path $taskState 'host-supervision\save-final-archive.js'
$taskLogs=Join-Path $taskState 'final-archive-receipts'
New-Item -ItemType Directory -Path $taskLogs -Force | Out-Null
$taskStamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$taskProcess=Start-Process -FilePath $taskNode -ArgumentList @(('"'+$taskScript+'"'),('--stage='+$Stage)) -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput (Join-Path $taskLogs ($taskStamp+'-'+$Stage+'.stdout.log')) -RedirectStandardError (Join-Path $taskLogs ($taskStamp+'-'+$Stage+'.stderr.log'))
if($taskProcess.ExitCode -ne 0){throw ('Final archive failed; see private log. Exit code '+$taskProcess.ExitCode)}

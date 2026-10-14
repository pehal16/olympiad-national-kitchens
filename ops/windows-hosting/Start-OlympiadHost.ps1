param(
    [Parameter(Mandatory = $true)][string]$TrialDirectory,
    [Parameter(Mandatory = $true)][string]$CaddyExecutable,
    [Parameter(Mandatory = $true)][string]$CaddyConfig,
    [Parameter(Mandatory = $true)][string]$SshConfig,
    [Parameter(Mandatory = $true)][string]$RelayPidFile,
    [string]$RelayAlias = 'olympiad-vps-relay'
)

$ErrorActionPreference = 'Stop'
$trial = (Resolve-Path -LiteralPath $TrialDirectory).Path
$nodeExe = (Resolve-Path -LiteralPath (Join-Path $trial 'runtime\node.exe')).Path
$launcher = (Resolve-Path -LiteralPath (Join-Path $trial 'scripts\windows-trial.js')).Path
$caddyExe = (Resolve-Path -LiteralPath $CaddyExecutable).Path
$caddyFile = (Resolve-Path -LiteralPath $CaddyConfig).Path
$sshFile = (Resolve-Path -LiteralPath $SshConfig).Path
$sshExe = (Get-Command ssh.exe -ErrorAction Stop).Source
if ($RelayAlias -notmatch '^[a-zA-Z0-9_-]+$') { throw 'Invalid relay alias.' }
$supervision = Join-Path $env:LOCALAPPDATA 'GKTSOlympiadTrial\v1\host-supervision'
New-Item -ItemType Directory -Path $supervision -Force | Out-Null
$created = $false
$mutex = [System.Threading.Mutex]::new($true, 'Local\GKTSOlympiadDesktopHostV1', [ref]$created)
if (-not $created) { $mutex.Dispose(); return }

function Write-HostEvent([string]$Message) {
    Add-Content -LiteralPath (Join-Path $supervision 'supervisor.log') -Value ((Get-Date -Format o) + ' ' + $Message)
}

function Test-OwnedListener([int]$Port, [string]$Executable) {
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
    if (-not $listeners.Count) { return $false }
    foreach ($listener in $listeners) {
        $process = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $listener.OwningProcess)
        if ($listener.LocalAddress -ne '127.0.0.1' -or -not [string]::Equals($process.ExecutablePath, $Executable, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Port $Port is occupied by an unexpected listener. No process was stopped."
        }
    }
    return $true
}

function Test-OwnedRelay {
    if (-not (Test-Path -LiteralPath $RelayPidFile)) { return $false }
    $relayId = 0
    if (-not [int]::TryParse((Get-Content -Raw -LiteralPath $RelayPidFile).Trim(), [ref]$relayId)) { return $false }
    $process = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $relayId)
    return $process -and [string]::Equals($process.ExecutablePath, $sshExe, [System.StringComparison]::OrdinalIgnoreCase) -and $process.CommandLine.Contains($sshFile) -and $process.CommandLine.Contains($RelayAlias)
}

try {
    $PID | Set-Content -LiteralPath (Join-Path $supervision 'supervisor.pid')
    Write-HostEvent 'Supervisor started. Existing matching processes are retained.'
    while ($true) {
        try {
            if (-not (Test-OwnedListener 3100 $nodeExe)) {
                $nodeProcess = Start-Process -FilePath $nodeExe -ArgumentList @(('"' + $launcher + '"')) -WorkingDirectory $trial -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $supervision 'app.stdout.log') -RedirectStandardError (Join-Path $supervision 'app.stderr.log')
                Write-HostEvent ('Started olympiad application PID ' + $nodeProcess.Id)
            }
            $health = Invoke-RestMethod 'http://127.0.0.1:3100/api/health' -TimeoutSec 4
            if (-not $health.ok -or $health.storage -ne 'sqlite' -or $health.mode -ne 'olympiad-only') { throw 'Unexpected application health.' }
            if (-not (Test-OwnedListener 3180 $caddyExe)) {
                if (Get-NetTCPConnection -State Listen -LocalPort 3181 -ErrorAction SilentlyContinue) { throw 'Caddy admin port is already occupied.' }
                $caddyProcess = Start-Process -FilePath $caddyExe -ArgumentList @('run','--config',('"' + $caddyFile + '"'),'--adapter','caddyfile') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $supervision 'caddy.stdout.log') -RedirectStandardError (Join-Path $supervision 'caddy.stderr.log')
                Write-HostEvent ('Started loopback proxy PID ' + $caddyProcess.Id)
            }
            if (-not (Test-OwnedRelay)) {
                $relayProcess = Start-Process -FilePath $sshExe -ArgumentList @('-F',('"' + $sshFile + '"'),'-N','-T',$RelayAlias) -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $supervision 'ssh.stdout.log') -RedirectStandardError (Join-Path $supervision 'ssh.stderr.log')
                $relayProcess.Id | Set-Content -LiteralPath $RelayPidFile
                Write-HostEvent ('Started relay PID ' + $relayProcess.Id)
            }
        } catch {
            Write-HostEvent ('Component check failed: ' + $_.Exception.Message)
        }
        Start-Sleep -Seconds 15
    }
} finally {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}

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

function Start-OwnedApplication {
    $environmentNames = @('HTTPS_PROXY', 'NODE_USE_ENV_PROXY', 'NO_PROXY')
    $previousEnvironment = @{}
    foreach ($name in $environmentNames) { $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
    try {
        $hostingFile = Join-Path $env:LOCALAPPDATA 'GKTSOlympiadTrial\v1\hosting-settings.json'
        $sharing = (Test-Path -LiteralPath $hostingFile) -and (Get-Content -Raw -LiteralPath $hostingFile | ConvertFrom-Json).publicApiOrigin -eq 'https://olympiad-gkts.pages.dev'
        if ($sharing) {
            $windowsProxy = Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -ErrorAction SilentlyContinue
            if ($windowsProxy.ProxyEnable -eq 1 -and $windowsProxy.ProxyServer -match '^(127\.0\.0\.1|localhost):([0-9]{1,5})$' -and [int]$Matches[2] -ge 1 -and [int]$Matches[2] -le 65535) {
                # Respect this user's existing loopback HTTP proxy for the child
                # Node process only; never change Windows or TLS trust settings.
                $env:HTTPS_PROXY = 'http://' + $windowsProxy.ProxyServer
                $env:NODE_USE_ENV_PROXY = '1'
                $env:NO_PROXY = '127.0.0.1,localhost,::1' + $(if ($previousEnvironment.NO_PROXY) { ',' + $previousEnvironment.NO_PROXY } else { '' })
                Write-HostEvent 'Using the configured Windows loopback proxy for the shared API.'
            }
        }
        Start-Process -FilePath $nodeExe -ArgumentList @(('"' + $launcher + '"'), '--no-browser') -WorkingDirectory $trial -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $supervision 'app.stdout.log') -RedirectStandardError (Join-Path $supervision 'app.stderr.log')
    } finally {
        foreach ($name in $environmentNames) { [Environment]::SetEnvironmentVariable($name, $previousEnvironment[$name], 'Process') }
    }
}

try {
    $PID | Set-Content -LiteralPath (Join-Path $supervision 'supervisor.pid')
    Write-HostEvent 'Supervisor started. Existing matching processes are retained.'
    while ($true) {
        try {
            if (-not (Test-OwnedListener 3100 $nodeExe)) {
                $nodeProcess = Start-OwnedApplication
                Write-HostEvent ('Started olympiad application PID ' + $nodeProcess.Id)
            }
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
            # Shared mode relays health to Pages. Keep proxy/SSH recovery
            # independent of upstream availability, and accept both known modes.
            $health = Invoke-RestMethod 'http://127.0.0.1:3100/api/health' -TimeoutSec 4
            $localMode = $health.storage -eq 'sqlite' -and $health.mode -eq 'olympiad-only'
            $sharedMode = $health.storageBackend -eq 'cloudflare' -and $health.app -eq 'national-kitchens-olympiad'
            if (-not $health.ok -or -not ($localMode -or $sharedMode)) { throw 'Unexpected application health.' }
        } catch {
            Write-HostEvent ('Component check failed: ' + $_.Exception.Message)
        }
        Start-Sleep -Seconds 15
    }
} finally {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}

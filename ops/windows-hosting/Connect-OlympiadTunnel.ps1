param(
    [Parameter(Mandatory = $true)][string]$SshConfig,
    [string]$RelayAlias = 'olympiad-vps-relay',
    [switch]$Once
)

$ErrorActionPreference = 'Stop'
if ($RelayAlias -notmatch '^[a-zA-Z0-9_-]+$') { throw 'Invalid relay alias.' }
$ssh = (Get-Command ssh.exe -ErrorAction Stop).Source
$config = (Resolve-Path -LiteralPath $SshConfig -ErrorAction Stop).Path
$sshArguments = @(
    '-F', $config, '-N', '-T',
    '-o', 'BatchMode=yes',
    '-o', 'StrictHostKeyChecking=yes',
    '-o', 'ExitOnForwardFailure=yes',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ServerAliveCountMax=3',
    '-o', 'ConnectTimeout=15',
    '-o', 'ForwardAgent=no',
    $RelayAlias
)

# The private SSH config supplies the verified identity, host-key pin and the
# exact loopback RemoteForward. Run only after the account/ingress are checked.
# This script never opens a public socket or reads the olympiad's database/secrets.
do {
    & $ssh @sshArguments
    $sshExit = $LASTEXITCODE
    if ($Once) { exit $sshExit }
    Write-Warning "Relay connection ended (SSH exit $sshExit). Retrying in 15 seconds."
    Start-Sleep -Seconds 15
} while ($true)

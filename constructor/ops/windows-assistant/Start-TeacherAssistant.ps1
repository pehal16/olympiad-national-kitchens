[CmdletBinding()]
param(
    [ValidateSet('Preflight', 'Install', 'Check', 'Connect', 'Run', 'Stop')]
    [string]$Mode = 'Preflight',
    [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'GKTSOllamaAssistant'),
    [string]$NodeExe,
    [string]$CabinetOrigin,
    [string]$CabinetInterface,
    [Security.SecureString]$CabinetCredential
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$port = 11435
$api = "http://127.0.0.1:$port/api"
$version = '0.40.17'
$model = 'qwen3.5:9b-q4_K_M'
$expectedHash = '3DD80F6E3A9699F2EADF4AC418F00529CEE594DF9557541806EDA1F1F3F5588A'
$asset = 'ollama-windows-amd64.zip'
$downloadUrl = "https://github.com/ollama/ollama/releases/download/v$version/$asset"
$taskName = 'GKTS-TeacherAssistant-Ollama'
$root = [IO.Path]::GetFullPath($InstallDir)
if ($root -notmatch '^[A-Za-z]:\\.+') { throw 'Укажите отдельный каталог на локальном диске.' }
$runtime = Join-Path $root "ollama-$version"
$exe = Join-Path $runtime 'ollama.exe'
$models = Join-Path $root 'models'
$logs = Join-Path $root 'logs'
$configPath = Join-Path $root 'settings.json'
$secretPath = Join-Path $root 'worker-key.dpapi'
$app = Join-Path $root 'app'
$installedScripts = Join-Path $app 'ops\windows-assistant'
$installedStarter = Join-Path $installedScripts 'Start-TeacherAssistant.ps1'
$workerScript = Join-Path $installedScripts 'worker.mjs'
$principal = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$gpuUtility = (Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue).Source
$gpuReport = if ($gpuUtility) {
    & $gpuUtility --query-gpu=name,driver_version,memory.total --format=csv,noheader
}
$targetGpu = $gpuReport | Where-Object { $_ -match '^NVIDIA GeForce RTX 5070\s*,' } | Select-Object -First 1
if (-not $targetGpu) {
    throw "Ожидается стационарный iRU с RTX 5070. Текущий компьютер: $env:COMPUTERNAME. Установка остановлена."
}

function Find-Node {
    if ($NodeExe) {
        $candidate = (Resolve-Path -LiteralPath $NodeExe).Path
    } else {
        $globalNode = Get-Command node.exe -ErrorAction SilentlyContinue
        if ($globalNode) { $candidate = $globalNode.Source }
        if (-not $candidate) {
            $candidate = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
                Where-Object ExecutablePath -Match '\\runtime\\node\.exe$' |
                Select-Object -ExpandProperty ExecutablePath -First 1
        }
    }
    if (-not $candidate) { throw 'Нужен Node.js 24. Укажите путь к node.exe из Windows-комплекта олимпиады через -NodeExe.' }
    $nodeVersion = & $candidate --version
    if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v(2[4-9]|[3-9][0-9])\.') {
        throw 'Для рабочего процесса нужен Node.js версии 24 или новее.'
    }
    return $candidate
}

function Get-OwnedServer {
    $listening = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
    if ($listening.Count -eq 0) { return $null }
    if ($listening.Count -ne 1 -or $listening[0].LocalAddress -ne '127.0.0.1') {
        throw "Порт $port занят другим слушателем. Проверьте привязки."
    }
    $process = Get-Process -Id $listening[0].OwningProcess -ErrorAction Stop
    if ($process.Path -ne $exe) { throw "Порт $port занят другим приложением." }
    return $process
}

function Start-LocalServer {
    $process = Get-OwnedServer
    if (-not $process) {
        $env:OLLAMA_HOST = "127.0.0.1:$port"
        $env:OLLAMA_MODELS = $models
        $env:OLLAMA_NO_CLOUD = '1'
        $env:OLLAMA_ORIGINS = 'http://127.0.0.1'
        $env:OLLAMA_NUM_PARALLEL = '1'
        $env:OLLAMA_MAX_LOADED_MODELS = '1'
        $process = Start-Process -FilePath $exe -ArgumentList 'serve' -WorkingDirectory $root -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput (Join-Path $logs 'ollama.stdout.log') -RedirectStandardError (Join-Path $logs 'ollama.stderr.log')
    }
    for ($attempt = 0; $attempt -lt 25; $attempt++) {
        if ($process.HasExited) { throw "Ollama завершилась. Журнал: $logs" }
        $owner = Get-OwnedServer
        if ($owner -and $owner.Id -eq $process.Id) {
            try { $response = Invoke-RestMethod -Uri "$api/version" -TimeoutSec 2 } catch { $response = $null }
            if ($response.version -eq $version) { return $process }
            if ($response.version) { throw "Ожидалась Ollama $version." }
        }
        Start-Sleep -Seconds 1
    }
    throw "Ollama не ответила. Журнал: $logs"
}

function Read-Config {
    if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) { throw 'Сначала выполните -Mode Install.' }
    return Get-Content -LiteralPath $configPath -Encoding UTF8 -Raw | ConvertFrom-Json
}

function Save-Config($config) {
    $config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
}

function Test-Assistant($config) {
    $env:GKTS_ASSISTANT_MODEL = $model
    $receipt = Join-Path $root 'pilot-report.json'
    $sample = & $config.nodeExe $workerScript --check
    if ($LASTEXITCODE -ne 0) { throw 'Ollama не прошла проверку контрольного запроса. См. сообщение выше.' }
    $readback = $sample | Out-String | ConvertFrom-Json
    [pscustomobject]@{
        computer = $env:COMPUTERNAME
        gpu = $targetGpu
        checkedAtUtc = [DateTime]::UtcNow.ToString('o')
        listener = "127.0.0.1:$port"
        inference = $readback
    } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $receipt -Encoding UTF8
    Get-Content -LiteralPath $receipt -Encoding UTF8
}

function Test-TaskOwner {
    $existing = Get-ScheduledTask -TaskName $taskName -TaskPath '\' -ErrorAction SilentlyContinue
    if ($existing -and ($existing.Actions.Count -ne 1 -or
        -not $existing.Actions[0].Arguments.Contains('"' + $installedStarter + '"') -or
        $existing.Principal.UserId -notin @($principal, $env:USERNAME, [Security.Principal.WindowsIdentity]::GetCurrent().User.Value))) {
        throw "Уже есть задача $taskName с другим каталогом или пользователем."
    }
    return $existing
}

function Stop-OwnedWorker($config) {
    if (-not $config.origin) { return }
    $scriptArgument = '"' + $workerScript + '"'
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
        Where-Object { $_.ExecutablePath -eq $config.nodeExe -and
            $_.CommandLine -and $_.CommandLine.Contains($scriptArgument) -and
            $_.CommandLine.TrimEnd().EndsWith(' --work') } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
}

function Register-Assistant {
    $existing = Test-TaskOwner
    if ($existing -and $existing.State -eq 'Running') { return }
    $launcher = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + $installedStarter + '" -Mode Run -InstallDir "' + $root + '"'
    $action = New-ScheduledTaskAction -Execute $launcher -Argument $arguments -WorkingDirectory $root
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $principal
    $identity = New-ScheduledTaskPrincipal -UserId $principal -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) `
        -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName $taskName -TaskPath '\' -Action $action -Trigger $trigger `
        -Principal $identity -Settings $settings -Force | Out-Null
    Start-ScheduledTask -TaskName $taskName -TaskPath '\'
}

if ($Mode -eq 'Preflight') {
    $drive = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($root))
    [pscustomobject]@{ Computer = $env:COMPUTERNAME; GPU = $targetGpu; Node = Find-Node
        InstallDir = $root; FreeGiB = [Math]::Round($drive.AvailableFreeSpace / 1GB, 1); Ollama = $version; Model = $model }
    Get-OwnedServer | Select-Object Id, Path
    return
}

if ($Mode -eq 'Install') {
    $candidate = Find-Node
    Test-TaskOwner | Out-Null
    Get-OwnedServer | Out-Null
    New-Item -ItemType Directory -Path $root, $runtime, $models, $logs, $installedScripts, (Join-Path $app 'shared') -Force | Out-Null
    $archive = Join-Path $root $asset
    $marker = Join-Path $runtime 'archive.sha256.txt'
    if (-not ((Test-Path -LiteralPath $exe -PathType Leaf) -and (Test-Path -LiteralPath $marker -PathType Leaf) -and
        ((Get-Content -LiteralPath $marker -Raw).Trim() -eq $expectedHash))) {
        $drive = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($root))
        if ($drive.AvailableFreeSpace -lt 16GB) { throw 'Для новой установки нужно минимум 16 ГиБ свободного места на диске.' }
        if (-not (Test-Path -LiteralPath $archive -PathType Leaf) -or (Get-Item -LiteralPath $archive).Length -lt 1618522644) {
            & curl.exe --fail --location --retry 3 --retry-delay 3 --connect-timeout 15 --speed-limit 16384 --speed-time 90 --continue-at - --output $archive $downloadUrl
            if ($LASTEXITCODE -ne 0) { throw "Загрузка прервана. Повторный запуск продолжит загрузку: $archive" }
        }
        if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expectedHash) {
            throw "Архив Ollama не совпал с SHA-256 официального выпуска. Проверьте файл: $archive"
        }
        & tar.exe -xf $archive -C $runtime
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $exe -PathType Leaf)) { throw 'Не удалось распаковать Ollama.' }
        $expectedHash | Set-Content -LiteralPath $marker -Encoding ASCII
    }
    $sources = @{
        $PSCommandPath = $installedStarter
        (Join-Path $PSScriptRoot 'worker.mjs') = $workerScript
        (Join-Path $PSScriptRoot '..\..\shared\assistant.mjs') = (Join-Path $app 'shared\assistant.mjs')
        (Join-Path $PSScriptRoot '..\..\shared\assistant-work.mjs') = (Join-Path $app 'shared\assistant-work.mjs')
        (Join-Path $PSScriptRoot '..\..\shared\assistant-chat.mjs') = (Join-Path $app 'shared\assistant-chat.mjs')
    }
    foreach ($source in $sources.Keys) {
        $resolved = (Resolve-Path -LiteralPath $source).Path
        if ($resolved -ne $sources[$source]) { Copy-Item -LiteralPath $resolved -Destination $sources[$source] -Force }
    }
    $config = if (Test-Path -LiteralPath $configPath) { Read-Config } else {
        [pscustomobject]@{ nodeExe = ''; origin = '' }
    }
    $config.nodeExe = $candidate
    Save-Config $config
    $server = Start-LocalServer
    $env:OLLAMA_HOST = "127.0.0.1:$port"
    $installed = (Invoke-RestMethod -Uri "$api/tags" -TimeoutSec 5).models | Where-Object Name -EQ $model
    if (-not $installed) {
        & $exe pull $model
        if ($LASTEXITCODE -ne 0) { throw 'Не удалось загрузить модель. Повторите установку, чтобы продолжить.' }
    }
    Test-Assistant $config
    Register-Assistant
    return
}

if ($Mode -eq 'Stop') {
    $task = Test-TaskOwner
    if ($task) {
        Disable-ScheduledTask -InputObject $task | Out-Null
        if ($task.State -eq 'Running') { Stop-ScheduledTask -InputObject $task }
    }
    if (Test-Path -LiteralPath $configPath) { Stop-OwnedWorker (Read-Config) }
    $process = Get-OwnedServer
    if ($process) { Stop-Process -InputObject $process }
    return
}

$config = Read-Config
if ($Mode -eq 'Check') {
    Start-LocalServer | Out-Null
    Test-Assistant $config
    return
}

if ($Mode -eq 'Connect') {
    $task = Test-TaskOwner
    $uri = [Uri]$CabinetOrigin
    if (-not $uri.IsAbsoluteUri -or $uri.Scheme -ne 'https' -or $uri.UserInfo -or
        $uri.AbsolutePath -ne '/' -or $uri.Query -or $uri.Fragment) {
        throw 'Укажите HTTPS-адрес кабинета без пути, параметров и учётных данных.'
    }
    if ($CabinetInterface) {
        $addresses = Get-NetIPAddress -InterfaceAlias $CabinetInterface -AddressFamily IPv4 -AddressState Preferred -ErrorAction SilentlyContinue
        if (-not ($addresses | Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' })) {
            throw 'На выбранном сетевом интерфейсе нет адреса IPv4.'
        }
    }
    $credential = if ($CabinetCredential) { $CabinetCredential } else { Read-Host 'Рабочий ключ помощника' -AsSecureString }
    if ($credential.Length -ne 43) { throw 'Рабочий ключ должен содержать 43 символа.' }
    $config.origin = $uri.GetLeftPart([UriPartial]::Authority)
    $config | Add-Member -NotePropertyName cabinetInterface -NotePropertyValue $CabinetInterface -Force
    $credential | ConvertFrom-SecureString | Set-Content -LiteralPath $secretPath -Encoding ASCII
    Save-Config $config
    if ($task -and $task.State -eq 'Running') {
        Stop-ScheduledTask -InputObject $task
        for ($attempt = 0; $attempt -lt 30 -and (Test-TaskOwner).State -eq 'Running'; $attempt++) {
            Start-Sleep -Milliseconds 200
        }
        if ((Test-TaskOwner).State -eq 'Running') { throw 'Задача помощника не остановилась для подключения.' }
    }
    Stop-OwnedWorker $config
    if ($task) {
        if (-not $task.Settings.Enabled) { Enable-ScheduledTask -InputObject $task | Out-Null }
        Start-ScheduledTask -TaskName $taskName -TaskPath '\'
    } else {
        Register-Assistant
    }
    return
}

$node = $null
try {
    $server = Start-LocalServer
    if ($config.origin) {
        $env:GKTS_ASSISTANT_MODEL = $model
        $env:GKTS_ASSISTANT_ORIGIN = $config.origin
        $env:GKTS_ASSISTANT_INTERFACE = $config.cabinetInterface
        $credential = (Get-Content -LiteralPath $secretPath -Raw).Trim() | ConvertTo-SecureString
        $env:GKTS_ASSISTANT_TOKEN = [Net.NetworkCredential]::new('', $credential).Password
        try {
            $node = Start-Process -FilePath $config.nodeExe -ArgumentList @(('"' + $workerScript + '"'), '--work') `
                -WorkingDirectory $root -WindowStyle Hidden -PassThru `
                -RedirectStandardOutput (Join-Path $logs 'worker.stdout.log') -RedirectStandardError (Join-Path $logs 'worker.stderr.log')
        } finally {
            Remove-Item Env:GKTS_ASSISTANT_TOKEN
        }
    }
    while ($true) {
        if ($node -and $node.HasExited) { throw "Рабочий процесс завершился. Журнал: $logs" }
        if ($server.HasExited) { $server = Start-LocalServer }
        Start-Sleep -Seconds 5
    }
} finally {
    if ($node -and -not $node.HasExited) { Stop-Process -InputObject $node }
}

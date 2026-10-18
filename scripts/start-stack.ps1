# Démarre Spring Boot (:8080) + React/Vite (:5173) en arrière-plan.
# Usage:
#   .\scripts\start-stack.ps1
#   .\scripts\start-stack.ps1 -NoBrowser
#   npm run stack:start

param(
    [switch]$NoBrowser,
    [int]$ApiPort = 8080,
    [int]$WebPort = 5173
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$springDir = Join-Path $projectRoot "spring-boot"
$logsDir = Join-Path $projectRoot ".tmp\logs"
$pidFile = Join-Path $projectRoot ".tmp\stack.pids"
$envFile = Join-Path $springDir ".env"

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

function Get-PortPids {
    param([int]$LocalPort)
    @(
        Get-NetTCPConnection -LocalPort $LocalPort -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique |
            Where-Object { $_ -and $_ -gt 0 }
    )
}

function Stop-PortListeners {
    param([int]$LocalPort)
    $pids = Get-PortPids -LocalPort $LocalPort
    foreach ($procId in $pids) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        Write-Host "Port $LocalPort libéré (PID $procId)"
    }
}

function Import-DotEnv {
    param([string]$Path)
    Get-Content -Path $Path -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $eq = $line.IndexOf("=")
        if ($eq -lt 1) { return }
        $key = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1).Trim()
        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        Set-Item -Path "Env:$key" -Value $value
    }
}

function Ensure-JavaHome {
    if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
        return
    }
    $candidates = @(
        Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like "jdk-21*" }
        Get-ChildItem "C:\Program Files\Java" -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like "jdk-21*" -or $_.Name -like "jdk-17*" }
    )
    $jdk = $candidates | Select-Object -First 1
    if (-not $jdk) {
        throw "JAVA_HOME introuvable. Installe Temurin JDK 21 ou définis JAVA_HOME."
    }
    $env:JAVA_HOME = $jdk.FullName
    $env:PATH = "$($jdk.FullName)\bin;$env:PATH"
    Write-Host "JAVA_HOME=$($env:JAVA_HOME)"
}

if (-not (Test-Path $envFile)) {
    $example = Join-Path $springDir ".env.example"
    if (-not (Test-Path $example)) {
        throw "Fichier manquant : spring-boot\.env.example"
    }
    Copy-Item -Path $example -Destination $envFile -Force
    Write-Host "Créé spring-boot\.env depuis .env.example"
    Write-Host "IMPORTANT : renseigne SPRING_DATASOURCE_PASSWORD (et l’URL Supabase) dans spring-boot\.env"
}

# Sanity check : placeholders cloud non remplacés / password vide
$rawEnv = Get-Content -Path $envFile -Raw -Encoding UTF8
if ($rawEnv -match "db\.<PROJECT_REF>") {
    Write-Host ""
    Write-Host "ATTENTION : SPRING_DATASOURCE_URL contient encore <PROJECT_REF>."
    Write-Host "Pour le local : jdbc:postgresql://127.0.0.1:15422/postgres (supabase start)"
    Write-Host ""
    throw "Configuration DB incomplète dans spring-boot\.env"
}
if ($rawEnv -match "(?m)^SPRING_DATASOURCE_PASSWORD=\s*(\r?\n|$)") {
    Write-Host ""
    Write-Host "ATTENTION : SPRING_DATASOURCE_PASSWORD est vide."
    Write-Host "Supabase local : password = postgres"
    Write-Host ""
    throw "Configuration DB incomplète dans spring-boot\.env"
}

Ensure-JavaHome
Import-DotEnv -Path $envFile

# Vérifie que Postgres local (Supabase) répond si l’URL pointe sur loopback
if ($env:SPRING_DATASOURCE_URL -match "jdbc:postgresql://([^:/]+):(\d+)") {
    $dbHost = $Matches[1]
    $dbPort = [int]$Matches[2]
    if ($dbHost -eq "127.0.0.1" -or $dbHost -eq "localhost") {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.ReceiveTimeout = 2000
            $tcp.Connect($dbHost, $dbPort)
            $tcp.Close()
        } catch {
            throw "Postgres local injoignable sur ${dbHost}:${dbPort}. Lance d'abord : npm run supabase:start"
        }
    }
}

# Force profil local raisonnable si absent
if (-not $env:SPRING_PROFILES_ACTIVE) { $env:SPRING_PROFILES_ACTIVE = "dev" }
if (-not $env:SERVER_PORT) { $env:SERVER_PORT = "$ApiPort" }

Write-Host "Arrêt éventuel des processus sur :$ApiPort et :$WebPort..."
Stop-PortListeners -LocalPort $ApiPort
Stop-PortListeners -LocalPort $WebPort
Start-Sleep -Milliseconds 500

$apiOut = Join-Path $logsDir "spring-boot.out.log"
$apiErr = Join-Path $logsDir "spring-boot.err.log"
$webOut = Join-Path $logsDir "vite.out.log"
$webErr = Join-Path $logsDir "vite.err.log"

# Évite le lock Windows si un ancien process tient encore le fichier
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
foreach ($f in @($apiOut, $apiErr, $webOut, $webErr)) {
    if (Test-Path $f) {
        try {
            Move-Item -Path $f -Destination ($f -replace '\.log$', ".$stamp.log") -Force -ErrorAction Stop
        } catch {
            # laisse l'ancien fichier ; Start-Process créera/écrira en append via redirection
        }
    }
}

Write-Host "Démarrage Spring Boot (arrière-plan)..."
$api = Start-Process `
    -FilePath (Join-Path $springDir "gradlew.bat") `
    -ArgumentList @("bootRun", "--no-daemon") `
    -WorkingDirectory $springDir `
    -RedirectStandardOutput $apiOut `
    -RedirectStandardError $apiErr `
    -PassThru `
    -WindowStyle Hidden

Write-Host "Démarrage React/Vite (arrière-plan)..."
$npmCmd = $null
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($npm) { $npmCmd = $npm.Source }
if (-not $npmCmd) { $npmCmd = "npm.cmd" }

$web = Start-Process `
    -FilePath $npmCmd `
    -ArgumentList @("run", "dev", "--", "--port", "$WebPort", "--strictPort") `
    -WorkingDirectory $projectRoot `
    -RedirectStandardOutput $webOut `
    -RedirectStandardError $webErr `
    -PassThru `
    -WindowStyle Hidden

@"
apiPid=$($api.Id)
webPid=$($web.Id)
apiPort=$ApiPort
webPort=$WebPort
startedAt=$(Get-Date -Format o)
"@ | Set-Content -Path $pidFile -Encoding UTF8

Write-Host ""
Write-Host "Stack lancée en arrière-plan."
Write-Host "  API  : http://localhost:$ApiPort  (PID $($api.Id))"
Write-Host "  Web  : http://localhost:$WebPort  (PID $($web.Id))"
Write-Host "  Logs : $logsDir"
Write-Host "  Stop : .\scripts\stop-stack.ps1   ou  npm run stack:stop"
Write-Host ""

if (-not $NoBrowser) {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:$WebPort"
}

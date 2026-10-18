# Arrête Spring Boot + React démarrés via start-stack.ps1.
# Usage:
#   .\scripts\stop-stack.ps1
#   npm run stack:stop

param(
    [int]$ApiPort = 8080,
    [int]$WebPort = 5173
)

$ErrorActionPreference = "SilentlyContinue"
$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot ".tmp\stack.pids"

function Stop-PortListeners {
    param([int]$LocalPort)
    $pids = @(
        Get-NetTCPConnection -LocalPort $LocalPort -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique |
            Where-Object { $_ -and $_ -gt 0 }
    )
    foreach ($procId in $pids) {
        $name = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        if ($name) {
            Write-Host "Arrêté PID $procId ($name) sur :$LocalPort"
        } else {
            Write-Host "Arrêté PID $procId sur :$LocalPort"
        }
    }
}

if (Test-Path $pidFile) {
    Get-Content $pidFile | ForEach-Object {
        if ($_ -match '^(apiPid|webPid)=(\d+)$') {
            $procId = [int]$Matches[2]
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Host "Arrêté PID $procId ($($Matches[1]))"
            # Gradle spawn souvent un processus Java enfant : on nettoie aussi les ports.
        }
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

Stop-PortListeners -LocalPort $ApiPort
Stop-PortListeners -LocalPort $WebPort

Write-Host "Stack arrêtée."

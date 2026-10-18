# Free the Vite port (default 5173) and start / restart the dev server.
# Usage:
#   .\scripts\dev.ps1           # free port + npm run dev
#   .\scripts\dev.ps1 -KillOnly # free port only
#   .\scripts\dev.ps1 -Port 5174

param(
    [int]$Port = 5173,
    [switch]$KillOnly
)

$ErrorActionPreference = "SilentlyContinue"

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
    if (-not $pids -or $pids.Count -eq 0) {
        Write-Host "Port $LocalPort already free."
        return
    }

    foreach ($procId in $pids) {
        $name = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        if ($name) {
            Write-Host "Freed port $LocalPort (PID: $procId, $name)"
        } else {
            Write-Host "Freed port $LocalPort (PID: $procId)"
        }
    }

    Start-Sleep -Milliseconds 400
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Stop-PortListeners -LocalPort $Port

if ($KillOnly) {
    exit 0
}

Write-Host "Starting Vite on port $Port..."
npm run dev -- --port $Port

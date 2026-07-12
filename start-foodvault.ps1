$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendScript = Join-Path $ProjectRoot "start-backend.ps1"
$FrontendScript = Join-Path $ProjectRoot "start-frontend.ps1"

Write-Host "Starting FoodVault backend and frontend..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$BackendScript`""
)

Start-Sleep -Seconds 3

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$FrontendScript`""
)

Write-Host "Backend:  http://localhost:8010" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Health:   http://localhost:8010/health" -ForegroundColor Green

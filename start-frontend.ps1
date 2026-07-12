$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $ProjectRoot "frontend"
$NodeModules = Join-Path $FrontendDir "node_modules"
$SyncEnvScript = Join-Path $ProjectRoot "sync-frontend-env.ps1"

Write-Host "Starting FoodVault frontend on http://localhost:5173" -ForegroundColor Cyan

if (Test-Path $SyncEnvScript) {
    Write-Host "Syncing frontend environment from backend/.env..." -ForegroundColor Yellow
    & $SyncEnvScript
}

Set-Location $FrontendDir

if (-not (Test-Path $NodeModules)) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Launching frontend..." -ForegroundColor Green
npm run dev

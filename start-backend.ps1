$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ProjectRoot "backend"
$VenvDir = Join-Path $BackendDir ".venv"
$ActivateScript = Join-Path $VenvDir "Scripts\Activate.ps1"

Write-Host "Starting FoodVault backend on http://localhost:8010" -ForegroundColor Cyan
Set-Location $BackendDir

if (-not (Test-Path $VenvDir)) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
}

if (-not (Test-Path $ActivateScript)) {
    throw "Virtual environment activation script not found: $ActivateScript"
}

. $ActivateScript

Write-Host "Installing/updating backend dependencies..." -ForegroundColor Yellow
python -m pip install -r requirements.txt

Write-Host "Launching backend..." -ForegroundColor Green
python -m uvicorn main:app --host 127.0.0.1 --port 8010 --reload

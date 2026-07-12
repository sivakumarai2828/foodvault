$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogPath = Join-Path $ProjectRoot "backend\logs\foodvault-ai.log"

Write-Host "Checking FoodVault AI log:" -ForegroundColor Cyan
Write-Host $LogPath
Write-Host ""

if (-not (Test-Path $LogPath)) {
    Write-Host "Log file does not exist yet." -ForegroundColor Yellow
    Write-Host "Restart backend, run an AI action, then run this script again." -ForegroundColor Yellow
    exit 1
}

$logs = Get-Content $LogPath -Tail 200

$configured = $logs | Select-String "ai_gateway_configured gateway=omniroute"
$success = $logs | Select-String "ai_request_success gateway=omniroute"
$failed = $logs | Select-String "ai_request_failed gateway=omniroute"

Write-Host "OmniRoute configured log found: $([bool]$configured)"
Write-Host "OmniRoute success call found   : $([bool]$success)"
Write-Host "OmniRoute failed call found    : $([bool]$failed)"
Write-Host ""

if ($configured) {
    Write-Host "Last OmniRoute config log:" -ForegroundColor Green
    $configured[-1].Line
    Write-Host ""
}

if ($success) {
    Write-Host "Last successful OmniRoute AI call:" -ForegroundColor Green
    $success[-1].Line
    Write-Host ""
    Write-Host "Result: FoodVault is calling OmniRoute successfully." -ForegroundColor Green
    exit 0
}

if ($failed) {
    Write-Host "Last failed OmniRoute AI call:" -ForegroundColor Red
    $failed[-1].Line
    Write-Host ""
    Write-Host "Result: FoodVault is trying to call OmniRoute, but the call failed. Check OmniRoute service/key." -ForegroundColor Red
    exit 2
}

Write-Host "No OmniRoute AI calls found yet." -ForegroundColor Yellow
Write-Host "Run an AI action such as Add Recipe Extract, AI Chat, or .\test-omniroute.ps1, then check again." -ForegroundColor Yellow

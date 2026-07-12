$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendEnvPath = Join-Path $ProjectRoot "backend\.env"
$FrontendEnvPath = Join-Path $ProjectRoot "frontend\.env"
$FrontendEnvLocalPath = Join-Path $ProjectRoot "frontend\.env.local"

function Read-DotEnv($Path) {
    $values = @{}
    if (-not (Test-Path $Path)) {
        return $values
    }

    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $idx = $line.IndexOf("=")
        if ($idx -le 0) { return }
        $key = $line.Substring(0, $idx).Trim()
        $value = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
        $values[$key] = $value
    }
    return $values
}

function Has-Value($Map, $Key) {
    return [bool]($Map.ContainsKey($Key) -and $Map[$Key])
}

$backend = Read-DotEnv $BackendEnvPath
$frontend = Read-DotEnv $FrontendEnvPath
$frontendLocal = Read-DotEnv $FrontendEnvLocalPath

Write-Host "FoodVault environment check" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"
Write-Host ""

Write-Host "Files" -ForegroundColor Yellow
Write-Host "backend\.env        : $(Test-Path $BackendEnvPath)"
Write-Host "frontend\.env       : $(Test-Path $FrontendEnvPath)"
Write-Host "frontend\.env.local : $(Test-Path $FrontendEnvLocalPath)"
Write-Host ""

Write-Host "Backend required values" -ForegroundColor Yellow
Write-Host "SUPABASE_URL        : $(Has-Value $backend 'SUPABASE_URL')"
Write-Host "SUPABASE_KEY        : $(Has-Value $backend 'SUPABASE_KEY')"
Write-Host "OMNIROUTE_BASE_URL  : $(Has-Value $backend 'OMNIROUTE_BASE_URL')"
Write-Host "OMNIROUTE_API_KEY   : $(Has-Value $backend 'OMNIROUTE_API_KEY')"
Write-Host ""

Write-Host "Frontend Vite values" -ForegroundColor Yellow
$frontUrl = (Has-Value $frontendLocal 'VITE_SUPABASE_URL') -or (Has-Value $frontend 'VITE_SUPABASE_URL')
$frontKey = (Has-Value $frontendLocal 'VITE_SUPABASE_ANON_KEY') -or (Has-Value $frontend 'VITE_SUPABASE_ANON_KEY')
Write-Host "VITE_SUPABASE_URL      : $frontUrl"
Write-Host "VITE_SUPABASE_ANON_KEY : $frontKey"
Write-Host ""

if ($frontUrl -and $frontKey -and (Has-Value $backend 'SUPABASE_URL') -and (Has-Value $backend 'OMNIROUTE_API_KEY')) {
    Write-Host "Status: Looks good. Restart backend/frontend if either was already running." -ForegroundColor Green
} else {
    Write-Host "Status: Missing one or more values. Run .\sync-frontend-env.ps1 or update env files." -ForegroundColor Red
}

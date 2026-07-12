$ErrorActionPreference = "Stop"

$BackendBase = "http://localhost:8010"
$Url = "https://www.instagram.com/reel/test-foodvault-omniroute/"
$Caption = @"
Paneer Butter Masala

Ingredients:
- 250g paneer cubes
- 2 tbsp butter
- 1 onion chopped
- 2 tomatoes chopped
- 8 cashews
- 1 tsp ginger garlic paste
- 1 tsp red chili powder
- 1 tsp garam masala
- 1/2 cup cream
- Salt to taste

Steps:
1. Saute onion, tomatoes, cashews, and ginger garlic paste in butter.
2. Blend into a smooth paste.
3. Cook with spices for 5 minutes.
4. Add paneer and cream.
5. Simmer and serve hot.
"@

Write-Host "Checking backend health (with live OmniRoute probe)..." -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "$BackendBase/health?probe=true" -Method Get
$health | ConvertTo-Json

if (-not $health.ai_ready) {
    throw "Backend says ai_ready=false. Check backend/.env OMNIROUTE_API_KEY and restart backend."
}

if (-not $health.ai_reachable) {
    throw "OmniRoute is not reachable from the backend. Make sure OmniRoute is running on port 20128."
}

Write-Host "Calling recipe extraction. This should hit OmniRoute through AIGateway..." -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "$BackendBase/api/extract" -Method Get -Body @{
    url = $Url
    caption = $Caption
}

Write-Host "Extraction response:" -ForegroundColor Green
$response | ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "Now check backend terminal logs for a line like:" -ForegroundColor Yellow
Write-Host "ai_request_success model=auto provider=... latency_ms=... total_tokens=... cost=..." -ForegroundColor Yellow

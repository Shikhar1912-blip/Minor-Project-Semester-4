# Terra-Form Frontend Starter (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Terra-Form Frontend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location frontend

if (-Not (Test-Path "node_modules")) {
    Write-Host "ERROR: Dependencies not installed!" -ForegroundColor Red
    Write-Host "Please run: npm install" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Starting Next.js development server..." -ForegroundColor Green
Write-Host ""
Write-Host "Frontend available at: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

npm run dev

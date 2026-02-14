# Terra-Form Backend Starter (PowerShell)
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "Starting Terra-Form Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location backend

if (-Not (Test-Path "venv")) {
    Write-Host "ERROR: Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run setup-backend.ps1 first." -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Activating virtual environment..." -ForegroundColor Green
& .\venv\Scripts\Activate.ps1

Write-Host "Starting FastAPI server..." -ForegroundColor Green
Write-Host ""
Write-Host "Backend available at: http://localhost:8000" -ForegroundColor Green
Write-Host "API Documentation at: http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

uvicorn main:app --reload --host 0.0.0.0 --port 8000

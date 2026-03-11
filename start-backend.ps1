# Terra-Form Backend Starter (PowerShell)
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "Starting Terra-Form Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$PYTHON = "C:\Users\Shikhar Varshney\Desktop\Minor Project\.venv\Scripts\python.exe"
$BACKEND = "C:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form\backend"

if (-Not (Test-Path $PYTHON)) {
    Write-Host "ERROR: Virtual environment not found at .venv!" -ForegroundColor Red
    exit 1
}

Write-Host "Starting FastAPI server..." -ForegroundColor Green
Write-Host ""
Write-Host "Backend available at: http://localhost:8000" -ForegroundColor Green
Write-Host "API Documentation at: http://localhost:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

Start-Process powershell -ArgumentList "-NoProfile -NoExit -Command `"cd '$BACKEND'; & '$PYTHON' -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload`"" -WindowStyle Normal

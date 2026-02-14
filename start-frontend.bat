@echo off
echo ========================================
echo Starting Terra-Form Frontend
echo ========================================
echo.

cd frontend

if not exist node_modules (
    echo ERROR: Dependencies not installed!
    echo Please run setup-frontend.bat first.
    pause
    exit /b 1
)

echo Starting Next.js development server...
echo.
echo Frontend will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

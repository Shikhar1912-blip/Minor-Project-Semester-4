@echo off
echo ========================================
echo Terra-Form Frontend Setup
echo ========================================
echo.

cd frontend

echo [1/3] Checking Node.js installation...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found! Please install Node.js 18 or higher.
    pause
    exit /b 1
)
echo.

echo [2/3] Checking npm installation...
npm --version
if errorlevel 1 (
    echo ERROR: npm not found!
    pause
    exit /b 1
)
echo.

echo [3/3] Installing dependencies...
npm install
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the frontend server, run:
echo   cd frontend
echo   npm run dev
echo.
pause

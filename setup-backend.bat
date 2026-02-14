@echo off
echo ========================================
echo Terra-Form Backend Setup
echo ========================================
echo.

cd backend

echo [1/4] Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python 3.11 or higher.
    pause
    exit /b 1
)
echo.

echo [2/4] Creating virtual environment...
if not exist venv (
    python -m venv venv
    echo Virtual environment created.
) else (
    echo Virtual environment already exists.
)
echo.

echo [3/4] Activating virtual environment...
call venv\Scripts\activate
echo.

echo [4/4] Installing dependencies...
pip install -r requirements.txt
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the backend server, run:
echo   cd backend
echo   venv\Scripts\activate
echo   uvicorn main:app --reload --host 0.0.0.0 --port 8000
echo.
pause

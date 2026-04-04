@echo off
REM AEGIS Active Attribution Engine - Demo Runner
REM This script demonstrates the new C2 detection capabilities

echo.
echo ===============================================================================
echo AEGIS ACTIVE ATTRIBUTION ENGINE v2.0 - DEMO
echo ===============================================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found in PATH
    echo Please install Python 3.8+ and add to PATH
    pause
    exit /b 1
)

echo Running demo...
echo.

python demo_attribution_engine.py

echo.
echo ===============================================================================
echo Demo completed!
echo.
echo To start the full system:
echo   Backend:  uvicorn backend.main:app --reload
echo   Frontend: cd frontend-react ^&^& npm run dev
echo ===============================================================================
echo.

pause

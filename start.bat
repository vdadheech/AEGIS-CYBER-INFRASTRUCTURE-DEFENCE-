@echo off
echo ===================================================
echo   AEGIS Defense Console - Security Operations
echo ===================================================

echo [SYS] Initializing Backend (FastAPI)...
start cmd /k "uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo [SYS] Initializing Frontend (React/Vite with Auto-Open)...
start cmd /k "cd frontend-react && npm run dev -- --open"

echo.
echo AEGIS Systems are booting.
echo The dashboard will automatically open in your default browser.
echo If it does not, manually visit: http://localhost:5173
echo ===================================================

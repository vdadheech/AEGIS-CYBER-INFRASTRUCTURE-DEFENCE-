@echo off
echo ===================================================
echo   AEGIS Defense Console - Security Operations
echo ===================================================

echo [SYS] Initializing Backend (FastAPI)...
start cmd /k "uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo [SYS] Initializing Frontend (React/Vite)...
start cmd /k "cd frontend-react && npm run dev"

echo.
echo AEGIS Systems are booting.
echo The dashboard will be available at: http://localhost:5173
echo ===================================================

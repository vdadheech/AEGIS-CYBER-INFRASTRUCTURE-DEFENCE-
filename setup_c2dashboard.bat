@echo off
echo ============================================================
echo  AEGIS C2 Dashboard Setup
echo ============================================================
echo.

cd /d K:\aegis-console\aegis-console\frontend-react

echo Installing dependencies...
call npm install zustand framer-motion --save

echo.
echo ============================================================
echo  Setup Complete!
echo ============================================================
echo.
echo To run the dashboard:
echo   1. Start backend: uvicorn backend.main:app --host 127.0.0.1 --port 8000
echo   2. Start frontend: cd frontend-react ^&^& npm run dev
echo   3. Open: http://localhost:5173
echo   4. Click the "Attribution" tab (marked NEW)
echo.
echo ============================================================
pause

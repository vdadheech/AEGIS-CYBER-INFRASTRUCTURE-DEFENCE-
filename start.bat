@echo off
echo ===================================================
echo 🛡️ AEGIS DEFENSE CONSOLE - BOOT SEQUENCE INITIATED 🛡️
echo ===================================================

echo [1/5] Checking Core Dependencies...
pip install -r requirements.txt -q

echo [2/5] Training Isolation Forest Security Model...
python -m backend.engine.threat_model

echo [3/5] Seeding Embedded AEGIS SQL Database (Running pipeline)...
python -m backend.engine.detection
python -m backend.db.seed_db

echo [4/5] Initializing AEGIS Live Telemetry Server (Port 8000)...
start "AEGIS Backend API" cmd /k "uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo [5/5] Launching AEGIS Interactive Dashboard (Port 8080)...
start "AEGIS Frontend UI" cmd /k "cd frontend && python -m http.server 8080"

echo.
echo ✅ ALL SYSTEMS NOMINAL.
echo Opening Command Center in your default browser...
timeout /t 3 /nobreak >nul
start http://127.0.0.1:8080

@echo off
REM Quick script to populate database with sample data

echo ===============================================================================
echo AEGIS - Populating Database with Sample Data
echo ===============================================================================
echo.

REM Check if processed data exists
if not exist "data\processed\analyzed_ledger.csv" (
    echo ERROR: Sample data not found!
    echo Please run the data processing pipeline first:
    echo   python -m backend.engine.ingestion
    echo   python -m backend.engine.normalization
    echo   python -m backend.engine.detection
    echo.
    pause
    exit /b 1
)

echo Seeding database...
python -m backend.db.seed_db

if errorlevel 1 (
    echo.
    echo ERROR: Database seeding failed!
    pause
    exit /b 1
)

echo.
echo ===============================================================================
echo SUCCESS! Database populated.
echo You can now refresh the UI to see data.
echo ===============================================================================
echo.

pause

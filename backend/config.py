from pathlib import Path

# Project root is two levels up from this file (backend/config.py -> project root)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

DATA_DIR = PROJECT_ROOT / "data"
PROCESSED_DIR = DATA_DIR / "processed"
DB_PATH = DATA_DIR / "aegis.db"

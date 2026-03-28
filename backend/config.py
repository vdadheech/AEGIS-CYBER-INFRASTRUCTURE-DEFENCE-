"""
AEGIS Configuration Management
Loads settings from environment variables with sensible defaults.
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Project root is two levels up from this file (backend/config.py -> project root)
PROJECT_ROOT = Path(__file__).resolve().parent.parent


class Config:
    """Central configuration for AEGIS Defense Console."""

    # Environment
    ENV: str = os.getenv("AEGIS_ENV", "development")
    DEBUG: bool = os.getenv("AEGIS_DEBUG", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("AEGIS_LOG_LEVEL", "INFO")

    # Server
    HOST: str = os.getenv("AEGIS_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("AEGIS_PORT", "8000"))
    RELOAD: bool = os.getenv("AEGIS_RELOAD", "false").lower() == "true"

    # Directories
    DATA_DIR: Path = Path(os.getenv("AEGIS_DATA_DIR", str(PROJECT_ROOT / "data")))
    RAW_DATA_DIR: Path = Path(os.getenv("AEGIS_RAW_DATA_DIR", str(DATA_DIR / "raw")))
    PROCESSED_DIR: Path = Path(os.getenv("AEGIS_PROCESSED_DATA_DIR", str(DATA_DIR / "processed")))

    # Database
    DB_PATH: Path = Path(os.getenv("AEGIS_DB_PATH", str(DATA_DIR / "aegis.db")))

    # ML Model
    MODEL_PATH: Path = Path(os.getenv("AEGIS_MODEL_PATH", str(PROCESSED_DIR / "isolation_forest.joblib")))
    MODEL_CONTAMINATION: float = float(os.getenv("AEGIS_MODEL_CONTAMINATION", "0.03"))

    # WebSocket
    WS_BATCH_SIZE: int = int(os.getenv("AEGIS_WS_BATCH_SIZE", "50"))
    WS_MAX_CONNECTIONS: int = int(os.getenv("AEGIS_WS_MAX_CONNECTIONS", "100"))

    # CORS
    CORS_ORIGINS: str = os.getenv("AEGIS_CORS_ORIGINS", "*")
    ENABLE_CORS: bool = os.getenv("AEGIS_ENABLE_CORS", "true").lower() == "true"

    # Feature Flags
    ENABLE_ML_INFERENCE: bool = os.getenv("AEGIS_ENABLE_ML_INFERENCE", "true").lower() == "true"
    PRELOAD_MODEL: bool = os.getenv("AEGIS_PRELOAD_MODEL", "true").lower() == "true"
    ENABLE_WEBSOCKET: bool = os.getenv("AEGIS_ENABLE_WEBSOCKET", "true").lower() == "true"

    @classmethod
    def ensure_directories(cls) -> None:
        """Create required directories if they don't exist."""
        cls.DATA_DIR.mkdir(parents=True, exist_ok=True)
        cls.RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
        cls.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    @classmethod
    def log_config(cls) -> None:
        """Log current configuration (useful for debugging)."""
        import logging
        logger = logging.getLogger(__name__)
        logger.info("=" * 60)
        logger.info("AEGIS Configuration")
        logger.info("=" * 60)
        logger.info(f"Environment: {cls.ENV}")
        logger.info(f"Debug Mode: {cls.DEBUG}")
        logger.info(f"Server: {cls.HOST}:{cls.PORT}")
        logger.info(f"Database: {cls.DB_PATH}")
        logger.info(f"ML Model: {cls.MODEL_PATH}")
        logger.info(f"Preload Model: {cls.PRELOAD_MODEL}")
        logger.info("=" * 60)


# Backwards compatibility: expose paths as module-level variables
DATA_DIR = Config.DATA_DIR
PROCESSED_DIR = Config.PROCESSED_DIR
DB_PATH = Config.DB_PATH
MODEL_PATH = Config.MODEL_PATH

# Ensure directories exist on import
Config.ensure_directories()

"""SQLite database connection and initialization for AEGIS."""

import sqlite3
import backend.config as config
from backend.db.models import ALL_TABLES


def get_db() -> sqlite3.Connection:
    """Returns a new SQLite connection with Row factory for dict-like access."""
    # Resolve DB path at call time so tests/config overrides are honored.
    conn = sqlite3.connect(str(config.DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Creates all tables if they don't already exist."""
    conn = get_db()
    cursor = conn.cursor()
    for ddl in ALL_TABLES:
        cursor.execute(ddl)

    # Migration: Add is_quarantined column if it doesn't exist
    try:
        cursor.execute("ALTER TABLE node_registry ADD COLUMN is_quarantined INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Column already exists

    conn.commit()
    conn.close()

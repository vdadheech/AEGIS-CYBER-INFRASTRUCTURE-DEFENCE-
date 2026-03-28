"""SQLite database connection and initialization for AEGIS."""

import sqlite3
from backend.config import DB_PATH
from backend.db.models import ALL_TABLES


def get_db() -> sqlite3.Connection:
    """Returns a new SQLite connection with Row factory for dict-like access."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Creates all tables if they don't already exist."""
    conn = get_db()
    cursor = conn.cursor()
    for ddl in ALL_TABLES:
        cursor.execute(ddl)
    conn.commit()
    conn.close()

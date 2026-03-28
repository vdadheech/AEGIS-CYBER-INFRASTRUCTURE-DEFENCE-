"""
Seed script: reads processed CSVs and inserts them into the AEGIS SQLite database.
Run with:  python -m backend.db.seed_db
"""

import csv
import logging
from pathlib import Path
from backend.config import PROCESSED_DIR
from backend.db.database import init_db, get_db

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


def _safe_float(val):
    try:
        return float(val) if val not in ("", None) else None
    except (ValueError, TypeError):
        return None


def _safe_int(val):
    try:
        return int(float(val)) if val not in ("", None) else None
    except (ValueError, TypeError):
        return None


def _bool_to_int(val):
    """Convert string booleans like 'True'/'False' to 1/0."""
    if isinstance(val, str):
        return 1 if val.strip().lower() == "true" else 0
    return int(bool(val))


def seed_telemetry(conn, csv_path: Path):
    """Seed telemetry_logs from the analyzed ledger CSV."""
    cursor = conn.cursor()
    cursor.execute("DELETE FROM telemetry_logs")  # Clear existing data

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = []
        for row in reader:
            rows.append((
                _safe_int(row.get("log_id")),
                _safe_int(row.get("node_id")),
                row.get("json_status", ""),
                _safe_int(row.get("http_response_code")),
                _safe_float(row.get("response_time_ms")),
                _safe_float(row.get("system_load")),
                row.get("hardware_serial", ""),
                row.get("is_infected", ""),
                _bool_to_int(row.get("flag_spoofed", "False")),
                _bool_to_int(row.get("flag_ddos", "False")),
                _bool_to_int(row.get("flag_malware", "False")),
                _safe_int(row.get("threat_score")),
            ))

        cursor.executemany(
            "INSERT OR REPLACE INTO telemetry_logs "
            "(log_id, node_id, json_status, http_response_code, response_time_ms, "
            "system_load, hardware_serial, is_infected, flag_spoofed, flag_ddos, "
            "flag_malware, threat_score) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            rows
        )

    conn.commit()
    logger.info(f"Seeded {len(rows)} rows into telemetry_logs.")


def seed_node_registry(conn, csv_path: Path):
    """Seed node_registry from the validated registry CSV."""
    cursor = conn.cursor()
    cursor.execute("DELETE FROM node_registry")

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = []
        for row in reader:
            rows.append((
                _safe_int(row.get("node_uuid")),
                row.get("hardware_serial", row.get("user_agent", "")),
                row.get("is_infected", ""),
            ))

        cursor.executemany(
            "INSERT OR REPLACE INTO node_registry "
            "(node_uuid, hardware_serial, is_infected) VALUES (?,?,?)",
            rows
        )

    conn.commit()
    logger.info(f"Seeded {len(rows)} rows into node_registry.")


def seed_schema_versions(conn, csv_path: Path):
    """Seed schema_versions from the validated schema config CSV."""
    cursor = conn.cursor()
    cursor.execute("DELETE FROM schema_versions")

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = []
        for row in reader:
            rows.append((
                _safe_int(row.get("version")),
                _safe_int(row.get("time_start")),
                row.get("active_column", ""),
            ))

        cursor.executemany(
            "INSERT OR REPLACE INTO schema_versions "
            "(version, time_start, active_column) VALUES (?,?,?)",
            rows
        )

    conn.commit()
    logger.info(f"Seeded {len(rows)} rows into schema_versions.")


def seed_all():
    """Master seeder: initializes the DB and populates all tables."""
    init_db()
    conn = get_db()

    ledger_path = PROCESSED_DIR / "analyzed_ledger.csv"
    registry_path = PROCESSED_DIR / "validated_node_registry.csv"
    schema_path = PROCESSED_DIR / "validated_schema_config.csv"

    for p in [ledger_path, registry_path, schema_path]:
        if not p.exists():
            logger.error(f"Missing required file: {p}. Run the engine pipeline first.")
            return

    seed_telemetry(conn, ledger_path)
    seed_node_registry(conn, registry_path)
    seed_schema_versions(conn, schema_path)

    conn.close()
    logger.info("SUCCESS: AEGIS database fully seeded.")


if __name__ == "__main__":
    seed_all()
    print("\n✅ Database seeded. AEGIS is ready.")

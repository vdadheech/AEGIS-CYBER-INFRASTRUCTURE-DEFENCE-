"""
Live pipeline: streams telemetry rows from SQLite and yields them as JSON events.
Used by the /ws/telemetry WebSocket endpoint in main.py.
"""

import asyncio
import json
import logging
from backend.db.database import get_db

logger = logging.getLogger(__name__)

# Schema V2 kicks in at log_id 5000 (from schema_config)
SCHEMA_V2_START = 5000
PAGE_SIZE = 100
DELAY_SECONDS = 0.05  # 50 ms between pages -> smooth animation


async def stream_telemetry():
    """
    Async generator that yields telemetry events one page at a time.
    Each yielded item is a JSON string containing event type + payload.
    """
    conn = get_db()
    try:
        total = conn.execute("SELECT COUNT(*) FROM telemetry_logs").fetchone()[0]
        schema_versions = conn.execute(
            "SELECT version, time_start, active_column FROM schema_versions ORDER BY time_start"
        ).fetchall()

        current_schema_version = 1
        offset = 0

        while offset < total:
            rows = conn.execute(
                "SELECT log_id, node_id, response_time_ms, flag_spoofed, flag_malware, threat_score "
                "FROM telemetry_logs ORDER BY log_id ASC LIMIT ? OFFSET ?",
                (PAGE_SIZE, offset)
            ).fetchall()

            for row in rows:
                log_id = row["log_id"]

                # Detect schema rotation: check if we've crossed a version boundary
                for sv in schema_versions:
                    if sv["time_start"] <= log_id and sv["version"] > current_schema_version:
                        current_schema_version = sv["version"]
                        yield json.dumps({
                            "event": "schema_change",
                            "version": sv["version"],
                            "active_column": sv["active_column"],
                            "log_id": log_id
                        })

                # Yield the telemetry data point
                yield json.dumps({
                    "event": "log",
                    "log_id": log_id,
                    "node_id": row["node_id"],
                    "response_time_ms": row["response_time_ms"],
                    "flag_spoofed": row["flag_spoofed"],
                    "flag_malware": row["flag_malware"],
                    "threat_score": row["threat_score"]
                })

            offset += PAGE_SIZE
            await asyncio.sleep(DELAY_SECONDS)

    except Exception as e:
        logger.error(f"Stream error: {e}")
    finally:
        conn.close()

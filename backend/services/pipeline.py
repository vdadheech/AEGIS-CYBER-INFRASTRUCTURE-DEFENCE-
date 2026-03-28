"""
Event-driven telemetry pipeline: streams telemetry data from SQLite.
Uses batch streaming without artificial delays for real-time responsiveness.
"""

import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, Any, List
from backend.db.database import get_db
import sqlite3

logger = logging.getLogger(__name__)

# Configuration
SCHEMA_V2_START = 5000
BATCH_SIZE = 50  # Stream in smaller batches for better real-time feel


class TelemetryStream:
    """Event-driven telemetry stream manager."""

    def __init__(self):
        self.last_log_id = 0

    async def stream_batch(self, batch: List[sqlite3.Row], schema_versions: List[Dict],
                          current_schema: int) -> AsyncGenerator[str, None]:
        """
        Stream a batch of telemetry events.
        Yields schema change notifications and log events.
        """
        for row in batch:
            log_id = row["log_id"]

            # Detect schema rotation
            for sv in schema_versions:
                if sv["version"] > current_schema and sv["time_start"] <= log_id:
                    current_schema = sv["version"]
                    yield json.dumps({
                        "event": "schema_change",
                        "version": sv["version"],
                        "active_column": sv["active_column"],
                        "log_id": log_id
                    })

            # Yield telemetry log event
            yield json.dumps({
                "event": "log",
                "log_id": log_id,
                "node_id": row["node_id"],
                "response_time_ms": row["response_time_ms"],
                "flag_spoofed": row["flag_spoofed"],
                "flag_malware": row["flag_malware"],
                "threat_score": row["threat_score"]
            })

            self.last_log_id = log_id


async def stream_telemetry() -> AsyncGenerator[str, None]:
    """
    Event-driven async generator that streams telemetry events.
    Removed artificial polling delays for true real-time streaming.

    Yields:
        JSON strings containing event type and payload
    """
    conn = get_db()
    stream_manager = TelemetryStream()

    try:
        # Get total count and schema versions
        total = conn.execute("SELECT COUNT(*) FROM telemetry_logs").fetchone()[0]
        schema_versions = [
            dict(row) for row in conn.execute(
                "SELECT version, time_start, active_column FROM schema_versions ORDER BY time_start"
            ).fetchall()
        ]

        current_schema_version = 1
        offset = 0

        logger.info(f"Starting telemetry stream: {total} total logs, {len(schema_versions)} schema versions")

        # Stream all data in batches without artificial delays
        while offset < total:
            batch = conn.execute(
                """SELECT log_id, node_id, response_time_ms, flag_spoofed,
                          flag_malware, threat_score
                   FROM telemetry_logs
                   ORDER BY log_id ASC
                   LIMIT ? OFFSET ?""",
                (BATCH_SIZE, offset)
            ).fetchall()

            if not batch:
                break

            # Stream the batch
            async for event in stream_manager.stream_batch(batch, schema_versions, current_schema_version):
                yield event

                # Yield control to allow other async tasks to run
                # (much faster than asyncio.sleep)
                await asyncio.sleep(0)

            offset += BATCH_SIZE

        logger.info(f"Telemetry stream complete: streamed {stream_manager.last_log_id} logs")

    except sqlite3.Error as e:
        logger.error(f"Database error in telemetry stream: {e}")
        yield json.dumps({"event": "error", "message": "Database connection lost"})
    except (RuntimeError, ValueError, TypeError) as e:
        logger.error(f"Unexpected error in telemetry stream: {e}")
        yield json.dumps({"event": "error", "message": "Stream error occurred"})
    finally:
        conn.close()


async def get_new_telemetry(since_log_id: int = 0) -> AsyncGenerator[str, None]:
    """
    Stream only new telemetry entries since a given log_id.
    Used for incremental updates without replaying entire history.

    Args:
        since_log_id: Only stream logs with log_id > this value

    Yields:
        JSON strings containing new telemetry events
    """
    conn = get_db()

    try:
        rows = conn.execute(
            """SELECT log_id, node_id, response_time_ms, flag_spoofed,
                      flag_malware, threat_score
               FROM telemetry_logs
               WHERE log_id > ?
               ORDER BY log_id ASC""",
            (since_log_id,)
        ).fetchall()

        for row in rows:
            yield json.dumps({
                "event": "log",
                "log_id": row["log_id"],
                "node_id": row["node_id"],
                "response_time_ms": row["response_time_ms"],
                "flag_spoofed": row["flag_spoofed"],
                "flag_malware": row["flag_malware"],
                "threat_score": row["threat_score"]
            })

            # Yield control
            await asyncio.sleep(0)

    except sqlite3.Error as e:
        logger.error(f"Database error fetching new telemetry: {e}")
    finally:
        conn.close()

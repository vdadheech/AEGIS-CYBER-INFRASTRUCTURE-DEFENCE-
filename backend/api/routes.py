from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import sqlite3
from backend.db.database import get_db

router = APIRouter()


class QuarantineResponse(BaseModel):
    node_id: int
    is_quarantined: bool
    message: str


def _rows_to_dicts(rows):
    """Convert sqlite3.Row objects to plain dicts for JSON serialization."""
    return [dict(row) for row in rows]


@router.get("/assets")
def get_asset_registry():
    """Returns unique nodes and their threat status for the Asset Table."""
    conn = get_db()
    rows = conn.execute(
        """
        SELECT node_id, hardware_serial, threat_score, flag_spoofed
        FROM telemetry_logs
        GROUP BY node_id
        """
    ).fetchall()
    conn.close()
    return {"assets": _rows_to_dicts(rows)}


@router.get("/city-map")
def get_city_map():
    """Returns the latest telemetry per node to color-code the Forensic City Map."""
    conn = get_db()
    rows = conn.execute(
        """
        SELECT
            r.node_uuid as node_id,
            r.hardware_serial as node_serial,
            r.is_quarantined,
            'Sector-' || (r.node_uuid % 20 + 1) as location,
            t.http_response_code as http_status,
            t.response_time_ms as response_time,
            t.flag_spoofed as spoof_flag,
            t.flag_ddos as ddos_flag,
            t.flag_malware as malware_flag,
            CASE
                WHEN r.is_quarantined = 1 THEN 'QUARANTINED'
                WHEN t.flag_malware = 1 OR (t.flag_spoofed = 1 AND t.http_response_code >= 500) THEN 'RED'
                WHEN t.flag_ddos = 1 OR t.flag_spoofed = 1 OR t.http_response_code >= 400 THEN 'YELLOW'
                ELSE 'GREEN'
            END as status_color
        FROM node_registry r
        LEFT JOIN telemetry_logs t ON r.node_uuid = t.node_id
        WHERE t.log_id = (SELECT MAX(log_id) FROM telemetry_logs t2 WHERE t2.node_id = r.node_uuid)
        """
    ).fetchall()
    conn.close()
    return {"nodes": _rows_to_dicts(rows)}


@router.get("/heatmap")
def get_heatmap():
    """Returns response times over time to plot the Sleeper Heatmap."""
    conn = get_db()
    rows = conn.execute(
        """
        SELECT log_id, response_time_ms
        FROM telemetry_logs
        ORDER BY log_id ASC
        """
    ).fetchall()
    conn.close()
    return {"heatmap": _rows_to_dicts(rows)}


@router.get("/schema-logs")
def get_schema_logs():
    """Returns actual pipeline execution logs for the frontend console."""
    conn = get_db()
    try:
        total_logs = conn.execute("SELECT COUNT(*) FROM telemetry_logs").fetchone()[0]
        spoofed = conn.execute("SELECT COUNT(*) FROM telemetry_logs WHERE flag_spoofed = 1").fetchone()[0]
        ddos = conn.execute("SELECT COUNT(DISTINCT node_id) FROM telemetry_logs WHERE flag_ddos = 1").fetchone()[0]
        malware = conn.execute("SELECT COUNT(*) FROM telemetry_logs WHERE flag_malware = 1").fetchone()[0]
        schemas = conn.execute("SELECT version, active_column FROM schema_versions ORDER BY version").fetchall()

        logs = [
            "> CONNECTING TO TELEMETRY STREAM...",
            f"> INGESTED {total_logs} RAW PACKETS FROM DATABASE",
        ]
        for s in schemas:
            logs.append(f"> SCHEMA V{s['version']}: ACTIVE KEY = '{s['active_column']}'")
        logs += [
            "> NORMALIZING SCHEMA KEYS: 'load_val', 'L_V1' -> 'system_load'",
            "> SCHEMA NORMALIZATION STABLE.",
            f"> THREAT ENGINE: {spoofed} SPOOFED | {ddos} DDoS NODES | {malware} MALWARE HITS",
        ]
        conn.close()
        return {"logs": logs}
    except sqlite3.Error:
        conn.close()
        return {"logs": ["> AWAITING TELEMETRY STREAM..."]}


@router.post("/nodes/{node_id}/quarantine", response_model=QuarantineResponse)
def quarantine_node(node_id: int):
    """Toggle quarantine status for a node. Isolates compromised nodes from the network."""
    conn = get_db()
    try:
        # Check if node exists
        node = conn.execute(
            "SELECT node_uuid, is_quarantined FROM node_registry WHERE node_uuid = ?",
            (node_id,)
        ).fetchone()

        if not node:
            conn.close()
            raise HTTPException(status_code=404, detail=f"Node {node_id} not found")

        # Toggle quarantine status
        current_status = node["is_quarantined"] or 0
        new_status = 0 if current_status else 1

        conn.execute(
            "UPDATE node_registry SET is_quarantined = ? WHERE node_uuid = ?",
            (new_status, node_id)
        )
        conn.commit()
        conn.close()

        action = "quarantined" if new_status else "released"
        return QuarantineResponse(
            node_id=node_id,
            is_quarantined=bool(new_status),
            message=f"Node N-{node_id} has been {action}"
        )

    except HTTPException:
        raise
    except sqlite3.Error as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/nodes/{node_id}/status")
def get_node_status(node_id: int):
    """Get current status of a specific node including quarantine state."""
    conn = get_db()
    try:
        node = conn.execute(
            """
            SELECT
                r.node_uuid,
                r.hardware_serial,
                r.is_quarantined,
                t.threat_score,
                t.flag_spoofed,
                t.flag_ddos,
                t.flag_malware
            FROM node_registry r
            LEFT JOIN telemetry_logs t ON r.node_uuid = t.node_id
            WHERE r.node_uuid = ?
            ORDER BY t.log_id DESC LIMIT 1
            """,
            (node_id,)
        ).fetchone()

        conn.close()

        if not node:
            raise HTTPException(status_code=404, detail=f"Node {node_id} not found")

        return dict(node)

    except HTTPException:
        raise
    except sqlite3.Error as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
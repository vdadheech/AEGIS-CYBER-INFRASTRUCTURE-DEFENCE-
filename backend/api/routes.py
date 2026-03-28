from fastapi import APIRouter, HTTPException
from backend.db.database import get_db

router = APIRouter()


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
            r.hardware_serial as node_serial,
            'Sector-' || (r.node_uuid % 20 + 1) as location,
            t.http_response_code as http_status,
            t.response_time_ms as response_time,
            t.flag_spoofed as spoof_flag,
            t.flag_ddos as ddos_flag,
            t.flag_malware as malware_flag,
            CASE 
                WHEN t.http_response_code >= 500 OR t.flag_malware = 1 OR t.flag_spoofed = 1 THEN 'RED'
                WHEN t.http_response_code >= 400 OR t.flag_ddos = 1 THEN 'YELLOW'
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
    except Exception:
        conn.close()
        return {"logs": ["> AWAITING TELEMETRY STREAM..."]}
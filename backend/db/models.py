"""SQL CREATE TABLE statements for the AEGIS database."""

TELEMETRY_LOGS_TABLE = """
CREATE TABLE IF NOT EXISTS telemetry_logs (
    log_id          INTEGER PRIMARY KEY,
    node_id         INTEGER NOT NULL,
    json_status     TEXT,
    http_response_code INTEGER,
    response_time_ms REAL,
    system_load     REAL,
    hardware_serial TEXT,
    is_infected     TEXT,
    flag_spoofed    INTEGER DEFAULT 0,
    flag_ddos       INTEGER DEFAULT 0,
    flag_malware    INTEGER DEFAULT 0,
    threat_score    INTEGER DEFAULT 0
);
"""

NODE_REGISTRY_TABLE = """
CREATE TABLE IF NOT EXISTS node_registry (
    node_uuid       INTEGER PRIMARY KEY,
    hardware_serial TEXT,
    is_infected     TEXT
);
"""

SCHEMA_VERSIONS_TABLE = """
CREATE TABLE IF NOT EXISTS schema_versions (
    version         INTEGER PRIMARY KEY,
    time_start      INTEGER,
    active_column   TEXT
);
"""

ALL_TABLES = [TELEMETRY_LOGS_TABLE, NODE_REGISTRY_TABLE, SCHEMA_VERSIONS_TABLE]

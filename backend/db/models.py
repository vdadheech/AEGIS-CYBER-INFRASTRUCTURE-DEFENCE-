"""SQL CREATE TABLE statements for the AEGIS Active Attribution Engine.

Schema designed for C2 detection via:
- Graph analytics (source_ip, target_endpoint relationships)
- Temporal fingerprinting (timestamp, time_delta_ms for beacon detection)
- Header fingerprinting (user_agent, header_order, header_hash)
"""

TELEMETRY_LOGS_TABLE = """
CREATE TABLE IF NOT EXISTS telemetry_logs (
    log_id              INTEGER PRIMARY KEY,
    node_id             INTEGER NOT NULL,
    json_status         TEXT,
    http_response_code  INTEGER,
    response_time_ms    REAL,
    system_load         REAL,
    hardware_serial     TEXT,
    is_infected         TEXT,
    flag_spoofed        INTEGER DEFAULT 0,
    flag_ddos           INTEGER DEFAULT 0,
    flag_malware        INTEGER DEFAULT 0,
    threat_score        INTEGER DEFAULT 0,
    
    -- ACTIVE ATTRIBUTION ENGINE: New columns for C2 detection
    timestamp           REAL,           -- Unix epoch for temporal analysis
    time_delta_ms       REAL,           -- Time since last request from same source
    source_ip           TEXT,           -- Source IP for graph node modeling
    target_endpoint     TEXT,           -- API endpoint hit (graph edge label)
    user_agent          TEXT,           -- Full User-Agent string
    header_order        TEXT,           -- Ordered header names (JSON array)
    header_hash         TEXT,           -- SHA256 of header_order for fast comparison
    c2_confidence       REAL DEFAULT 0, -- Attribution score 0-100
    beacon_score        REAL DEFAULT 0, -- Timing regularity score
    graph_anomaly_score REAL DEFAULT 0, -- Centrality-based anomaly
    header_anomaly_score REAL DEFAULT 0 -- Fingerprint deviation score
);
"""

# Indexes for performance-critical queries
TELEMETRY_INDEXES = """
-- Temporal queries: Find requests in time windows
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_logs(timestamp);

-- Graph construction: Group by source IP
CREATE INDEX IF NOT EXISTS idx_telemetry_source_ip ON telemetry_logs(source_ip);

-- Threat filtering: Find high-confidence C2 candidates
CREATE INDEX IF NOT EXISTS idx_telemetry_c2_confidence ON telemetry_logs(c2_confidence);

-- Composite index for efficient node-time queries
CREATE INDEX IF NOT EXISTS idx_telemetry_node_time ON telemetry_logs(node_id, timestamp);

-- Header fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_telemetry_header_hash ON telemetry_logs(header_hash);
"""

NODE_REGISTRY_TABLE = """
CREATE TABLE IF NOT EXISTS node_registry (
    node_uuid       INTEGER PRIMARY KEY,
    hardware_serial TEXT,
    is_infected     TEXT,
    is_quarantined  INTEGER DEFAULT 0
);
"""

SCHEMA_VERSIONS_TABLE = """
CREATE TABLE IF NOT EXISTS schema_versions (
    version         INTEGER PRIMARY KEY,
    time_start      INTEGER,
    active_column   TEXT
);
"""

# Graph cache for persisting computed NetworkX metrics
GRAPH_METRICS_TABLE = """
CREATE TABLE IF NOT EXISTS graph_metrics (
    node_key            TEXT PRIMARY KEY,  -- source_ip or node_id as string
    degree_centrality   REAL DEFAULT 0,
    betweenness         REAL DEFAULT 0,
    closeness           REAL DEFAULT 0,
    community_id        INTEGER DEFAULT 0,
    is_hub              INTEGER DEFAULT 0, -- 1 if centrality > threshold
    computed_at         REAL,              -- Unix timestamp of computation
    edge_count          INTEGER DEFAULT 0
);
"""

GRAPH_METRICS_INDEXES = """
CREATE INDEX IF NOT EXISTS idx_graph_betweenness ON graph_metrics(betweenness);
CREATE INDEX IF NOT EXISTS idx_graph_community ON graph_metrics(community_id);
"""

# Fingerprint reference table for known browser signatures
FINGERPRINT_REGISTRY_TABLE = """
CREATE TABLE IF NOT EXISTS fingerprint_registry (
    header_hash     TEXT PRIMARY KEY,
    user_agent      TEXT,
    is_browser      INTEGER DEFAULT 0,  -- 1 = legitimate browser
    is_bot          INTEGER DEFAULT 0,  -- 1 = known bot/crawler
    is_c2_suspect   INTEGER DEFAULT 0,  -- 1 = matches C2 patterns
    first_seen      REAL,
    last_seen       REAL,
    occurrence_count INTEGER DEFAULT 1
);
"""

ALL_TABLES = [
    TELEMETRY_LOGS_TABLE, 
    NODE_REGISTRY_TABLE, 
    SCHEMA_VERSIONS_TABLE,
    GRAPH_METRICS_TABLE,
    FINGERPRINT_REGISTRY_TABLE
]

ALL_INDEXES = [
    TELEMETRY_INDEXES,
    GRAPH_METRICS_INDEXES
]

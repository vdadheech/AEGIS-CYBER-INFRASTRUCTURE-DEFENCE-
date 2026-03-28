"""
Test suite for AEGIS database operations.
"""

import pytest
import sqlite3
from backend.db.database import get_db, init_db
from backend.db.models import ALL_TABLES


class TestDatabaseInitialization:
    """Test database initialization and schema creation."""

    def test_init_db_creates_tables(self, test_db):
        """Test that init_db creates all required tables."""
        conn = sqlite3.connect(str(test_db))
        cursor = conn.cursor()

        # Check that all tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row[0] for row in cursor.fetchall()}

        assert "telemetry_logs" in tables
        assert "node_registry" in tables
        assert "schema_versions" in tables

        conn.close()

    def test_node_registry_has_quarantine_column(self, test_db):
        """Test that node_registry has is_quarantined column."""
        conn = sqlite3.connect(str(test_db))
        cursor = conn.cursor()

        cursor.execute("PRAGMA table_info(node_registry)")
        columns = {row[1] for row in cursor.fetchall()}

        assert "is_quarantined" in columns
        conn.close()


class TestNodeRegistryOperations:
    """Test operations on node_registry table."""

    def test_insert_node(self, db_connection):
        """Test inserting a new node."""
        cursor = db_connection.cursor()
        cursor.execute(
            "INSERT INTO node_registry (node_uuid, hardware_serial, is_infected, is_quarantined) VALUES (?, ?, ?, ?)",
            (99, "SN-NEW-001", "NO", 0)
        )
        db_connection.commit()

        cursor.execute("SELECT * FROM node_registry WHERE node_uuid = ?", (99,))
        row = cursor.fetchone()

        assert row is not None
        assert row["hardware_serial"] == "SN-NEW-001"
        assert row["is_quarantined"] == 0

    def test_update_quarantine_status(self, db_connection):
        """Test updating quarantine status."""
        node_id = 1
        cursor = db_connection.cursor()

        # Update to quarantined
        cursor.execute(
            "UPDATE node_registry SET is_quarantined = ? WHERE node_uuid = ?",
            (1, node_id)
        )
        db_connection.commit()

        # Verify
        cursor.execute("SELECT is_quarantined FROM node_registry WHERE node_uuid = ?", (node_id,))
        row = cursor.fetchone()
        assert row["is_quarantined"] == 1

    def test_query_quarantined_nodes(self, db_connection):
        """Test querying all quarantined nodes."""
        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM node_registry WHERE is_quarantined = 1")
        quarantined = cursor.fetchall()

        # Test data has one pre-quarantined node
        assert len(quarantined) >= 1
        assert all(row["is_quarantined"] == 1 for row in quarantined)


class TestTelemetryLogsOperations:
    """Test operations on telemetry_logs table."""

    def test_query_telemetry_by_node(self, db_connection):
        """Test querying telemetry for a specific node."""
        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM telemetry_logs WHERE node_id = ?", (1,))
        logs = cursor.fetchall()

        assert len(logs) > 0
        assert all(row["node_id"] == 1 for row in logs)

    def test_telemetry_threat_flags(self, db_connection):
        """Test that telemetry logs have threat flag columns."""
        cursor = db_connection.cursor()
        cursor.execute("PRAGMA table_info(telemetry_logs)")
        columns = {row[1] for row in cursor.fetchall()}

        assert "flag_spoofed" in columns
        assert "flag_ddos" in columns
        assert "flag_malware" in columns
        assert "threat_score" in columns

    def test_query_high_threat_logs(self, db_connection):
        """Test querying high-threat telemetry logs."""
        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM telemetry_logs WHERE threat_score >= 2")
        high_threats = cursor.fetchall()

        assert len(high_threats) > 0
        assert all(row["threat_score"] >= 2 for row in high_threats)


class TestDatabaseConstraints:
    """Test database constraints and data integrity."""

    def test_node_uuid_primary_key(self, db_connection):
        """Test that node_uuid is a primary key."""
        cursor = db_connection.cursor()

        # Try to insert duplicate node_uuid
        with pytest.raises(sqlite3.IntegrityError):
            cursor.execute(
                "INSERT INTO node_registry (node_uuid, hardware_serial) VALUES (?, ?)",
                (1, "DUPLICATE")
            )

    def test_default_quarantine_value(self, db_connection):
        """Test that is_quarantined defaults to 0."""
        cursor = db_connection.cursor()
        cursor.execute(
            "INSERT INTO node_registry (node_uuid, hardware_serial, is_infected) VALUES (?, ?, ?)",
            (100, "SN-DEFAULT-TEST", "NO")
        )
        db_connection.commit()

        cursor.execute("SELECT is_quarantined FROM node_registry WHERE node_uuid = ?", (100,))
        row = cursor.fetchone()
        assert row["is_quarantined"] == 0


class TestComplexQueries:
    """Test complex SQL queries used in the application."""

    def test_latest_telemetry_per_node(self, db_connection):
        """Test query to get latest telemetry per node."""
        cursor = db_connection.cursor()
        query = """
            SELECT
                r.node_uuid,
                r.is_quarantined,
                t.threat_score,
                t.response_time_ms
            FROM node_registry r
            LEFT JOIN telemetry_logs t ON r.node_uuid = t.node_id
            WHERE t.log_id = (
                SELECT MAX(log_id)
                FROM telemetry_logs t2
                WHERE t2.node_id = r.node_uuid
            )
        """
        cursor.execute(query)
        results = cursor.fetchall()

        assert len(results) > 0
        # Each node should appear only once
        node_ids = [row["node_uuid"] for row in results]
        assert len(node_ids) == len(set(node_ids))

    def test_status_color_logic(self, db_connection):
        """Test the status color determination logic."""
        cursor = db_connection.cursor()
        query = """
            SELECT
                r.node_uuid,
                r.is_quarantined,
                t.flag_malware,
                t.flag_spoofed,
                t.flag_ddos,
                t.http_response_code,
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
        cursor.execute(query)
        results = cursor.fetchall()

        # Verify quarantined node shows QUARANTINED status
        quarantined = [r for r in results if r["is_quarantined"] == 1]
        assert all(r["status_color"] == "QUARANTINED" for r in quarantined)

        # Verify malware nodes show RED status
        malware_nodes = [r for r in results if r["flag_malware"] == 1 and r["is_quarantined"] == 0]
        assert all(r["status_color"] == "RED" for r in malware_nodes)

"""
Test suite for AEGIS API routes.
"""

import pytest
from fastapi import status


class TestAssetRegistry:
    """Test the /api/assets endpoint."""

    def test_get_assets_success(self, client):
        """Test successful retrieval of asset registry."""
        response = client.get("/api/assets")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "assets" in data
        assert isinstance(data["assets"], list)

    def test_assets_contain_required_fields(self, client):
        """Test that assets have required fields."""
        response = client.get("/api/assets")
        data = response.json()
        if data["assets"]:
            asset = data["assets"][0]
            assert "node_id" in asset
            assert "hardware_serial" in asset
            assert "threat_score" in asset
            assert "flag_spoofed" in asset


class TestCityMap:
    """Test the /api/city-map endpoint."""

    def test_get_city_map_success(self, client):
        """Test successful retrieval of city map data."""
        response = client.get("/api/city-map")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "nodes" in data
        assert isinstance(data["nodes"], list)

    def test_city_map_includes_quarantine_status(self, client):
        """Test that city map includes quarantine status."""
        response = client.get("/api/city-map")
        data = response.json()
        nodes = data["nodes"]
        assert len(nodes) > 0

        # Check that nodes have is_quarantined field
        for node in nodes:
            assert "is_quarantined" in node
            assert "status_color" in node


class TestHeatmap:
    """Test the /api/heatmap endpoint."""

    def test_get_heatmap_success(self, client):
        """Test successful retrieval of heatmap data."""
        response = client.get("/api/heatmap")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "heatmap" in data
        assert isinstance(data["heatmap"], list)

    def test_heatmap_data_structure(self, client):
        """Test heatmap data has correct structure."""
        response = client.get("/api/heatmap")
        data = response.json()
        if data["heatmap"]:
            point = data["heatmap"][0]
            assert "log_id" in point
            assert "response_time_ms" in point


class TestQuarantineEndpoint:
    """Test the /api/nodes/{node_id}/quarantine endpoint."""

    def test_quarantine_node_success(self, client, db_connection):
        """Test successfully quarantining a node."""
        node_id = 1
        response = client.post(f"/api/nodes/{node_id}/quarantine")
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["node_id"] == node_id
        assert data["is_quarantined"] is True
        assert "quarantined" in data["message"].lower()

        # Verify database was updated
        cursor = db_connection.execute(
            "SELECT is_quarantined FROM node_registry WHERE node_uuid = ?",
            (node_id,)
        )
        row = cursor.fetchone()
        assert row["is_quarantined"] == 1

    def test_quarantine_toggle(self, client, db_connection):
        """Test quarantine toggle functionality."""
        node_id = 1

        # First quarantine
        response1 = client.post(f"/api/nodes/{node_id}/quarantine")
        assert response1.json()["is_quarantined"] is True

        # Then release
        response2 = client.post(f"/api/nodes/{node_id}/quarantine")
        assert response2.json()["is_quarantined"] is False
        assert "released" in response2.json()["message"].lower()

        # Verify database reflects the release
        cursor = db_connection.execute(
            "SELECT is_quarantined FROM node_registry WHERE node_uuid = ?",
            (node_id,)
        )
        row = cursor.fetchone()
        assert row["is_quarantined"] == 0

    def test_quarantine_nonexistent_node(self, client):
        """Test quarantining a node that doesn't exist."""
        response = client.post("/api/nodes/9999/quarantine")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()

    def test_quarantine_already_quarantined_node(self, client):
        """Test quarantining a node that's already quarantined."""
        node_id = 3  # This node is pre-quarantined in test data
        response = client.post(f"/api/nodes/{node_id}/quarantine")
        assert response.status_code == status.HTTP_200_OK

        # Should toggle to released
        data = response.json()
        assert data["is_quarantined"] is False


class TestNodeStatus:
    """Test the /api/nodes/{node_id}/status endpoint."""

    def test_get_node_status_success(self, client):
        """Test successfully retrieving node status."""
        node_id = 1
        response = client.get(f"/api/nodes/{node_id}/status")
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["node_uuid"] == node_id
        assert "hardware_serial" in data
        assert "is_quarantined" in data
        assert "threat_score" in data

    def test_get_node_status_not_found(self, client):
        """Test retrieving status for nonexistent node."""
        response = client.get("/api/nodes/9999/status")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_node_status_includes_threat_flags(self, client):
        """Test that node status includes all threat flags."""
        node_id = 2  # This node has threats in test data
        response = client.get(f"/api/nodes/{node_id}/status")
        data = response.json()

        assert "flag_spoofed" in data
        assert "flag_ddos" in data
        assert "flag_malware" in data


class TestSchemaLogs:
    """Test the /api/schema-logs endpoint."""

    def test_get_schema_logs_success(self, client):
        """Test successful retrieval of schema logs."""
        response = client.get("/api/schema-logs")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "logs" in data
        assert isinstance(data["logs"], list)

    def test_schema_logs_contain_threat_info(self, client):
        """Test that schema logs include threat statistics."""
        response = client.get("/api/schema-logs")
        data = response.json()
        logs = " ".join(data["logs"])
        assert "THREAT" in logs or "SPOOFED" in logs or "INGESTED" in logs


class TestQuarantineIntegration:
    """Integration tests for quarantine workflow."""

    def test_full_quarantine_workflow(self, client, db_connection):
        """Test complete workflow: detect threat -> quarantine -> verify map."""
        # Step 1: Get city map and find a compromised node
        map_response = client.get("/api/city-map")
        nodes = map_response.json()["nodes"]
        compromised_nodes = [n for n in nodes if n["status_color"] == "RED"]

        if not compromised_nodes:
            pytest.skip("No compromised nodes in test data")

        node = compromised_nodes[0]
        node_id = node["node_id"]

        # Step 2: Quarantine the node
        quarantine_response = client.post(f"/api/nodes/{node_id}/quarantine")
        assert quarantine_response.status_code == status.HTTP_200_OK
        assert quarantine_response.json()["is_quarantined"] is True

        # Step 3: Verify quarantine status in city map
        updated_map = client.get("/api/city-map").json()
        updated_node = next(
            (n for n in updated_map["nodes"] if n["node_id"] == node_id),
            None
        )
        assert updated_node is not None
        assert updated_node["is_quarantined"] == 1
        assert updated_node["status_color"] == "QUARANTINED"

        # Step 4: Verify node status endpoint
        status_response = client.get(f"/api/nodes/{node_id}/status")
        assert status_response.json()["is_quarantined"] == 1

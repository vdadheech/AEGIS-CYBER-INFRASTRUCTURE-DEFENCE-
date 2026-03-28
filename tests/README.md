# AEGIS Test Suite

Comprehensive test coverage for the AEGIS Cyber Defense System.

## Setup

1. Install test dependencies:
```bash
pip install -r tests/requirements.txt
```

## Running Tests

### Run all tests:
```bash
pytest tests/ -v
```

### Run specific test file:
```bash
pytest tests/test_api_routes.py -v
pytest tests/test_database.py -v
```

### Run with coverage:
```bash
pytest tests/ --cov=backend --cov-report=html
```

### Run specific test class:
```bash
pytest tests/test_api_routes.py::TestQuarantineEndpoint -v
```

### Run specific test:
```bash
pytest tests/test_api_routes.py::TestQuarantineEndpoint::test_quarantine_node_success -v
```

## Test Structure

- `conftest.py` - Pytest fixtures and configuration
- `test_api_routes.py` - API endpoint tests
- `test_database.py` - Database operation tests

## Test Coverage

### API Routes (`test_api_routes.py`)
- ✅ Asset Registry (`/api/assets`)
- ✅ City Map (`/api/city-map`)
- ✅ Heatmap (`/api/heatmap`)
- ✅ **Quarantine Endpoint (`/api/nodes/{node_id}/quarantine`)**
  - Success cases
  - Toggle functionality
  - Error handling (404, invalid nodes)
- ✅ **Node Status (`/api/nodes/{node_id}/status`)**
- ✅ Schema Logs (`/api/schema-logs`)
- ✅ **Full integration workflow**

### Database (`test_database.py`)
- ✅ Schema initialization
- ✅ **Quarantine column presence**
- ✅ Node registry operations
- ✅ **Quarantine status updates**
- ✅ Telemetry logs operations
- ✅ Threat flags
- ✅ Data integrity constraints
- ✅ Complex queries (status color logic)

## Key Features Tested

### Quarantine Functionality
1. **Database Schema**: `is_quarantined` column in `node_registry`
2. **API Endpoint**: POST `/api/nodes/{node_id}/quarantine`
3. **Toggle Behavior**: Quarantine <-> Release
4. **Status Integration**: Reflects in city map as `QUARANTINED`
5. **Error Handling**: 404 for missing nodes, 500 for DB errors

### Integration Tests
- Complete workflow from detection to quarantine
- Status propagation across endpoints
- Database state consistency

## Continuous Integration

Add to your CI/CD pipeline:
```yaml
- name: Run Tests
  run: |
    pip install -r tests/requirements.txt
    pytest tests/ -v --cov=backend
```

## Troubleshooting

**Import errors**: Ensure you're running from project root:
```bash
cd k:/aegis-console/aegis-console
pytest tests/ -v
```

**Database locked**: Tests use temporary databases that are cleaned up automatically.

**Port conflicts**: Test client uses TestClient which doesn't bind to actual ports.

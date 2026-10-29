"""Integration tests for FastAPI endpoints."""

from unittest.mock import AsyncMock, MagicMock

import asyncpg
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import get_db_connection
from app.main import app


class AsyncContextManagerMock:
    """Mock for async transaction context managers."""

    async def __aenter__(self) -> MagicMock:
        return MagicMock()

    async def __aexit__(self, exc_type: object, exc_val: object, exc_tb: object) -> None:
        return None


@pytest.fixture
def mock_db_connection() -> MagicMock:
    """Fixture providing a mock database connection for endpoint testing."""
    conn = MagicMock(spec=asyncpg.Connection)
    conn.execute = AsyncMock()
    conn.fetch = AsyncMock(
        return_value=[
            {"name": "Acme Cloud", "plan_tier": "enterprise", "monthly_spend": 4850.0},
            {"name": "Apex Financial", "plan_tier": "enterprise", "monthly_spend": 8900.0},
        ]
    )
    conn.transaction = MagicMock(return_value=AsyncContextManagerMock())
    return conn


@pytest.fixture(autouse=True)
def override_db_dependency(mock_db_connection: MagicMock) -> None:
    """Automatically override the database connection dependency for all tests."""
    async def _get_test_conn():
        yield mock_db_connection

    app.dependency_overrides[get_db_connection] = _get_test_conn
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_health_endpoint() -> None:
    """Verify /health endpoint returns operational status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database_configured"] is True


@pytest.mark.asyncio
async def test_guardrail_validate_endpoint_safe() -> None:
    """Verify /api/v1/guardrail/validate accepts safe SELECT query."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/guardrail/validate",
            json={"sql": "SELECT * FROM organizations WHERE monthly_spend > 500;"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_safe"] is True
        assert data["reason"] is None


@pytest.mark.asyncio
async def test_guardrail_validate_endpoint_malicious() -> None:
    """Verify /api/v1/guardrail/validate rejects malicious DROP and multi-statements."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Malicious DROP
        resp_drop = await client.post(
            "/api/v1/guardrail/validate",
            json={"sql": "DROP TABLE users;"},
        )
        assert resp_drop.status_code == 200
        data_drop = resp_drop.json()
        assert data_drop["is_safe"] is False
        assert data_drop["reason"] is not None

        # Piggybacked statement
        resp_piggy = await client.post(
            "/api/v1/guardrail/validate",
            json={"sql": "SELECT * FROM users; DROP TABLE audit_logs;"},
        )
        assert resp_piggy.status_code == 200
        data_piggy = resp_piggy.json()
        assert data_piggy["is_safe"] is False
        assert "Multiple statements detected" in data_piggy["reason"]


@pytest.mark.asyncio
async def test_schema_endpoint() -> None:
    """Verify /api/v1/schema returns active schema DDL and tables metadata."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/schema")
        assert response.status_code == 200
        data = response.json()
        assert "formatted_schema" in data
        assert "organizations" in data["formatted_schema"]
        assert "users" in data["formatted_schema"]


@pytest.mark.asyncio
async def test_query_generate_endpoint() -> None:
    """Verify /api/v1/query/generate returns structured SQL output."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/query/generate",
            json={"query": "Show me top enterprise organizations by monthly spend"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "sql" in data
        assert data["sql"].strip().upper().startswith("SELECT")
        assert "organizations" in data["tables_used"]


@pytest.mark.asyncio
async def test_copilot_end_to_end_pipeline() -> None:
    """Verify full /api/v1/copilot pipeline execution, telemetry, and visualization format."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        request_payload = {
            "query": "Show me the top enterprise organizations by monthly spend",
            "context_hints": "Filter only plan_tier = 'enterprise'",
        }
        response = await client.post("/api/v1/copilot", json=request_payload)
        assert response.status_code == 200
        data = response.json()

        # Telemetry & pipeline assertions
        assert data["natural_language_query"] == request_payload["query"]
        assert data["guardrail_safe"] is True
        assert data["guardrail_reason"] is None

        # SQL generation output
        assert "sql" in data["generation"]
        assert data["generation"]["sql"].strip().upper().startswith("SELECT")

        # Sandboxed execution output
        assert data["execution"]["success"] is True
        assert data["execution"]["row_count"] == 2
        assert len(data["execution"]["rows"]) == 2

        # Visualization suggestion
        assert data["suggested_visualization"] in ("table", "bar", "line", "metric", "pie")

        # Latency breakdown telemetry
        latency = data["latency"]
        assert latency["total_pipeline_ms"] >= 0.0
        assert latency["schema_introspection_ms"] >= 0.0
        assert latency["llm_generation_ms"] >= 0.0
        assert latency["guardrail_validation_ms"] >= 0.0
        assert latency["sandboxed_execution_ms"] >= 0.0

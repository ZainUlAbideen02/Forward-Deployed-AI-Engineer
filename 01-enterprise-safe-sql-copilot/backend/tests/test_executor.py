"""Tests for SandboxedSQLExecutor session parameters and error handling."""

import decimal
from unittest.mock import AsyncMock, MagicMock

import asyncpg
import pytest

from app.services.executor import SandboxedSQLExecutor


class AsyncContextManagerMock:
    """Mock for async context managers (e.g. conn.transaction())."""

    async def __aenter__(self) -> MagicMock:
        return MagicMock()

    async def __aexit__(self, exc_type: object, exc_val: object, exc_tb: object) -> None:
        return None


@pytest.fixture
def mock_conn() -> MagicMock:
    """Fixture providing a mocked asyncpg Connection with transaction support."""
    conn = MagicMock(spec=asyncpg.Connection)
    conn.execute = AsyncMock()
    conn.fetch = AsyncMock()
    conn.transaction = MagicMock(return_value=AsyncContextManagerMock())
    return conn


@pytest.mark.asyncio
async def test_executor_valid_select(mock_conn: MagicMock) -> None:
    """Test successful execution of a valid SELECT query with serialized outputs."""
    executor = SandboxedSQLExecutor(statement_timeout_ms=2500)

    # Mock database records
    mock_records = [
        {"id": 1, "name": "Acme Cloud", "monthly_spend": decimal.Decimal("4850.00")},
        {"id": 2, "name": "StripeLine", "monthly_spend": decimal.Decimal("1250.00")},
    ]
    mock_conn.fetch.return_value = mock_records

    sql = "SELECT id, name, monthly_spend FROM organizations WHERE monthly_spend > 1000;"
    result = await executor.execute(sql, mock_conn)

    # Verify session parameters were enforced
    mock_conn.execute.assert_any_call("SET default_transaction_read_only = on;")
    mock_conn.execute.assert_any_call("SET statement_timeout = '2500ms';")
    mock_conn.execute.assert_any_call("SET TRANSACTION READ ONLY;")

    # Verify results
    assert result.success is True
    assert result.error is None
    assert result.row_count == 2
    assert result.columns == ["id", "name", "monthly_spend"]
    assert result.rows[0]["monthly_spend"] == 4850.0
    assert result.execution_time_ms >= 0.0


@pytest.mark.asyncio
async def test_executor_statement_timeout_enforced(mock_conn: MagicMock) -> None:
    """Test that statement timeout (QueryCanceledError) is handled gracefully."""
    executor = SandboxedSQLExecutor(statement_timeout_ms=100)

    mock_conn.fetch.side_effect = asyncpg.exceptions.QueryCanceledError(
        "canceling statement due to statement timeout"
    )

    result = await executor.execute("SELECT pg_sleep(5);", mock_conn)

    assert result.success is False
    assert result.row_count == 0
    assert result.error is not None
    assert "timed out" in result.error.lower()
    assert "100ms" in result.error


@pytest.mark.asyncio
async def test_executor_undefined_table_error(mock_conn: MagicMock) -> None:
    """Test graceful handling when an invalid/missing table is queried."""
    executor = SandboxedSQLExecutor(statement_timeout_ms=2500)

    mock_conn.fetch.side_effect = asyncpg.exceptions.UndefinedTableError(
        'relation "non_existent_table" does not exist'
    )

    result = await executor.execute("SELECT * FROM non_existent_table;", mock_conn)

    assert result.success is False
    assert result.row_count == 0
    assert result.error is not None
    assert "relation error" in result.error.lower() or "does not exist" in result.error.lower()


@pytest.mark.asyncio
async def test_executor_empty_result_set(mock_conn: MagicMock) -> None:
    """Test query returning zero rows."""
    executor = SandboxedSQLExecutor(statement_timeout_ms=2500)
    mock_conn.fetch.return_value = []

    result = await executor.execute("SELECT * FROM organizations WHERE monthly_spend < 0;", mock_conn)

    assert result.success is True
    assert result.row_count == 0
    assert result.rows == []
    assert result.columns == []
    assert result.error is None

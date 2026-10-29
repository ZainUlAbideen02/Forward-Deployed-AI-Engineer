"""Sandboxed SQL query executor with defensive execution parameters."""

from __future__ import annotations

import datetime
import decimal
import logging
import time
import uuid
from typing import Any

import asyncpg

from app.core.config import settings
from app.schemas.query import QueryExecutionResult

logger = logging.getLogger(__name__)


class SandboxedSQLExecutor:
    """Executes validated SQL queries in a heavily restricted PostgreSQL session."""

    def __init__(self, statement_timeout_ms: int = settings.STATEMENT_TIMEOUT_MS) -> None:
        self.statement_timeout_ms = statement_timeout_ms

    @staticmethod
    def _serialize_value(val: Any) -> Any:
        """Convert PostgreSQL native types (Decimal, datetime, UUID) to JSON-friendly primitives."""
        if val is None:
            return None
        if isinstance(val, (datetime.datetime, datetime.date)):
            return val.isoformat()
        if isinstance(val, decimal.Decimal):
            return float(val)
        if isinstance(val, uuid.UUID):
            return str(val)
        return val

    def _serialize_record(self, record: asyncpg.Record | dict[str, Any]) -> dict[str, Any]:
        """Convert a database record to a standard dictionary with serialized values."""
        item = dict(record)
        return {key: self._serialize_value(val) for key, val in item.items()}

    async def execute(self, sql: str, conn: asyncpg.Connection) -> QueryExecutionResult:
        """Execute a validated SQL query with strict session-level safety restrictions.

        Args:
            sql: A pre-validated SELECT query.
            conn: An active asyncpg connection.

        Returns:
            QueryExecutionResult containing rows, column names, timing, and error details.
        """
        start_time = time.perf_counter()

        try:
            # 1. Apply defensive session variables
            await conn.execute("SET default_transaction_read_only = on;")
            await conn.execute(f"SET statement_timeout = '{self.statement_timeout_ms}ms';")

            # 2. Execute query within an explicit read-only transaction
            async with conn.transaction(readonly=True):
                await conn.execute("SET TRANSACTION READ ONLY;")
                records = await conn.fetch(sql)

            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if not records:
                return QueryExecutionResult(
                    success=True,
                    columns=[],
                    rows=[],
                    row_count=0,
                    execution_time_ms=duration_ms,
                    error=None,
                )

            # Extract column headers and format records
            first_record = records[0]
            columns = list(first_record.keys())
            formatted_rows = [self._serialize_record(r) for r in records]

            return QueryExecutionResult(
                success=True,
                columns=columns,
                rows=formatted_rows,
                row_count=len(formatted_rows),
                execution_time_ms=duration_ms,
                error=None,
            )

        except asyncpg.exceptions.QueryCanceledError as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            error_msg = f"Query timed out: Execution exceeded the {self.statement_timeout_ms}ms limit ({exc})."
            logger.warning(error_msg)
            return QueryExecutionResult(
                success=False,
                columns=[],
                rows=[],
                row_count=0,
                execution_time_ms=duration_ms,
                error=error_msg,
            )

        except asyncpg.exceptions.UndefinedTableError as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            error_msg = f"Database relation error: {exc}"
            logger.warning(error_msg)
            return QueryExecutionResult(
                success=False,
                columns=[],
                rows=[],
                row_count=0,
                execution_time_ms=duration_ms,
                error=error_msg,
            )

        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            error_msg = f"Database execution error: {type(exc).__name__}: {exc}"
            logger.error("Query execution failed: %s", error_msg)
            return QueryExecutionResult(
                success=False,
                columns=[],
                rows=[],
                row_count=0,
                execution_time_ms=duration_ms,
                error=error_msg,
            )


sql_executor = SandboxedSQLExecutor()

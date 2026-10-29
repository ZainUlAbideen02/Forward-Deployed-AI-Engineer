"""REST API endpoints for Enterprise Safe SQL Copilot."""

from __future__ import annotations

import time
from typing import Any, Literal, Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import get_db_connection, init_db_pool, db_pool
from app.schemas.query import (
    CopilotResponse,
    ExecuteSQLRequest,
    GuardrailValidationResponse,
    LatencyBreakdown,
    NaturalLanguageQueryRequest,
    QueryExecutionResult,
    SQLGenerationOutput,
    SchemaMetadataResponse,
)
from app.services.executor import sql_executor
from app.services.generator import sql_generator
from app.services.guardrail import SQLGuardrail
from app.services.schema import schema_introspector

router = APIRouter(prefix="/api/v1", tags=["Copilot"])
guardrail = SQLGuardrail()


def _determine_visualization_format(
    result: QueryExecutionResult,
) -> Literal["table", "bar", "line", "metric", "pie"]:
    """Select the optimal frontend visualization based on result shapes and column types."""
    if not result.success or not result.rows:
        return "table"

    # Single cell scalar result (e.g., COUNT(*), AVG(monthly_spend))
    if result.row_count == 1 and len(result.columns) == 1:
        return "metric"

    # Time-series detection
    time_keywords = ("date", "time", "month", "day", "year", "created", "timestamp", "period")
    has_time_col = any(
        any(k in col.lower() for k in time_keywords) for col in result.columns
    )
    if has_time_col and result.row_count > 1:
        return "line"

    # Categorical + metric comparison (<= 25 items)
    if len(result.columns) == 2 and result.row_count <= 25:
        return "bar"

    return "table"


async def get_optional_db_conn() -> Optional[asyncpg.Connection]:
    """Provide a database connection if pool is online, otherwise None."""
    global db_pool
    if db_pool is not None:
        try:
            return await db_pool.acquire()
        except Exception:
            return None
    return None


@router.get("/schema", response_model=SchemaMetadataResponse, summary="Introspect Database Schema")
async def get_database_schema(
    force_refresh: bool = False,
) -> SchemaMetadataResponse:
    """Return the active PostgreSQL schema formatted for LLM system prompts."""
    conn = await get_optional_db_conn()
    try:
        formatted, tables, is_cached = await schema_introspector.introspect(
            conn=conn,
            force_refresh=force_refresh,
        )
        return SchemaMetadataResponse(
            formatted_schema=formatted,
            tables=tables,
            cached=is_cached,
        )
    finally:
        if conn and db_pool:
            await db_pool.release(conn)


@router.post(
    "/guardrail/validate",
    response_model=GuardrailValidationResponse,
    summary="Validate SQL Query Safety",
)
async def validate_query(request: ExecuteSQLRequest) -> GuardrailValidationResponse:
    """Validate a raw SQL query through the AST security guardrail without executing it."""
    is_safe, reason = guardrail.validate_query(request.sql)
    return GuardrailValidationResponse(
        is_safe=is_safe,
        reason=reason,
        sql=request.sql,
    )


@router.post(
    "/query/generate",
    response_model=SQLGenerationOutput,
    summary="Generate SQL from Natural Language",
)
async def generate_sql(request: NaturalLanguageQueryRequest) -> SQLGenerationOutput:
    """Convert a natural language business question into a structured, safe SQL query."""
    conn = await get_optional_db_conn()
    try:
        schema_markdown = await schema_introspector.get_formatted_schema(conn)
        return await sql_generator.generate_sql(
            prompt=request.query,
            schema_markdown=schema_markdown,
            context_hints=request.context_hints,
        )
    finally:
        if conn and db_pool:
            await db_pool.release(conn)


@router.post(
    "/query/execute",
    response_model=QueryExecutionResult,
    summary="Execute SQL in Sandboxed Session",
)
async def execute_query(
    request: ExecuteSQLRequest,
    conn: asyncpg.Connection = Depends(get_db_connection),
) -> QueryExecutionResult:
    """Validate and execute a raw SQL query inside the read-only PostgreSQL sandbox."""
    is_safe, reason = guardrail.validate_query(request.sql)
    if not is_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security Guardrail Rejected Query: {reason}",
        )

    return await sql_executor.execute(request.sql, conn)


@router.post(
    "/copilot",
    response_model=CopilotResponse,
    summary="Full End-to-End Safe SQL Copilot Pipeline",
)
async def copilot_pipeline(
    request: NaturalLanguageQueryRequest,
    conn: asyncpg.Connection = Depends(get_db_connection),
) -> CopilotResponse:
    """Execute the complete Forward Deployed AI pipeline:

    1. Introspects live database schema.
    2. Generates structured SQL using LLM.
    3. Validates SQL strictly via AST security guardrail.
    4. Executes validated SQL inside PostgreSQL read-only transaction sandbox.
    5. Formats result and measures latency breakdown.
    """
    total_start = time.perf_counter()

    # 1. Schema Introspection
    t0 = time.perf_counter()
    schema_markdown = await schema_introspector.get_formatted_schema(conn)
    schema_ms = round((time.perf_counter() - t0) * 1000, 2)

    # 2. LLM Generation
    t1 = time.perf_counter()
    generation = await sql_generator.generate_sql(
        prompt=request.query,
        schema_markdown=schema_markdown,
        context_hints=request.context_hints,
    )
    llm_ms = round((time.perf_counter() - t1) * 1000, 2)

    # 3. Defensive AST Guardrail Check
    t2 = time.perf_counter()
    is_safe, guardrail_reason = guardrail.validate_query(generation.sql)
    guardrail_ms = round((time.perf_counter() - t2) * 1000, 2)

    # 4. Sandboxed Execution (Only if guardrail passes)
    t3 = time.perf_counter()
    if is_safe:
        execution_result = await sql_executor.execute(generation.sql, conn)
    else:
        execution_result = QueryExecutionResult(
            success=False,
            columns=[],
            rows=[],
            row_count=0,
            execution_time_ms=0.0,
            error=f"Execution blocked by AST Guardrail: {guardrail_reason}",
        )
    exec_ms = round((time.perf_counter() - t3) * 1000, 2)

    total_ms = round((time.perf_counter() - total_start) * 1000, 2)

    # 5. Visualization Format Suggestion
    suggested_viz = _determine_visualization_format(execution_result)

    return CopilotResponse(
        natural_language_query=request.query,
        generation=generation,
        guardrail_safe=is_safe,
        guardrail_reason=guardrail_reason,
        execution=execution_result,
        suggested_visualization=suggested_viz,
        latency=LatencyBreakdown(
            schema_introspection_ms=schema_ms,
            llm_generation_ms=llm_ms,
            guardrail_validation_ms=guardrail_ms,
            sandboxed_execution_ms=exec_ms,
            total_pipeline_ms=total_ms,
        ),
    )

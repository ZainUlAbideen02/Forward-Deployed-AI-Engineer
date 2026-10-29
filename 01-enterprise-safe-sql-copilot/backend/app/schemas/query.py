"""Pydantic models for Enterprise Safe SQL Copilot."""

from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


class NaturalLanguageQueryRequest(BaseModel):
    """User request containing a natural language analytical question."""

    query: str = Field(
        ...,
        description="Natural language business question to translate into SQL.",
        examples=["Show me the top 5 enterprise organizations by monthly spend."],
    )
    context_hints: Optional[str] = Field(
        default=None,
        description="Optional enterprise business context, definitions, or table preferences.",
        examples=["Filter only active subscriptions."],
    )


class SQLGenerationOutput(BaseModel):
    """Structured output format enforced on LLM SQL generation."""

    sql: str = Field(..., description="PostgreSQL SELECT query answering the user question.")
    explanation: str = Field(..., description="Concise explanation of query logic and joins.")
    tables_used: list[str] = Field(
        default_factory=list,
        description="Database tables referenced by the generated query.",
    )
    estimated_complexity: Literal["simple", "medium", "complex"] = Field(
        default="simple",
        description="Estimated query complexity score.",
    )


class ExecuteSQLRequest(BaseModel):
    """Request payload for executing an explicit SQL query."""

    sql: str = Field(
        ...,
        description="Raw SQL query string to be validated and executed in the sandbox.",
    )


class QueryExecutionResult(BaseModel):
    """Results returned from sandboxed database execution."""

    success: bool = Field(..., description="Whether query executed without error.")
    columns: list[str] = Field(default_factory=list, description="Column names returned.")
    rows: list[dict[str, Any]] = Field(default_factory=list, description="List of row dictionaries.")
    row_count: int = Field(default=0, description="Total number of returned rows.")
    execution_time_ms: float = Field(default=0.0, description="Execution duration in milliseconds.")
    error: Optional[str] = Field(default=None, description="Database error message if failed.")


class LatencyBreakdown(BaseModel):
    """Latency telemetry across the end-to-end copilot pipeline."""

    schema_introspection_ms: float = 0.0
    llm_generation_ms: float = 0.0
    guardrail_validation_ms: float = 0.0
    sandboxed_execution_ms: float = 0.0
    total_pipeline_ms: float = 0.0


class CopilotResponse(BaseModel):
    """Complete response returned by the Forward Deployed Copilot pipeline."""

    natural_language_query: str
    generation: SQLGenerationOutput
    guardrail_safe: bool
    guardrail_reason: Optional[str] = None
    execution: QueryExecutionResult
    suggested_visualization: Literal["table", "bar", "line", "metric", "pie"] = "table"
    latency: LatencyBreakdown


class GuardrailValidationResponse(BaseModel):
    """Response returned from standalone guardrail validation."""

    is_safe: bool
    reason: Optional[str] = None
    sql: str


class SchemaMetadataResponse(BaseModel):
    """Response returned by the dynamic schema endpoint."""

    formatted_schema: str
    tables: list[dict[str, Any]]
    cached: bool

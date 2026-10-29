"""FastAPI application entrypoint for Enterprise Safe SQL Copilot."""

from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.guardrail import SQLGuardrail


class QueryValidationRequest(BaseModel):
    """Request payload for validating SQL safety."""

    sql: str = Field(..., description="The raw SQL query string to be validated.")


class QueryValidationResponse(BaseModel):
    """Response payload for query validation."""

    is_safe: bool
    reason: str | None = None
    sql: str


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context."""
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="AST-governed enterprise SQL Copilot backend with least-privilege architecture.",
    lifespan=lifespan,
)

guardrail = SQLGuardrail()


@app.get("/health", tags=["System"])
async def health_check() -> dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "database_configured": bool(settings.postgres_dsn),
        "database_host": settings.POSTGRES_HOST,
        "database_port": settings.POSTGRES_PORT,
    }


@app.post("/api/v1/guardrail/validate", response_model=QueryValidationResponse, tags=["Guardrail"])
async def validate_sql(request: QueryValidationRequest) -> QueryValidationResponse:
    """Validate a SQL query through the AST security guardrail."""
    is_safe, reason = guardrail.validate_query(request.sql)
    return QueryValidationResponse(
        is_safe=is_safe,
        reason=reason,
        sql=request.sql,
    )


"""FastAPI application entrypoint for Enterprise Safe SQL Copilot."""

from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.core.config import settings
from app.core.database import close_db_pool, init_db_pool


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context: initializes and cleans up the asyncpg connection pool."""
    await init_db_pool()
    try:
        yield
    finally:
        await close_db_pool()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.2.0",
    description="AST-governed enterprise SQL Copilot backend with least-privilege architecture.",
    lifespan=lifespan,
)

# Enable CORS for local dev / dashboard integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
async def health_check() -> dict[str, Any]:
    """Health check endpoint providing runtime operational telemetry."""
    from app.core.database import db_pool

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "database_configured": bool(settings.postgres_dsn),
        "database_connected": db_pool is not None,
        "database_host": settings.POSTGRES_HOST,
        "database_port": settings.POSTGRES_PORT,
    }


# Mount all API routes under /api/v1
app.include_router(api_router)

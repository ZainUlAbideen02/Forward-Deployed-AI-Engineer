"""PostgreSQL connection pool management using asyncpg."""

import logging
from typing import AsyncGenerator, Optional

import asyncpg
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

# Global connection pool instance
db_pool: Optional[asyncpg.Pool] = None


async def init_db_pool() -> Optional[asyncpg.Pool]:
    """Initialize the global asyncpg connection pool with least-privilege credentials."""
    global db_pool
    if db_pool is None:
        try:
            logger.info("Initializing database connection pool (%s)...", settings.POSTGRES_HOST)
            db_pool = await asyncpg.create_pool(
                dsn=settings.postgres_dsn,
                min_size=settings.DB_POOL_MIN_SIZE,
                max_size=settings.DB_POOL_MAX_SIZE,
                timeout=settings.DB_POOL_TIMEOUT,
                command_timeout=settings.QUERY_TIMEOUT_SECONDS,
            )
            logger.info(
                "Database pool initialized successfully (min=%d, max=%d).",
                settings.DB_POOL_MIN_SIZE,
                settings.DB_POOL_MAX_SIZE,
            )
        except Exception as exc:
            logger.warning(
                "Database connection pool initialization skipped/failed: %s. "
                "Running in offline / mock-ready mode.",
                exc,
            )
            db_pool = None
    return db_pool


async def close_db_pool() -> None:
    """Close all open connections in the connection pool."""
    global db_pool
    if db_pool is not None:
        logger.info("Closing database connection pool...")
        await db_pool.close()
        db_pool = None
        logger.info("Database connection pool closed.")


async def get_db_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """FastAPI dependency that yields an active database connection from the pool."""
    global db_pool
    if db_pool is None:
        # Attempt lazy reconnection if pool was not available at startup
        await init_db_pool()

    if db_pool is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection pool unavailable. Ensure the 'safe-sql-postgres' container is running.",
        )

    async with db_pool.acquire() as connection:
        yield connection

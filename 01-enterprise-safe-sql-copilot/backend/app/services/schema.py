"""Dynamic PostgreSQL schema introspector with caching."""

from __future__ import annotations

import logging
import time
from typing import Any, Optional

import asyncpg

from app.core.config import settings

logger = logging.getLogger(__name__)

# Fallback reference schema matching seed/init.sql if DB catalog is offline during tests
DEFAULT_SAAS_SCHEMA_DDL = """### Table: organizations
- id: integer (PRIMARY KEY)
- name: character varying(255) (NOT NULL)
- plan_tier: character varying(50) (NOT NULL) [free, starter, growth, enterprise]
- monthly_spend: numeric(10,2) (NOT NULL, DEFAULT 0.00)
- created_at: timestamp with time zone (NOT NULL)

### Table: users
- id: integer (PRIMARY KEY)
- org_id: integer (NOT NULL, FOREIGN KEY -> organizations.id)
- full_name: character varying(255) (NOT NULL)
- email: character varying(255) (NOT NULL, UNIQUE)
- role: character varying(50) (NOT NULL) [owner, admin, member, viewer, billing_manager]
- is_active: boolean (NOT NULL, DEFAULT true)
- last_login: timestamp with time zone (NULLABLE)

### Table: subscriptions
- id: integer (PRIMARY KEY)
- org_id: integer (NOT NULL, FOREIGN KEY -> organizations.id)
- status: character varying(50) (NOT NULL) [active, trialing, past_due, canceled]
- seats_purchased: integer (NOT NULL, DEFAULT 1)
- current_period_end: timestamp with time zone (NOT NULL)

### Table: audit_logs
- id: integer (PRIMARY KEY)
- user_id: integer (NULLABLE, FOREIGN KEY -> users.id)
- action: character varying(100) (NOT NULL)
- timestamp: timestamp with time zone (NOT NULL)
- ip_address: character varying(45) (NOT NULL)
"""


class SchemaIntrospector:
    """Introspects PostgreSQL system catalogs to extract schema metadata for LLM prompts."""

    def __init__(self, ttl_seconds: int = 600) -> None:
        self.ttl_seconds = ttl_seconds
        self._cached_schema: Optional[str] = None
        self._cached_tables: list[dict[str, Any]] = []
        self._cached_timestamp: float = 0.0

    def is_cache_valid(self) -> bool:
        """Check if cached schema is within the configured TTL."""
        if self._cached_schema is None:
            return False
        return (time.time() - self._cached_timestamp) < self.ttl_seconds

    def invalidate_cache(self) -> None:
        """Manually invalidate schema cache."""
        self._cached_schema = None
        self._cached_tables = []
        self._cached_timestamp = 0.0
        logger.info("Schema introspector cache invalidated.")

    async def get_formatted_schema(self, conn: Optional[asyncpg.Connection] = None) -> str:
        """Return formatted markdown DDL representation of database schema."""
        schema_text, _, _ = await self.introspect(conn)
        return schema_text

    async def introspect(
        self,
        conn: Optional[asyncpg.Connection] = None,
        force_refresh: bool = False,
    ) -> tuple[str, list[dict[str, Any]], bool]:
        """Introspect PostgreSQL schema catalogs.

        Returns:
            tuple: (formatted_schema_markdown, tables_metadata_list, is_from_cache)
        """
        if not force_refresh and self.is_cache_valid() and self._cached_schema is not None:
            return self._cached_schema, self._cached_tables, True

        if conn is None:
            # When no live connection is available, use fallback schema
            logger.info("Using default SaaS schema fallback (no database connection provided).")
            self._cached_schema = DEFAULT_SAAS_SCHEMA_DDL
            self._cached_tables = [
                {"table_name": "organizations", "columns": ["id", "name", "plan_tier", "monthly_spend", "created_at"]},
                {"table_name": "users", "columns": ["id", "org_id", "full_name", "email", "role", "is_active", "last_login"]},
                {"table_name": "subscriptions", "columns": ["id", "org_id", "status", "seats_purchased", "current_period_end"]},
                {"table_name": "audit_logs", "columns": ["id", "user_id", "action", "timestamp", "ip_address"]},
            ]
            self._cached_timestamp = time.time()
            return self._cached_schema, self._cached_tables, False

        try:
            # 1. Fetch tables in public schema
            tables_query = """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """
            table_rows = await conn.fetch(tables_query)
            table_names = [row["table_name"] for row in table_rows]

            if not table_names:
                logger.warning("No tables found in public schema. Falling back to default schema.")
                self._cached_schema = DEFAULT_SAAS_SCHEMA_DDL
                self._cached_timestamp = time.time()
                return self._cached_schema, [], False

            # 2. Fetch columns
            columns_query = """
                SELECT 
                    table_name,
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position;
            """
            column_rows = await conn.fetch(columns_query)

            # 3. Fetch constraints & foreign keys
            constraints_query = """
                SELECT
                    tc.table_name,
                    kcu.column_name,
                    tc.constraint_type,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                LEFT JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
                WHERE tc.table_schema = 'public'
                ORDER BY tc.table_name, kcu.column_name;
            """
            constraint_rows = await conn.fetch(constraints_query)

            # Build metadata map
            constraints_map: dict[str, dict[str, list[str]]] = {}
            for crow in constraint_rows:
                t_name = crow["table_name"]
                c_name = crow["column_name"]
                c_type = crow["constraint_type"]
                constraints_map.setdefault(t_name, {}).setdefault(c_name, [])
                if c_type == "PRIMARY KEY":
                    constraints_map[t_name][c_name].append("PRIMARY KEY")
                elif c_type == "FOREIGN KEY":
                    f_table = crow["foreign_table_name"]
                    f_col = crow["foreign_column_name"]
                    constraints_map[t_name][c_name].append(f"FOREIGN KEY -> {f_table}.{f_col}")

            columns_by_table: dict[str, list[dict[str, Any]]] = {}
            for col in column_rows:
                t_name = col["table_name"]
                c_name = col["column_name"]
                c_type = col["data_type"]
                is_null = col["is_nullable"] == "YES"
                col_def = col["column_default"]
                columns_by_table.setdefault(t_name, []).append({
                    "name": c_name,
                    "data_type": c_type,
                    "nullable": is_null,
                    "default": col_def,
                    "constraints": constraints_map.get(t_name, {}).get(c_name, []),
                })

            # Format markdown DDL
            markdown_parts: list[str] = []
            tables_meta: list[dict[str, Any]] = []

            for t_name in table_names:
                cols = columns_by_table.get(t_name, [])
                tables_meta.append({
                    "table_name": t_name,
                    "columns": [c["name"] for c in cols],
                    "details": cols,
                })

                part = [f"### Table: {t_name}"]
                for c in cols:
                    modifiers = []
                    if "PRIMARY KEY" in c["constraints"]:
                        modifiers.append("PRIMARY KEY")
                    elif not c["nullable"]:
                        modifiers.append("NOT NULL")

                    for constraint in c["constraints"]:
                        if constraint != "PRIMARY KEY":
                            modifiers.append(constraint)

                    mod_str = f" ({', '.join(modifiers)})" if modifiers else ""
                    part.append(f"- {c['name']}: {c['data_type']}{mod_str}")

                markdown_parts.append("\n".join(part))

            formatted = "\n\n".join(markdown_parts)
            self._cached_schema = formatted
            self._cached_tables = tables_meta
            self._cached_timestamp = time.time()
            return formatted, tables_meta, False

        except Exception as exc:
            logger.error("Error during database schema introspection: %s", exc)
            self._cached_schema = DEFAULT_SAAS_SCHEMA_DDL
            self._cached_timestamp = time.time()
            return self._cached_schema, [], False


schema_introspector = SchemaIntrospector(ttl_seconds=settings.SCHEMA_CACHE_TTL_SECONDS)

"""Verification script for PostgreSQL database container and readonly role permissions."""

import asyncio
import sys
import asyncpg
from app.core.config import settings


async def verify_database() -> bool:
    """Connect to Postgres using readonly_analyst and verify schema & data."""
    print(f"Connecting to database via: {settings.postgres_dsn} ...")
    try:
        conn = await asyncpg.connect(settings.postgres_dsn, timeout=10)
    except Exception as exc:
        print(f"[!] Database connection failed: {exc}")
        print("    Ensure docker container 'safe-sql-postgres' is running (`docker compose up -d`).")
        return False

    try:
        tables = ["organizations", "users", "subscriptions", "audit_logs"]
        print("\nVerifying table counts:")
        for table in tables:
            count = await conn.fetchval(f"SELECT COUNT(*) FROM {table};")
            print(f"  - Table '{table}': {count} rows")
            if count < 15:
                print(f"    [WARNING] Expected at least 15 rows in {table}, found {count}")

        # Verify readonly permissions (Write operation must fail)
        print("\nVerifying read-only enforcement for 'readonly_analyst':")
        try:
            await conn.execute("INSERT INTO organizations (name, plan_tier) VALUES ('Evil Corp', 'free');")
            print("  [FAIL] Write operation succeeded unexpectedly on read-only user!")
            return False
        except asyncpg.exceptions.InsufficientPrivilegeError:
            print("  [SUCCESS] Write operation properly blocked by PostgreSQL permission check.")

        print("\nDatabase verification complete and all checks passed!")
        return True
    finally:
        await conn.close()


if __name__ == "__main__":
    success = asyncio.run(verify_database())
    sys.exit(0 if success else 1)


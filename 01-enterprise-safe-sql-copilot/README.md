# Enterprise Safe SQL Copilot (Phase 1)

Defensive SQL Copilot backend featuring Abstract Syntax Tree (AST) query validation, enterprise schema modeling, and least-privilege PostgreSQL containerization.

---

## Architecture Overview

```
01-enterprise-safe-sql-copilot/
├── docker-compose.yml             # PostgreSQL 16 container ('safe-sql-postgres')
├── seed/
│   └── init.sql                   # B2B SaaS schema, 80+ seed rows, readonly_analyst role
└── backend/
    ├── pyproject.toml             # uv & modern packaging configuration
    ├── .env.example               # Environment variables template
    ├── .env                       # Local environment variables
    ├── app/
    │   ├── core/
    │   │   └── config.py          # Pydantic BaseSettings (DSN, timeouts, LLM keys)
    │   ├── services/
    │   │   └── guardrail.py       # sqlglot AST security guardrail
    │   └── main.py                # FastAPI endpoints (/health, /api/v1/guardrail/validate)
    └── tests/
        └── test_guardrail.py      # Comprehensive pytest test suite
```

---

## 1. AST Security Guardrail (`app/services/guardrail.py`)

The `SQLGuardrail` service uses `sqlglot` with the PostgreSQL dialect to enforce defense-in-depth security before any query reaches database execution:

- **Syntax Validation:** Parses queries strictly into the PostgreSQL dialect, catching malformed syntax.
- **Root Node Restriction:** Ensures the root expression is strictly `sqlglot.exp.Select`. Any root DDL, DML, or utility command is immediately rejected.
- **Statement Multiplexing Prevention:** Rejects multiple statements (semicolon delimited / piggybacking) and comment-delimited injection attempts.
- **Recursive AST Traversal:** Walks the entire syntax tree to detect and reject forbidden operations (`Insert`, `Update`, `Delete`, `Drop`, `Alter`, `Command`, `Create`, `TruncateTable`, `Merge`, `Grant`, etc.) even when hidden inside subqueries or Common Table Expressions (CTEs).

---

## 2. Database & Mock Enterprise Data (`seed/init.sql`)

A realistic B2B SaaS relational model:
- `organizations`: Account tiers (`free`, `starter`, `growth`, `enterprise`), monthly spend, timestamps.
- `users`: User identities, organization bindings, RBAC roles (`owner`, `admin`, `member`, `viewer`, `billing_manager`), active status, last login.
- `subscriptions`: Subscription lifecycle (`active`, `trialing`, `past_due`, `canceled`), seat quotas, billing renewal periods.
- `audit_logs`: Enterprise security audit trail tracking logins, permissions updates, API key events, and IP addresses.

### Least-Privilege Role (`readonly_analyst`)
A dedicated PostgreSQL role configured with:
- `CONNECT` on `enterprise_db` and `USAGE` on `public` schema.
- `SELECT` only on all existing public tables.
- `DEFAULT PRIVILEGES` granting `SELECT` on all future tables.
- Explicit `REVOKE` on `CREATE` and write privileges.

---

## 3. Running Unit Tests

Execute the unit tests using `pytest` or `uv`:

```bash
cd backend
pytest -v
```

Or with `uv`:
```bash
uv run pytest -v
```

---

## 4. Booting Database Infrastructure

To start the PostgreSQL 16 database:

```bash
docker compose up -d
```

Verify the database container is healthy:
```bash
docker ps --filter "name=safe-sql-postgres"
```

Connect using the read-only analyst credentials:
```bash
docker exec -it safe-sql-postgres psql -U readonly_analyst -d enterprise_db
```


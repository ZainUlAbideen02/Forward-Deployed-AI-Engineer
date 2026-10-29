# Enterprise Safe SQL Copilot (Phase 1 & Phase 2)

Production-grade, defensive AI SQL Copilot featuring live PostgreSQL catalog schema introspection, structured LLM query generation, AST security guardrails, sandboxed execution, and telemetry-rich REST API endpoints.

---

## Architecture Overview

```
01-enterprise-safe-sql-copilot/
├── docker-compose.yml             # PostgreSQL 16 container ('safe-sql-postgres' on :5432)
├── README.md                      # Architecture and operational guide
├── .gitignore                     # Git ignore rules for caches, envs, and virtual environments
├── seed/
│   └── init.sql                   # B2B SaaS relational schema, 80+ seed rows, and readonly_analyst role
└── backend/
    ├── pyproject.toml             # uv & modern packaging configuration
    ├── README.md                  # Backend testing & execution guide
    ├── .env.example               # Environment variables template
    ├── .env                       # Local environment variables
    ├── app/
    │   ├── api/
    │   │   ├── __init__.py
    │   │   └── routes.py          # REST endpoints under /api/v1 (/schema, /query/*, /copilot)
    │   ├── core/
    │   │   ├── __init__.py
    │   │   ├── config.py          # Pydantic BaseSettings (DSN, timeouts, LLM keys, pools)
    │   │   └── database.py        # Async connection pool & FastAPI lifespan integration
    │   ├── schemas/
    │   │   ├── __init__.py
    │   │   └── query.py           # Strict Pydantic v2 schemas for requests, outputs, and telemetry
    │   ├── services/
    │   │   ├── __init__.py
    │   │   ├── executor.py        # SandboxedSQLExecutor (read-only transactions & timeouts)
    │   │   ├── generator.py       # SQLGenerator (OpenAI/Groq compatible with offline mock mode)
    │   │   ├── guardrail.py       # SQLGuardrail (sqlglot AST security guardrail)
    │   │   └── schema.py          # SchemaIntrospector (PostgreSQL system catalog introspection)
    │   └── main.py                # FastAPI application entrypoint with lifespan pool management
    ├── scripts/
    │   └── verify_db.py           # Database connectivity and role permission verification script
    └── tests/
        ├── __init__.py
        ├── test_api.py            # API integration tests (/health, /guardrail, /copilot)
        ├── test_executor.py       # Sandboxed executor tests (timeout, invalid tables, serialization)
        └── test_guardrail.py      # AST guardrail tests (syntax, CTEs, injection, DDL rejection)
```

---

## Complete Copilot Pipeline (`POST /api/v1/copilot`)

```
User Business Question
         │
         ▼
┌─────────────────────────────┐
│ 1. Dynamic Schema           │ queries information_schema (cached 10m)
│    Introspection            │
└────────┬────────────────────┘
         ▼
┌─────────────────────────────┐
│ 2. Structured LLM           │ OpenAI / Groq API or deterministic mock fallback
│    SQL Generation           │ enforces SQLGenerationOutput schema
└────────┬────────────────────┘
         ▼
┌─────────────────────────────┐
│ 3. Defensive AST            │ sqlglot PostgreSQL dialect parser
│    Security Guardrail       │ verifies SELECT root, rejects DDL/DML, multi-statements
└────────┬────────────────────┘
         │
         ├───────────────────────────────┐
      [SAFE]                          [UNSAFE]
         │                               │
         ▼                               ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ 4. Sandboxed Execution      │  │ Execution Aborted           │
│    - SET TRANSACTION RO     │  │ Error returned to user      │
│    - 2500ms timeout         │  └─────────────────────────────┘
└────────┬────────────────────┘
         ▼
┌─────────────────────────────┐
│ 5. Response + Telemetry     │
│    - Latency breakdown      │
│    - Chart format suggestion│
└─────────────────────────────┘
```

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Runtime system status and database pool readiness. |
| `GET` | `/api/v1/schema` | Returns active database schema formatted as clean Markdown DDL. |
| `POST` | `/api/v1/guardrail/validate` | Validates arbitrary SQL against the defensive AST security guardrail. |
| `POST` | `/api/v1/query/generate` | Translates natural language questions to structured SQL. |
| `POST` | `/api/v1/query/execute` | Validates SQL via guardrail, then executes in the sandboxed transaction. |
| `POST` | `/api/v1/copilot` | End-to-end Forward Deployed AI pipeline with telemetry. |

---

## Defensive Security Architecture

1. **Least-Privilege Database Role (`readonly_analyst`):**
   - Only has `SELECT` privileges on the `public` schema.
   - `CREATE`, `INSERT`, `UPDATE`, `DELETE`, and administrative operations are revoked.
2. **AST Guardrail (`SQLGuardrail`):**
   - Ensures the root syntax node is strictly `sqlglot.exp.Select`.
   - Rejects multiple statements (semicolon delimited) and comment injection.
   - Recursively walks the entire AST (`root.walk()`) to catch nested DML/DDL inside subqueries and CTEs.
3. **Sandboxed Session Enforcement (`SandboxedSQLExecutor`):**
   - Applies `SET default_transaction_read_only = on;` and `SET statement_timeout = '2500ms';`.
   - Executes inside an explicit `SET TRANSACTION READ ONLY` block.
   - Gracefully handles query cancellations and relation errors without crashing.
4. **Structured Offline-Ready Generation (`SQLGenerator`):**
   - Compatible with OpenAI/Groq JSON-mode APIs.
   - Features deterministic mock fallback when `LLM_API_KEY` is absent or set to `"mock"` for 100% reliable CI/CD test automation.

---

## Running Automated Tests

Run the full 24-test verification suite:

```powershell
cd 01-enterprise-safe-sql-copilot/backend
uv run pytest -v
```

---

## Booting Database Infrastructure

To boot the PostgreSQL 16 container with the seeded B2B SaaS dataset:

```powershell
cd 01-enterprise-safe-sql-copilot
docker compose up -d
```

Verify table counts and read-only enforcement:
```powershell
cd backend
uv run python scripts/verify_db.py
```

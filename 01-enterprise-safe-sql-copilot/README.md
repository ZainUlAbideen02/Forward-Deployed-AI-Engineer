# Enterprise Safe SQL Copilot (Phase 1, Phase 2 & Phase 3)

Production-grade, defensive AI SQL Copilot featuring live PostgreSQL catalog schema introspection, structured LLM query generation, AST security guardrails, sandboxed execution, an interactive Next.js 14 Enterprise Dashboard, and full-stack Docker orchestration.

---

## Architecture Overview

```
01-enterprise-safe-sql-copilot/
├── docker-compose.yml             # Multi-container orchestration (DB + Backend + Frontend)
├── README.md                      # Operational and architecture reference
├── .gitignore                     # Git ignore rules for caches, envs, and virtual environments
├── seed/
│   └── init.sql                   # B2B SaaS relational schema, 80+ seed rows, readonly_analyst role
├── backend/
│   ├── Dockerfile                 # Multi-stage Python 3.12 slim builder using uv
│   ├── pyproject.toml             # uv & modern packaging configuration
│   ├── .env.example               # Environment variables template
│   ├── .env                       # Local environment variables
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py          # REST endpoints (/schema, /query/*, /copilot)
│   │   ├── core/
│   │   │   ├── config.py          # Pydantic BaseSettings (DSN, timeouts, LLM keys, pools)
│   │   │   └── database.py        # Asyncpg pool & FastAPI lifespan integration
│   │   ├── schemas/
│   │   │   └── query.py           # Strict Pydantic v2 schemas for requests, outputs, and telemetry
│   │   ├── services/
│   │   │   ├── executor.py        # SandboxedSQLExecutor (read-only transactions & timeouts)
│   │   │   ├── generator.py       # SQLGenerator (OpenAI/Groq compatible with offline mock mode)
│   │   │   ├── guardrail.py       # SQLGuardrail (sqlglot AST security guardrail)
│   │   │   └── schema.py          # SchemaIntrospector (PostgreSQL system catalog introspection)
│   │   └── main.py                # FastAPI entrypoint with lifespan pool management
│   └── tests/
│       ├── test_api.py            # API integration tests (/health, /guardrail, /copilot)
│       ├── test_executor.py       # Sandboxed executor tests (timeout, invalid tables, serialization)
│       └── test_guardrail.py      # AST guardrail tests (syntax, CTEs, injection, DDL rejection)
└── frontend/
    ├── Dockerfile                 # Multi-stage Node 20 alpine runner serving Next.js standalone
    ├── package.json               # Next.js 14, React 18, Tailwind CSS, Recharts, Lucide icons
    ├── .env.local.example         # Frontend API URL configuration
    ├── .env.local                 # Local environment pointing to backend
    └── src/
        ├── app/
        │   ├── globals.css        # Enterprise dark theme styles
        │   ├── layout.tsx         # Root layout with dark mode
        │   └── page.tsx           # Responsive Cockpit dashboard layout
        ├── components/
        │   ├── Header.tsx         # Cockpit banner with /health polling & DB role badge
        │   ├── QueryInput.tsx     # Natural language input with enterprise presets & loading tracker
        │   ├── GuardrailAuditBadge.tsx # AST security verdict panel (safe vs crimson alert)
        │   ├── SQLViewer.tsx      # Collapsible syntax block with complexity & copy action
        │   ├── ResultsVisualizer.tsx   # Toggleable data grid table & dynamic Recharts visualizer
        │   └── TelemetryWaterfall.tsx # Segmented latency progress bar for FDE pipeline stages
        └── types/
            └── index.ts           # TypeScript interfaces matching backend models
```

---

## Complete Copilot Pipeline (`POST /api/v1/copilot`)

```
User Business Question
         │
         ▼
┌─────────────────────────────────┐
│ 1. Dynamic Schema Introspection │ Queries information_schema (10-min TTL caching)
└────────┬────────────────────────┘
         ▼
┌─────────────────────────────────┐
│ 2. Structured LLM SQL Generator │ OpenAI/Groq compatible JSON mode + deterministic offline fallback
└────────┬────────────────────────┘
         ▼
┌─────────────────────────────────┐
│ 3. Defensive AST Guardrail Check│ sqlglot PostgreSQL AST parser (blocks DDL/DML, multi-statements)
└────────┬────────────────────────┘
         │
         ├───────────────────────────────┐
      [SAFE]                          [UNSAFE]
         │                               │
         ▼                               ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│ 4. Sandboxed Transaction        │ │ Execution Aborted               │
│    - SET default_tx_read_only   │ │ Security reason returned        │
│    - SET statement_timeout=2500ms │ └─────────────────────────────────┘
│    - SET TRANSACTION READ ONLY  │
└────────┬────────────────────────┘
         ▼
┌─────────────────────────────────┐
│ 5. Next.js Enterprise Dashboard │
│    - Recharts dynamic charts    │
│    - Paginated data grid        │
│    - Telemetry latency breakdown│
└─────────────────────────────────┘
```

---

## One-Command Full Stack Docker Orchestration

Run all three containers (`PostgreSQL 16` + `FastAPI Backend` + `Next.js 14 Frontend`) in a shared bridge network (`safe-sql-network`):

```powershell
docker compose up -d --build
```

### Services Port Map:
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend & Swagger:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostgreSQL 16 Database:** `localhost:5432` (`enterprise_db`)

---

## Local Development & Testing

### 1. Run Backend Tests (24 passing unit & integration tests)
```powershell
cd backend
uv run pytest -v
```

### 2. Build & Test Next.js Frontend Locally
```powershell
cd frontend
npm install
npm run build
npm run dev
```
Accessible at [http://localhost:3000](http://localhost:3000).

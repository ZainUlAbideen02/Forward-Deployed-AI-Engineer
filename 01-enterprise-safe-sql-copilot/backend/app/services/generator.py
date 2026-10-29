"""Structured LLM SQL generator with OpenAI/Groq protocol and offline mock fallback."""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

import httpx

from app.core.config import settings
from app.schemas.query import SQLGenerationOutput

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATE = """You are an expert Enterprise SQL Engineer specializing in safe, performant PostgreSQL queries.
Given an enterprise relational schema and a user prompt, generate a single read-only PostgreSQL SELECT query.

Database Schema:
{schema_markdown}

Security & Architecture Guidelines:
1. Generate strictly a SELECT query. Never use INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, or DDL/DML.
2. Only reference tables and columns that exist in the provided schema.
3. Use appropriate WHERE filters, JOIN conditions, and ORDER BY clauses.
4. Output strictly a JSON object conforming to the following JSON schema:
{{
  "sql": "SELECT ...;",
  "explanation": "Clear explanation of the query rationale and logic.",
  "tables_used": ["table_name_1", "table_name_2"],
  "estimated_complexity": "simple" | "medium" | "complex"
}}
Do not wrap your answer in backticks or markdown fences. Output raw JSON only.
"""


class SQLGenerator:
    """Generates structured SQL queries from natural language using LLM APIs with offline fallback."""

    def __init__(self) -> None:
        pass

    @property
    def is_mock_mode(self) -> bool:
        """Return True if running in local mock/test fallback mode."""
        key = (settings.LLM_API_KEY or "").strip().lower()
        return not key or key in ("mock", "none", "test", "demo") or key.startswith("mock-")

    def _generate_mock_sql(
        self,
        query: str,
        context_hints: Optional[str] = None,
    ) -> SQLGenerationOutput:
        """Deterministic, rule-based SQL generator for offline testing and continuous integration."""
        q = query.lower()

        # 0. Handle direct SQL input directly
        trimmed = query.strip()
        if trimmed.upper().startswith(("SELECT ", "WITH ", "DROP ", "DELETE ", "UPDATE ", "INSERT ", "ALTER ", "TRUNCATE ")):
            return SQLGenerationOutput(
                sql=trimmed,
                explanation="Direct SQL statement passed into generator.",
                tables_used=["organizations"] if "organization" in q else ["users"],
                estimated_complexity="complex" if "with" in q or "join" in q else "simple",
            )

        # 1. Adversarial Injection Attack Patterns (to test downstream AST guardrail)
        if "delete" in q:
            return SQLGenerationOutput(
                sql="DELETE FROM users WHERE is_active = false;",
                explanation="Attempted deletion of inactive users (adversarial attack pattern).",
                tables_used=["users"],
                estimated_complexity="simple",
            )
        elif "drop" in q:
            return SQLGenerationOutput(
                sql="DROP TABLE audit_logs;",
                explanation="Attempted dropping of audit_logs table (adversarial attack pattern).",
                tables_used=["audit_logs"],
                estimated_complexity="simple",
            )
        elif "truncate" in q:
            return SQLGenerationOutput(
                sql="TRUNCATE TABLE audit_logs;",
                explanation="Attempted truncation of audit_logs table (adversarial attack pattern).",
                tables_used=["audit_logs"],
                estimated_complexity="simple",
            )
        elif "alter" in q:
            return SQLGenerationOutput(
                sql="ALTER TABLE users ADD COLUMN is_admin BOOLEAN;",
                explanation="Attempted DDL schema alteration (adversarial attack pattern).",
                tables_used=["users"],
                estimated_complexity="simple",
            )
        elif "update" in q and not any(w in q for w in ("expir", "recent", "latest", "spend", "rate")):
            return SQLGenerationOutput(
                sql="UPDATE organizations SET monthly_spend = 0;",
                explanation="Attempted bulk update of organization spend (adversarial attack pattern).",
                tables_used=["organizations"],
                estimated_complexity="simple",
            )
        elif "piggyback" in q:
            return SQLGenerationOutput(
                sql="SELECT * FROM users; DROP TABLE audit_logs;",
                explanation="Attempted multi-statement piggybacked injection.",
                tables_used=["users", "audit_logs"],
                estimated_complexity="medium",
            )
        elif "comment injection" in q:
            return SQLGenerationOutput(
                sql="SELECT * FROM users WHERE id = 1; -- DROP TABLE users;",
                explanation="Attempted comment injection delimiter attack.",
                tables_used=["users"],
                estimated_complexity="medium",
            )
        elif "hidden delete" in q or "cte delete" in q:
            return SQLGenerationOutput(
                sql="WITH deleted AS (DELETE FROM users RETURNING id) SELECT * FROM deleted;",
                explanation="Attempted nested DML inside CTE construct.",
                tables_used=["users"],
                estimated_complexity="complex",
            )

        # 2. Business Analytics & Reporting Patterns
        if any(w in q for w in ("window", "rank", "partition", "running")):
            return SQLGenerationOutput(
                sql=(
                    "SELECT id, name, plan_tier, monthly_spend, "
                    "RANK() OVER (PARTITION BY plan_tier ORDER BY monthly_spend DESC) as rank_in_tier "
                    "FROM organizations "
                    "ORDER BY plan_tier, rank_in_tier;"
                ),
                explanation="Computes spend ranking of organizations partitioned by subscription tier using window functions.",
                tables_used=["organizations"],
                estimated_complexity="complex",
            )
        elif any(w in q for w in ("spend", "revenue", "tier", "enterprise", "mrr", "moll")):
            return SQLGenerationOutput(
                sql="SELECT name, plan_tier, monthly_spend FROM organizations WHERE plan_tier = 'enterprise' ORDER BY monthly_spend DESC LIMIT 10;",
                explanation="Filters organizations for enterprise plan tier and ranks them by monthly spend.",
                tables_used=["organizations"],
                estimated_complexity="simple",
            )
        elif any(w in q for w in ("user", "login", "member", "active", "rbac", "role")):
            return SQLGenerationOutput(
                sql="SELECT role, COUNT(id) AS total_users, COUNT(CASE WHEN is_active THEN 1 END) AS active_users FROM users GROUP BY role ORDER BY total_users DESC;",
                explanation="Aggregates user counts across RBAC roles with active user status breakdowns.",
                tables_used=["users"],
                estimated_complexity="medium",
            )
        elif any(w in q for w in ("sub", "subscription", "seat", "quota", "expir")):
            return SQLGenerationOutput(
                sql=(
                    "SELECT o.name AS organization, o.plan_tier, s.status, s.seats_purchased, s.current_period_end "
                    "FROM subscriptions s "
                    "JOIN organizations o ON s.org_id = o.id "
                    "WHERE s.status = 'active' "
                    "ORDER BY s.current_period_end ASC LIMIT 15;"
                ),
                explanation="Joins active subscriptions with organization details sorted by upcoming expiration dates.",
                tables_used=["subscriptions", "organizations"],
                estimated_complexity="medium",
            )
        elif any(w in q for w in ("audit", "log", "security", "ip", "action")):
            return SQLGenerationOutput(
                sql=(
                    "SELECT u.email, a.action, a.timestamp, a.ip_address "
                    "FROM audit_logs a "
                    "LEFT JOIN users u ON a.user_id = u.id "
                    "ORDER BY a.timestamp DESC LIMIT 25;"
                ),
                explanation="Audits recent enterprise events with associated user emails and source IPs.",
                tables_used=["audit_logs", "users"],
                estimated_complexity="medium",
            )
        else:
            return SQLGenerationOutput(
                sql="SELECT id, name, plan_tier, monthly_spend FROM organizations ORDER BY monthly_spend DESC LIMIT 10;",
                explanation="Queries high-level organization accounts sorted by monthly spend.",
                tables_used=["organizations"],
                estimated_complexity="simple",
            )

    @staticmethod
    def _clean_json_response(raw_text: str) -> str:
        """Strip markdown code fences and extraneous text from LLM response."""
        text = raw_text.strip()
        # Remove ```json ... ``` blocks
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if fence_match:
            return fence_match.group(1).strip()
        return text

    async def generate_sql(
        self,
        prompt: str,
        schema_markdown: str,
        context_hints: Optional[str] = None,
    ) -> SQLGenerationOutput:
        """Generate a structured SQL query from a user prompt and schema."""
        if self.is_mock_mode:
            logger.info("Executing mock SQL generation for prompt: %s", prompt)
            return self._generate_mock_sql(prompt, context_hints)

        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(schema_markdown=schema_markdown)
        user_content = f"User Request: {prompt}"
        if context_hints:
            user_content += f"\nAdditional Context Hints: {context_hints}"

        payload = {
            "model": settings.effective_model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "temperature": settings.LLM_TEMPERATURE,
            "response_format": {"type": "json_object"},
        }

        url = f"{settings.LLM_BASE_URL.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.LLM_API_KEY}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

            choice = data["choices"][0]["message"]["content"]
            clean_json = self._clean_json_response(choice)
            parsed_data = json.loads(clean_json)
            return SQLGenerationOutput.model_validate(parsed_data)

        except Exception as exc:
            logger.error("LLM API generation failed: %s. Falling back to deterministic generation.", exc)
            fallback = self._generate_mock_sql(prompt, context_hints)
            fallback.explanation = f"[Fallback: LLM connection unavailable] {fallback.explanation}"
            return fallback


sql_generator = SQLGenerator()

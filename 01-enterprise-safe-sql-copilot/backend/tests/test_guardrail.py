"""Defensive security tests for SQLGuardrail AST verification."""

import pytest
from app.services.guardrail import SQLGuardrail


@pytest.fixture
def guardrail() -> SQLGuardrail:
    """Fixture providing a configured SQLGuardrail instance."""
    return SQLGuardrail()


# -----------------------------------------------------------------------------
# 1. Required Core Tests (Prompt Specifications)
# -----------------------------------------------------------------------------

def test_valid_basic_select(guardrail: SQLGuardrail) -> None:
    """Valid basic SELECT statement must be allowed."""
    query = "SELECT * FROM organizations WHERE monthly_spend > 500;"
    is_safe, reason = guardrail.validate_query(query)
    assert is_safe is True
    assert reason is None


def test_valid_cte_select(guardrail: SQLGuardrail) -> None:
    """Valid Common Table Expression (CTE) SELECT must be allowed."""
    query = (
        "WITH active_orgs AS ("
        "  SELECT id FROM organizations WHERE plan_tier = 'enterprise'"
        ") "
        "SELECT * FROM active_orgs;"
    )
    is_safe, reason = guardrail.validate_query(query)
    assert is_safe is True
    assert reason is None


def test_malicious_drop_rejected(guardrail: SQLGuardrail) -> None:
    """Direct DROP statement must be explicitly rejected."""
    query = "DROP TABLE users;"
    is_safe, reason = guardrail.validate_query(query)
    assert is_safe is False
    assert reason is not None
    assert "Root query expression must strictly be a SELECT statement" in reason or "Drop" in reason


def test_piggybacked_statement_rejected(guardrail: SQLGuardrail) -> None:
    """Piggybacked statement injection via semicolon must be rejected."""
    query = "SELECT * FROM users; DROP TABLE audit_logs;"
    is_safe, reason = guardrail.validate_query(query)
    assert is_safe is False
    assert reason is not None
    assert "Multiple statements detected" in reason


def test_comment_injection_rejected(guardrail: SQLGuardrail) -> None:
    """Comment injection with semicolon delimiter must be rejected."""
    query = "SELECT * FROM users WHERE id = 1; -- DROP TABLE users;"
    is_safe, reason = guardrail.validate_query(query)
    assert is_safe is False
    assert reason is not None
    assert "Multiple statements detected" in reason


def test_subquery_with_dml_rejected(guardrail: SQLGuardrail) -> None:
    """Subquery containing inline DML must be rejected."""
    query = "SELECT * FROM users WHERE org_id IN (DELETE FROM organizations RETURNING id);"
    is_safe, reason = guardrail.validate_query(query)
    assert is_safe is False
    assert reason is not None
    assert "Invalid PostgreSQL syntax" in reason or "Disallowed operation" in reason


def test_disallowed_ddl_alter_rejected(guardrail: SQLGuardrail) -> None:
    """DDL ALTER statement must be explicitly rejected."""
    query = "ALTER TABLE users ADD COLUMN is_admin BOOLEAN;"
    is_safe, reason = guardrail.validate_query(query)
    assert is_safe is False
    assert reason is not None
    assert "Root query expression must strictly be a SELECT statement" in reason or "Alter" in reason


# -----------------------------------------------------------------------------
# 2. Additional In-Depth Defensive Tests
# -----------------------------------------------------------------------------

def test_cte_with_hidden_delete_rejected(guardrail: SQLGuardrail) -> None:
    """Valid CTE syntax with nested DELETE operation must be caught by AST traversal."""
    query = (
        "WITH deleted AS ("
        "  DELETE FROM organizations WHERE id = 10 RETURNING id"
        ") "
        "SELECT * FROM users WHERE org_id IN (SELECT id FROM deleted);"
    )
    is_safe, reason = guardrail.validate_query(query)
    assert is_safe is False
    assert reason is not None
    assert "Disallowed operation detected" in reason
    assert "Delete" in reason


def test_insert_statement_rejected(guardrail: SQLGuardrail) -> None:
    """INSERT statement must be rejected."""
    query = "INSERT INTO users (org_id, full_name, email, role) VALUES (1, 'Eve', 'eve@hacker.io', 'admin');"
    is_safe, reason = guardrail.validate_query(query)
    assert is_safe is False
    assert reason is not None
    assert "Root query expression must strictly be a SELECT statement" in reason


def test_update_statement_rejected(guardrail: SQLGuardrail) -> None:
    """UPDATE statement must be rejected."""
    query = "UPDATE users SET is_active = false WHERE org_id = 1;"
    is_safe, reason = guardrail.validate_query(query)
    assert is_safe is False
    assert reason is not None
    assert "Root query expression must strictly be a SELECT statement" in reason


def test_truncate_statement_rejected(guardrail: SQLGuardrail) -> None:
    """TRUNCATE statement must be rejected."""
    query = "TRUNCATE TABLE audit_logs;"
    is_safe, reason = guardrail.validate_query(query)
    assert is_safe is False
    assert reason is not None


def test_create_table_rejected(guardrail: SQLGuardrail) -> None:
    """CREATE TABLE statement must be rejected."""
    query = "CREATE TABLE backdoor_users (id INT, secret TEXT);"
    is_safe, reason = guardrail.validate_query(query)
    assert is_safe is False
    assert reason is not None


def test_empty_and_whitespace_query(guardrail: SQLGuardrail) -> None:
    """Empty or whitespace-only queries must fail validation cleanly."""
    assert guardrail.validate_query("")[0] is False
    assert guardrail.validate_query("   \n\t  ")[0] is False


def test_valid_complex_analytics_query(guardrail: SQLGuardrail) -> None:
    """Complex enterprise SELECT with joins, aggregations, and subqueries is safe."""
    query = """
    SELECT 
        o.id,
        o.name,
        o.plan_tier,
        COUNT(u.id) AS total_users,
        MAX(u.last_login) AS most_recent_login
    FROM organizations o
    LEFT JOIN users u ON o.id = u.org_id
    WHERE o.monthly_spend >= 1000.00
      AND o.id IN (SELECT org_id FROM subscriptions WHERE status = 'active')
    GROUP BY o.id, o.name, o.plan_tier
    ORDER BY total_users DESC
    LIMIT 10;
    """
    is_safe, reason = guardrail.validate_query(query)
    assert is_safe is True
    assert reason is None


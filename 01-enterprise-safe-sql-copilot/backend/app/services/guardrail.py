"""AST Security Guardrail for enterprise SQL queries using sqlglot."""

from __future__ import annotations

import sqlglot
from sqlglot import exp
from sqlglot.errors import ParseError


class SQLGuardrail:
    """Defensive AST security guardrail for SQL queries.

    Validates that incoming queries are strictly single read-only SELECT statements,
    disallowing any DDL/DML, piggybacked statements, or hidden destructive clauses.
    """

    # Explicitly forbidden AST node types covering DDL, DML, and command execution
    FORBIDDEN_EXPRESSION_TYPES: tuple[type[exp.Expression], ...] = (
        exp.Insert,
        exp.Update,
        exp.Delete,
        exp.Drop,
        exp.Alter,
        exp.Command,
        exp.Create,
        exp.Merge,
        exp.TruncateTable,
        exp.Grant,
        exp.Revoke,
        exp.Set,
        exp.Pragma,
    )

    def validate_query(self, sql: str) -> tuple[bool, str | None]:
        """Validate an SQL statement against security rules.

        Args:
            sql: Raw SQL query string to validate.

        Returns:
            A tuple of (is_safe, error_message).
            - (True, None) if the query passes all security checks.
            - (False, "Detailed security reason") if the query is unsafe or invalid.
        """
        if not sql or not sql.strip():
            return False, "Security violation: Query string cannot be empty."

        # 1. Parse using PostgreSQL dialect with strict error raising
        try:
            parsed = sqlglot.parse(
                sql,
                read="postgres",
                error_level=sqlglot.ErrorLevel.RAISE,
            )
        except ParseError as exc:
            return False, f"Security violation: Invalid PostgreSQL syntax ({exc})."
        except Exception as exc:
            return False, f"Security violation: Query failed to parse ({exc})."

        # 2. Reject queries containing no valid statements
        statements = [stmt for stmt in parsed if stmt is not None]
        if not statements:
            return False, "Security violation: No valid SQL statements detected."

        # 3. Reject multiple statements (piggybacked statements / semicolon delimited)
        if len(statements) > 1:
            return (
                False,
                f"Security violation: Multiple statements detected ({len(statements)}). "
                "Only single statements are permitted.",
            )

        root = statements[0]

        # 4. Strictly verify that the root expression is sqlglot.exp.Select
        if not isinstance(root, exp.Select):
            return (
                False,
                f"Security violation: Root query expression must strictly be a SELECT statement. "
                f"Detected forbidden root type: '{type(root).__name__}'.",
            )

        # 5. Recursively walk AST to detect forbidden DDL/DML anywhere (CTEs, subqueries)
        for node in root.walk():
            if isinstance(node, self.FORBIDDEN_EXPRESSION_TYPES):
                node_type = type(node).__name__
                return (
                    False,
                    f"Security violation: Disallowed operation detected. "
                    f"Forbidden expression type '{node_type}' is not permitted.",
                )

        return True, None


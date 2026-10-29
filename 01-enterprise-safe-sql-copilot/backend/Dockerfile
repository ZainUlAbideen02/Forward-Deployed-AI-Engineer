# -----------------------------------------------------------------------------
# Stage 1: Builder using uv for fast, deterministic dependency resolution
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv binary from official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

COPY pyproject.toml README.md uv.lock* ./

# Install project dependencies into isolated virtual environment
RUN uv venv /app/.venv && \
    uv pip install --no-cache -r pyproject.toml

# -----------------------------------------------------------------------------
# Stage 2: Minimalist, hardened production runner
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS runner

WORKDIR /app

# Create unprivileged application user
RUN groupadd -r copilot && useradd -r -g copilot -s /bin/false copilot

# Copy virtual environment and application package
COPY --from=builder /app/.venv /app/.venv
COPY app /app/app
COPY .env* /app/

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

USER copilot

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

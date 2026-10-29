from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "Enterprise Safe SQL Copilot"
    ENVIRONMENT: str = "development"

    # PostgreSQL Connection Details (Default to least-privilege readonly role)
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "enterprise_db"
    POSTGRES_USER: str = "readonly_analyst"
    POSTGRES_PASSWORD: str = "readonly_analyst_password"
    POSTGRES_ADMIN_USER: str = "postgres"
    POSTGRES_ADMIN_PASSWORD: str = "postgres_password"

    # Database Pool Settings
    DB_POOL_MIN_SIZE: int = 2
    DB_POOL_MAX_SIZE: int = 10
    DB_POOL_TIMEOUT: float = 10.0

    # Optional explicit connection URLs (e.g. for external DB instances)
    DATABASE_URL: str | None = None

    # LLM Settings (OpenAI / Groq / Compatible endpoint)
    LLM_API_KEY: str = ""
    LLM_MODEL_NAME: str = "gpt-4o-mini"
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    LLM_TEMPERATURE: float = 0.0

    # Security & Operation Timeouts
    QUERY_TIMEOUT_SECONDS: int = 30
    STATEMENT_TIMEOUT_MS: int = 2500
    REQUEST_TIMEOUT_SECONDS: int = 60
    MAX_ROWS_LIMIT: int = 1000
    SCHEMA_CACHE_TTL_SECONDS: int = 600  # 10 minutes

    @computed_field
    @property
    def postgres_dsn(self) -> str:
        """Asyncpg compatible connection DSN using the least-privilege role."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @computed_field
    @property
    def admin_postgres_dsn(self) -> str:
        """DSN for administrative actions (e.g. migrations/provisioning)."""
        return (
            f"postgresql://{self.POSTGRES_ADMIN_USER}:{self.POSTGRES_ADMIN_PASSWORD}@"
            f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def effective_model_name(self) -> str:
        """Return the configured model name."""
        return self.LLM_MODEL_NAME or self.LLM_MODEL or "gpt-4o-mini"


settings = Settings()

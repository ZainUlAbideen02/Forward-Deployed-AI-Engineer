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

    # Optional explicit connection URLs (e.g. for external DB instances)
    DATABASE_URL: str | None = None

    # LLM Settings
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-pro"
    LLM_PROVIDER: str = "google"

    # Security & Operation Timeouts
    QUERY_TIMEOUT_SECONDS: int = 30
    REQUEST_TIMEOUT_SECONDS: int = 60
    MAX_ROWS_LIMIT: int = 1000

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


settings = Settings()


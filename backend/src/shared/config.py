from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # 1. Server settings
    ENV: str = Field(default="development", description="Environment mode")
    BACKEND_PORT: int = Field(default=8000, description="Backend port")

    # 2. PostgreSQL Database URL
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://coursera_admin:coursera_password123@localhost:5432/coursera_lms",
        description="Async PostgreSQL connection URL",
    )

    # 3. MinIO / S3 Object Storage credentials for SDK Client & Presigned URLs
    MINIO_ENDPOINT: str = Field(default="http://localhost:9000", description="MinIO endpoint URL")
    MINIO_ACCESS_KEY: str = Field(default="minio_admin", description="MinIO access key / root user")
    MINIO_SECRET_KEY: str = Field(default="minio_password123", description="MinIO secret key / root password")
    MINIO_BUCKET_NAME: str = Field(default="coursera-assets", description="Default bucket name")
    MINIO_SECURE: bool = Field(default=False, description="Use HTTPS for MinIO connection")

    # 4. JWT Authentication
    JWT_SECRET: str = Field(default="coursera_secret_key_2026", description="JWT secret key")

    @property
    def async_database_url(self) -> str:
        """Ensure database connection URL uses asyncpg driver format."""
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

@lru_cache()
def get_settings() -> Settings:
    """Return cached singleton instance of application Settings."""
    return Settings()

settings = get_settings()

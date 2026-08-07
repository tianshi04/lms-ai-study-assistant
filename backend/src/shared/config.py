from functools import lru_cache
from typing import Optional

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

    # 2. PostgreSQL Database URL & Redis Cache/Broker URL
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://coursera_admin:coursera_password123@localhost:5432/coursera_lms",
        description="Async PostgreSQL connection URL",
    )
    REDIS_URL: str = Field(
        default="redis://localhost:6379",
        description="Redis connection URL for caching and message broker",
    )

    # 3. MinIO / S3 Object Storage credentials for SDK Client & Presigned URLs
    MINIO_ENDPOINT: str = Field(
        default="http://localhost:9090", description="MinIO endpoint URL"
    )
    MINIO_PUBLIC_ENDPOINT: str = Field(
        default="http://localhost:8000",
        description="MinIO public endpoint URL for client access",
    )
    MINIO_ACCESS_KEY: str = Field(
        default="minio_admin", description="MinIO access key / root user"
    )
    MINIO_SECRET_KEY: str = Field(
        default="minio_password123", description="MinIO secret key / root password"
    )
    MINIO_BUCKET_NAME: str = Field(
        default="coursera-assets", description="Default bucket name"
    )
    MINIO_SECURE: bool = Field(
        default=False, description="Use HTTPS for MinIO connection"
    )

    # 4. JWT Authentication
    JWT_SECRET: str = Field(
        default="coursera_super_secret_jwt_key_production_2026_x99_secure_hmac_sha256",
        description="JWT secret key",
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=60,
        description="Access token expiration in minutes",
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
        description="Refresh token expiration in days",
    )

    # 5. OpenTelemetry & Jaeger Observability
    OTEL_EXPORTER_OTLP_ENDPOINT: Optional[str] = Field(
        default=None,
        description="OpenTelemetry OTLP Collector Endpoint (e.g. http://localhost:4317)",
    )

    # 6. VNPay Sandbox Gateway Configuration
    VNPAY_TMN_CODE: str = Field(
        default="PLM6WVVN",
        description="VNPay Merchant Terminal Code (vnp_TmnCode)",
    )
    VNPAY_HASH_SECRET: str = Field(
        default="MLQIAARTMNPRIGVBPAFCRFVCASOBHRTS",
        description="VNPay Secret Key for HMAC-SHA512 checksum calculation",
    )
    VNPAY_PAYMENT_URL: str = Field(
        default="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
        description="VNPay Sandbox Payment Endpoint URL",
    )
    VNPAY_RETURN_URL: str = Field(
        default="http://localhost:3000/payment/vnpay-return",
        description="Default Client Return URL after VNPay transaction",
    )
    VNPAY_API_URL: str = Field(
        default="https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
        description="VNPay Merchant WebAPI Endpoint",
    )

    # 7. Google OAuth 2.0
    GOOGLE_CLIENT_ID: str = Field(default="", description="Google OAuth 2.0 Client ID")
    GOOGLE_CLIENT_SECRET: str = Field(
        default="", description="Google OAuth 2.0 Client Secret (Server-side only)"
    )

    # 8. Dev Mode
    ENABLE_DEV_MOCK: bool = Field(
        default=False,
        description="Cho phép Dev Mode Mock (Google Auth giả lập). KHÔNG BẬT ở Production!",
    )

    @property
    def async_database_url(self) -> str:
        """Ensure database connection URL uses asyncpg driver format."""
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    """Return cached Settings instance."""
    return Settings()


settings = get_settings()

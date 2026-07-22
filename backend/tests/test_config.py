from src.shared.config import get_settings, settings

def test_settings_load_defaults():
    """Verify essential default configuration settings are loaded properly."""
    config = get_settings()
    assert config.ENV == "development"
    assert config.BACKEND_PORT == 8000
    assert config.MINIO_ENDPOINT == "http://localhost:9000"
    assert config.MINIO_ACCESS_KEY == "minio_admin"
    assert config.MINIO_SECRET_KEY == "minio_password123"
    assert config.MINIO_BUCKET_NAME == "coursera-assets"
    assert config.async_database_url.startswith("postgresql+asyncpg://")

def test_singleton_settings_instance():
    """Verify settings singleton instance identity."""
    assert settings.JWT_SECRET == "coursera_super_secret_jwt_key_production_2026_x99_secure_hmac_sha256"

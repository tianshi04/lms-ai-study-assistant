from src.shared.config import Settings, settings


def test_settings_load_defaults(monkeypatch):
    """Verify essential default configuration settings are loaded properly."""
    for key in [
        "ENV",
        "BACKEND_HOST",
        "BACKEND_PORT",
        "MINIO_ENDPOINT",
        "MINIO_ACCESS_KEY",
        "MINIO_SECRET_KEY",
        "MINIO_BUCKET_NAME",
        "CORS_ORIGIN_REGEX",
    ]:
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setitem(Settings.model_config, "env_file", None)
    config = Settings()
    assert config.ENV == "development"
    assert config.BACKEND_HOST == "0.0.0.0"
    assert config.BACKEND_PORT == 8000
    assert config.CORS_ORIGIN_REGEX == ""
    assert config.MINIO_ENDPOINT == "http://localhost:9000"
    assert config.MINIO_ACCESS_KEY == "minio_admin"
    assert config.MINIO_SECRET_KEY == "minio_password123"
    assert config.MINIO_BUCKET_NAME == "coursera-assets"
    assert config.async_database_url.startswith("postgresql+asyncpg://")


def test_singleton_settings_instance():
    """Verify settings singleton instance identity."""
    assert (
        settings.JWT_SECRET
        == "coursera_super_secret_jwt_key_production_2026_x99_secure_hmac_sha256"
    )


def test_is_allowed_origin_uses_exact_match():
    """CORS origin checks must be exact matches, never substring matches on the raw string."""
    config = Settings(
        FRONTEND_URL="https://app.example.com/",
        CORS_ORIGINS="http://localhost:3000, https://admin.example.com",
    )
    assert config.is_allowed_origin("http://localhost:3000")
    assert config.is_allowed_origin("https://app.example.com")
    assert config.is_allowed_origin("https://admin.example.com")
    # Substrings / prefixes of allowed origins must be rejected
    assert not config.is_allowed_origin("http://localhost:300")
    assert not config.is_allowed_origin("localhost")
    assert not config.is_allowed_origin("https://admin.example.co")
    assert not config.is_allowed_origin("")


def test_is_allowed_origin_model_1_same_domain():
    """In Model 1 (Same Domain), only exact allow-listed origins pass, no regex by default."""
    config = Settings(
        FRONTEND_URL="https://my-lms.vn",
        CORS_ORIGINS="https://my-lms.vn",
    )
    assert config.is_allowed_origin("https://my-lms.vn")
    assert not config.is_allowed_origin("https://evil.com")
    assert not config.is_allowed_origin("https://random.vercel.app")


def test_is_allowed_origin_custom_regex_scope():
    """Regex scope allows matching custom patterns when explicitly configured."""
    config = Settings(
        CORS_ORIGIN_REGEX=r"^https://lms-ai-study-assistant(-[a-zA-Z0-9_-]+)?\.vercel\.app$"
    )
    assert config.is_allowed_origin("https://lms-ai-study-assistant.vercel.app")
    assert config.is_allowed_origin(
        "https://lms-ai-study-assistant-git-main-team.vercel.app"
    )
    assert not config.is_allowed_origin("https://evil.vercel.app")
    assert not config.is_allowed_origin(
        "https://lms-ai-study-assistant.vercel.app.evil.com"
    )

"""Root pytest configuration module for backend test suite."""

import os
import socket
from functools import lru_cache
from urllib.parse import urlparse

import pytest

from src.modules.notification.application.event_handlers import (
    register_notification_event_handlers,
)
from src.shared.config import settings


@lru_cache(maxsize=1)
def is_postgres_online(timeout: float = 0.2) -> bool:
    """Fast TCP socket probe to verify if PostgreSQL is accepting connections."""
    try:
        db_url = settings.DATABASE_URL
        for prefix in ("postgresql+asyncpg://", "postgresql://"):
            if db_url.startswith(prefix):
                db_url = "http://" + db_url[len(prefix) :]
                break
        parsed = urlparse(db_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 5432

        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def check_postgres_available() -> None:
    """Helper to check if PostgreSQL is available, or fail in CI / skip locally."""
    if not is_postgres_online():
        if os.getenv("CI") == "true":
            pytest.fail(
                "PostgreSQL is unreachable in CI environment! Check docker compose / make infra step."
            )
        pytest.skip(
            "PostgreSQL container is offline (port 5432 unreachable). Run 'make infra' to enable DB tests."
        )


@lru_cache(maxsize=1)
def is_minio_online(timeout: float = 0.2) -> bool:
    """Fast TCP socket probe to verify if MinIO is accepting connections."""
    try:
        parsed = urlparse(settings.MINIO_ENDPOINT)
        host = parsed.hostname or "localhost"
        port = parsed.port or 9000

        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def check_minio_available() -> None:
    """Helper to check if MinIO is available, or fail in CI / skip locally."""
    if not is_minio_online():
        if os.getenv("CI") == "true":
            pytest.fail(
                "MinIO is unreachable in CI environment! Check docker compose / make infra step."
            )
        pytest.skip(
            "MinIO container is offline (port 9000 unreachable). Run 'make infra' to enable S3 storage tests."
        )


@pytest.fixture(autouse=True, scope="session")
def setup_event_bus() -> None:
    """Ensure all DomainEvent subscribers are registered across test suites."""
    register_notification_event_handlers()

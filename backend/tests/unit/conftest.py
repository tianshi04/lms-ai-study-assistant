"""Pytest configuration and cleanup fixtures for unit tests."""

import pytest_asyncio
import src.shared.infrastructure.database as db_module


@pytest_asyncio.fixture(autouse=True)
async def cleanup_engine():
    """Dispose singleton DB engine after each unit test to prevent unawaited asyncpg connection warnings."""
    yield
    await db_module.dispose_engine()

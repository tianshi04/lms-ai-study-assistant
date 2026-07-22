import pytest_asyncio
from src.shared.infrastructure.database import dispose_engine


@pytest_asyncio.fixture(autouse=True)
async def cleanup_engine():
    """Ensure engine pool is properly disposed after each test."""
    yield
    await dispose_engine()

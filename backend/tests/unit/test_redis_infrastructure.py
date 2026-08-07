import pytest
from src.shared.config import settings
from src.shared.infrastructure.redis import close_redis_client, get_redis_client


@pytest.mark.asyncio
async def test_redis_client_singleton_and_close():
    """Test that get_redis_client creates a singleton client and close_redis_client resets it."""
    client1 = await get_redis_client()
    client2 = await get_redis_client()

    assert client1 is client2
    assert client1.connection_pool.connection_kwargs["host"] in (
        "localhost",
        "redis",
    ) or settings.REDIS_URL.startswith("redis://")

    await close_redis_client()

    client3 = await get_redis_client()
    assert client3 is not client1

    await close_redis_client()

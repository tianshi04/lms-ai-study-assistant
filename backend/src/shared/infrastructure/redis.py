"""Shared Async Redis infrastructure module for caching and message broker connections."""

import logging

from redis.asyncio import Redis, from_url

from src.shared.config import settings

logger = logging.getLogger(__name__)

_redis_client: Redis | None = None


async def get_redis_client() -> Redis:
    """Return singleton async Redis client instance."""
    global _redis_client
    if _redis_client is None:
        logger.info(
            "[REDIS] Initializing async Redis connection: %s", settings.REDIS_URL
        )
        _redis_client = from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def close_redis_client() -> None:
    """Close active async Redis client connection pool."""
    global _redis_client
    if _redis_client is not None:
        logger.info("[REDIS] Closing async Redis connection pool...")
        try:
            await _redis_client.aclose()
        except Exception:  # noqa: BLE001, S110
            pass
        _redis_client = None
        logger.info("[REDIS] Async Redis connection pool closed.")

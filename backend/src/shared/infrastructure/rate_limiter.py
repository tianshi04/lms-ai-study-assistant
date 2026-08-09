"""Rate limiter using Redis sliding window counter for brute-force protection."""

import logging

from src.shared.infrastructure.redis import get_redis_client
from src.modules.identity.domain.constants import (
    LOGIN_MAX_ATTEMPTS,
    LOGIN_LOCKOUT_SECONDS,
)

logger = logging.getLogger(__name__)


async def check_login_rate_limit(identifier: str) -> tuple[bool, int]:
    """Check if login attempt is allowed for the given identifier (email).

    Returns:
        (is_allowed, remaining_seconds_if_blocked).
        If blocked, remaining_seconds > 0 indicates how long until unblocked.
    """
    try:
        redis = await get_redis_client()
        key = f"login_attempts:{identifier}"

        attempts = await redis.get(key)
        if attempts is not None and int(attempts) >= LOGIN_MAX_ATTEMPTS:
            ttl = await redis.ttl(key)
            logger.warning(
                "[RATE_LIMIT] Login blocked for identifier=%s (attempts=%s, ttl=%ss)",
                identifier,
                attempts,
                ttl,
            )
            return False, max(ttl, 0)
    except Exception as exc:
        logger.warning(
            "[RATE_LIMIT] Redis error in check_login_rate_limit, failing open: %s", exc
        )

    return True, 0


async def record_failed_login(identifier: str) -> None:
    """Increment the failed login counter for the given identifier."""
    try:
        redis = await get_redis_client()
        key = f"login_attempts:{identifier}"

        pipe = redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, LOGIN_LOCKOUT_SECONDS)
        await pipe.execute()

        logger.info("[RATE_LIMIT] Recorded failed login for identifier=%s", identifier)
    except Exception as exc:
        logger.warning("[RATE_LIMIT] Redis error in record_failed_login: %s", exc)


async def clear_login_attempts(identifier: str) -> None:
    """Clear the failed login counter after a successful login."""
    try:
        redis = await get_redis_client()
        key = f"login_attempts:{identifier}"
        await redis.delete(key)
    except Exception as exc:
        logger.warning("[RATE_LIMIT] Redis error in clear_login_attempts: %s", exc)

"""Pure helpers for daily time-series trends shown on the admin dashboard."""

from datetime import UTC, date, datetime, timedelta

TREND_DAYS_DEFAULT = 30
TREND_DAYS_MAX = 365
# Length of the ``YYYY-MM-DD`` prefix of the ISO-8601 timestamps stored as strings.
TREND_DATE_PREFIX_LEN = 10


def normalize_trend_days(days: int) -> int:
    """Clamp a client-supplied window size to ``1..TREND_DAYS_MAX`` (0/negative → default)."""
    if days <= 0:
        return TREND_DAYS_DEFAULT
    return min(days, TREND_DAYS_MAX)


def build_trend_window(days: int, today: date | None = None) -> list[str]:
    """Return ``days`` consecutive UTC dates (``YYYY-MM-DD``) ending at ``today``, oldest first."""
    end = today or datetime.now(UTC).date()
    return [
        (end - timedelta(days=offset)).isoformat() for offset in range(days - 1, -1, -1)
    ]

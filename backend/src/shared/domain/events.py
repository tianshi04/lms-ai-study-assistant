from dataclasses import dataclass, field
from datetime import UTC, datetime

from uuid6 import uuid7


@dataclass
class DomainEvent:
    event_id: str = field(default_factory=lambda: str(uuid7()))
    occurred_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())

import inspect
import logging
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Any, ClassVar, TypeVar

from src.shared.domain.events import DomainEvent

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=DomainEvent)
EventHandler = Callable[[Any], Awaitable[None] | None]


class EventBus:
    """In-Memory Domain Event Bus for decoupling cross-module asynchronous domain reactions."""

    _subscribers: ClassVar[dict[type[DomainEvent], list[EventHandler]]] = defaultdict(
        list
    )

    @classmethod
    def subscribe(
        cls,
        event_type: type[T],
        handler: Callable[[T], Awaitable[None] | None],
    ) -> None:
        """Register an event handler for a specific DomainEvent type."""
        if handler not in cls._subscribers[event_type]:
            cls._subscribers[event_type].append(handler)  # type: ignore[arg-type]

    @classmethod
    async def publish(cls, event: DomainEvent) -> None:
        """Publish a domain event to all subscribed handlers with error isolation."""
        event_type = type(event)
        handlers = cls._subscribers.get(event_type, [])
        for handler in handlers:
            try:
                res = handler(event)
                if inspect.isawaitable(res):
                    await res
            except Exception:
                logger.exception(
                    "Error executing event handler '%s' for event '%s'",
                    getattr(handler, "__name__", str(handler)),
                    event_type.__name__,
                )

    @classmethod
    def clear(cls) -> None:
        """Clear all registered event subscribers (primarily for testing)."""
        cls._subscribers.clear()

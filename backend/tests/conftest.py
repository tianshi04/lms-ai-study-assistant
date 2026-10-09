"""Root pytest configuration module for backend test suite."""

import pytest

from src.modules.notification.application.event_handlers import (
    register_notification_event_handlers,
)


@pytest.fixture(autouse=True, scope="session")
def setup_event_bus() -> None:
    """Ensure all DomainEvent subscribers are registered across test suites."""
    register_notification_event_handlers()

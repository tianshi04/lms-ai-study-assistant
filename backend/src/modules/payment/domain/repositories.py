"""Domain repository interface for Payment module."""

from abc import ABC, abstractmethod
from typing import Optional

from src.modules.payment.domain.entities import CoursePurchase, UserSubscription


class IPaymentRepository(ABC):
    @abstractmethod
    async def save_purchase(self, purchase: CoursePurchase) -> CoursePurchase:
        """Persists a course purchase entity."""
        pass

    @abstractmethod
    async def has_active_purchase(self, user_id: str, course_id: str) -> bool:
        """Checks if a user has a completed purchase for a specific course."""
        pass

    @abstractmethod
    async def save_subscription(
        self, subscription: UserSubscription
    ) -> UserSubscription:
        """Persists a user subscription entity."""
        pass

    @abstractmethod
    async def get_active_subscription(self, user_id: str) -> Optional[UserSubscription]:
        """Fetches active, non-expired subscription for a user if exists."""
        pass

    @abstractmethod
    async def list_user_purchases(self, user_id: str) -> list[CoursePurchase]:
        """Lists all purchases made by a user."""
        pass

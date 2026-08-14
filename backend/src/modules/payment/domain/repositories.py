"""Domain repository interface for Payment module."""

from abc import ABC, abstractmethod

from src.modules.payment.domain.entities import (
    CoursePurchase,
    PaymentOrder,
    PaymentOrderStatus,
    PaymentTargetType,
    PaymentTransaction,
    PlanType,
    UserSubscription,
)


class IPaymentRepository(ABC):
    @abstractmethod
    async def save_purchase(self, purchase: CoursePurchase) -> CoursePurchase | None:
        """Persists a course purchase entity, returns None if duplicate."""

    @abstractmethod
    async def has_active_purchase(self, user_id: str, course_id: str) -> bool:
        """Checks if a user has a completed purchase for a specific course."""

    @abstractmethod
    async def save_subscription(
        self, subscription: UserSubscription
    ) -> UserSubscription:
        """Persists a user subscription entity."""

    @abstractmethod
    async def get_active_subscription(self, user_id: str) -> UserSubscription | None:
        """Fetches active, non-expired subscription for a user if exists."""

    @abstractmethod
    async def get_user_subscription(self, user_id: str) -> UserSubscription | None:
        """Fetches latest subscription row for a user regardless of status or expiration."""

    @abstractmethod
    async def list_user_purchases(self, user_id: str) -> list[CoursePurchase]:
        """Lists all purchases made by a user."""

    @abstractmethod
    async def save_order(self, order: PaymentOrder) -> PaymentOrder:
        """Persists a payment order entity."""

    @abstractmethod
    async def get_order_by_txn_ref(self, vnp_txn_ref: str) -> PaymentOrder | None:
        """Retrieves order by VNPay transaction reference ID."""

    @abstractmethod
    async def get_order_by_txn_ref_for_update(
        self, vnp_txn_ref: str
    ) -> PaymentOrder | None:
        """Retrieves order by VNPay transaction reference ID with pessimistic DB row lock."""

    @abstractmethod
    async def get_active_pending_order(
        self,
        user_id: str,
        target_type: PaymentTargetType,
        target_id: str,
        plan_type: PlanType = PlanType.UNSPECIFIED,
        reuse_ttl_minutes: int = 15,
    ) -> PaymentOrder | None:
        """Retrieves unexpired PENDING order for the target item to enable order reuse."""

    @abstractmethod
    async def list_pending_orders_older_than(
        self, window_minutes: int = 15, limit: int = 50
    ) -> list[PaymentOrder]:
        """Lists PENDING orders created more than window_minutes ago for QueryDR reconciliation."""

    @abstractmethod
    async def get_order_by_id(self, order_id: str) -> PaymentOrder | None:
        """Retrieves order by internal order ID."""

    @abstractmethod
    async def update_order_status(
        self, order_id: str, status: PaymentOrderStatus
    ) -> PaymentOrder | None:
        """Updates payment order status."""

    @abstractmethod
    async def save_transaction(
        self, transaction: PaymentTransaction
    ) -> PaymentTransaction:
        """Persists a payment transaction audit log entity."""

    @abstractmethod
    async def list_user_orders(self, user_id: str) -> list[PaymentOrder]:
        """Lists all payment orders for a user ordered by created_at descending."""

    @abstractmethod
    async def get_course_titles(self, course_ids: list[str]) -> dict[str, str]:
        """Maps course IDs to their titles for display."""

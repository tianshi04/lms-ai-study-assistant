"""Domain entities and value objects for Payment module (BR_ACCESS_004)."""

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
import uuid


class PlanType(str, Enum):
    UNSPECIFIED = "UNSPECIFIED"
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"


class PurchaseStatus(str, Enum):
    UNSPECIFIED = "UNSPECIFIED"
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class SubscriptionStatus(str, Enum):
    UNSPECIFIED = "UNSPECIFIED"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class PaymentTargetType(str, Enum):
    UNSPECIFIED = "UNSPECIFIED"
    COURSE = "COURSE"
    SYSTEM_SUBSCRIPTION = "SYSTEM_SUBSCRIPTION"


class PaymentOrderStatus(str, Enum):
    UNSPECIFIED = "UNSPECIFIED"
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"


@dataclass
class CoursePurchase:
    id: str
    user_id: str
    course_id: str
    amount: float
    currency: str
    status: PurchaseStatus
    payment_method: str
    created_at: str

    @classmethod
    def create(
        cls,
        user_id: str,
        course_id: str,
        amount: float,
        currency: str = "VND",
        payment_method: str = "MOCK",
    ) -> "CoursePurchase":
        now = datetime.now(timezone.utc).isoformat()
        return cls(
            id=str(uuid.uuid4()),
            user_id=user_id,
            course_id=course_id,
            amount=amount,
            currency=currency,
            status=PurchaseStatus.COMPLETED,
            payment_method=payment_method,
            created_at=now,
        )


@dataclass
class UserSubscription:
    id: str
    user_id: str
    plan_type: PlanType
    status: SubscriptionStatus
    starts_at: str
    expires_at: str
    created_at: str

    def is_currently_active(self) -> bool:
        if self.status != SubscriptionStatus.ACTIVE:
            return False
        try:
            exp_time = datetime.fromisoformat(self.expires_at)
            now = datetime.now(timezone.utc)
            return exp_time > now
        except Exception:
            return False


@dataclass
class PaymentOrder:
    id: str
    user_id: str
    target_type: PaymentTargetType
    target_id: str
    plan_type: PlanType
    amount: float
    currency: str
    status: PaymentOrderStatus
    vnp_txn_ref: str
    created_at: str
    updated_at: str


@dataclass
class PaymentTransaction:
    id: str
    order_id: str
    vnp_transaction_no: str
    vnp_response_code: str
    vnp_bank_code: str
    vnp_pay_date: str
    raw_payload: str
    created_at: str

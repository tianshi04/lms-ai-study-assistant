"""Domain entities and value objects for Payment module (BR_ACCESS_004)."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import Enum
from typing import Any


def safe_enum_parse[E: Enum](enum_cls: type[E], value: Any, default: E) -> E:
    """Safely parse arbitrary DB string/int/enum representation into domain Enum without raising ValueError."""
    if value is None:
        return default
    if isinstance(value, enum_cls):
        return value
    str_val = str(value).strip()
    if not str_val or str_val.upper() in ("NONE", "NULL", ""):
        return default

    # Direct match against enum values or names
    for member in enum_cls:
        if member.value == str_val or member.name == str_val:
            return member

    # Normalized match stripping common protobuf/DB prefixes
    upper_val = str_val.upper()
    cleaned = (
        upper_val.replace("PLAN_TYPE_", "")
        .replace("SUBSCRIPTION_STATUS_", "")
        .replace("PAYMENT_ORDER_STATUS_", "")
        .replace("PAYMENT_TARGET_TYPE_", "")
        .replace("PURCHASE_STATUS_", "")
    )

    for member in enum_cls:
        if member.value == cleaned or member.name == cleaned:
            return member

    return default


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
    CANCELLED = "CANCELLED"


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
        now = datetime.now(UTC).isoformat()
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
            exp_str = str(self.expires_at).replace("Z", "+00:00")
            exp_time = datetime.fromisoformat(exp_str)
            if exp_time.tzinfo is None:
                exp_time = exp_time.replace(tzinfo=UTC)
            now = datetime.now(UTC)
            return exp_time > now
        except (ValueError, TypeError, AttributeError):
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

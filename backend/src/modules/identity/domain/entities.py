import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import Enum

from src.modules.identity.domain.constants import (
    ENTERPRISE_REVOCATION_GRACE_PERIOD_DAYS,
    ENTERPRISE_REVOCATION_MAX_PROGRESS_PERCENT,
)
from src.shared.domain.base import ValueObject


class UserRole(str, Enum):
    UNSPECIFIED = "USER_ROLE_UNSPECIFIED"
    LEARNER = "USER_ROLE_LEARNER"
    INSTRUCTOR = "USER_ROLE_INSTRUCTOR"
    ADMIN = "USER_ROLE_ADMIN"


class ApplicationStatus(str, Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


@dataclass
class InstructorApplication:
    id: str
    user_id: str
    title: str
    bio: str
    linkedin_url: str
    cv_url: str
    demo_video_url: str
    status: ApplicationStatus = ApplicationStatus.PENDING_REVIEW
    rejection_reason: str = ""
    created_at: str = ""
    reviewed_at: str = ""

    def approve(self, reviewed_at: str) -> None:
        self.status = ApplicationStatus.APPROVED
        self.reviewed_at = reviewed_at
        self.rejection_reason = ""

    def reject(self, reason: str, reviewed_at: str) -> None:
        if not reason or not reason.strip():
            raise ValueError("Lý do từ chối không được để trống.")
        self.status = ApplicationStatus.REJECTED
        self.rejection_reason = reason.strip()
        self.reviewed_at = reviewed_at


@dataclass
class Organization:
    id: str
    name: str
    slug: str
    avatar_url: str = ""
    created_at: str = ""


@dataclass
class OrganizationRole:
    id: str
    name: str
    organization_id: str | None = None  # None for system default roles
    parent_role_id: str | None = None
    permissions: set[str] | None = None

    def __post_init__(self):
        if self.permissions is None:
            self.permissions = set()


@dataclass
class OrganizationMember:
    id: str
    user_id: str
    organization_id: str
    role_id: str
    status: str = "ACTIVE"
    joined_at: str = ""

    def deactivate(self) -> None:
        self.status = "INACTIVE"

    def activate(self) -> None:
        self.status = "ACTIVE"


@dataclass
class User:
    id: str
    email: str
    full_name: str
    role: UserRole
    avatar_url: str = ""
    enterprise_seat_key: str | None = None
    seat_assigned_at: str | None = None
    password_hash: str = ""
    is_identity_verified: bool = False
    signature_image_url: str = ""
    title: str = ""
    google_id: str | None = None


class ScopeType(str, Enum):
    ALL_COURSES = "ALL_COURSES"
    CURATED_COURSES = "CURATED_COURSES"


@dataclass(frozen=True)
class RevocationEligibility(ValueObject):
    """Domain decision value object for Enterprise Seat revocation (BR_ACCESS_003)."""

    can_revoke: bool
    reason: str


@dataclass
class EnterpriseLicense:
    key: str
    partner_name: str
    total_seats: int
    used_seats: int
    is_active: bool
    scope_type: ScopeType = ScopeType.ALL_COURSES
    allowed_course_ids: set[str] | None = None
    organization_id: str | None = None

    def __post_init__(self):
        if self.allowed_course_ids is None:
            self.allowed_course_ids = set()

    def can_assign_seat(self) -> bool:
        return self.is_active and self.used_seats < self.total_seats

    def assign_seat(self) -> None:
        if not self.can_assign_seat():
            raise ValueError("Đã hết số lượng suất học.")
        self.used_seats += 1

    def revoke_seat(self) -> None:
        if self.used_seats > 0:
            self.used_seats -= 1

    def is_course_allowed(self, course_id: str) -> bool:
        """Domain invariant method to verify course eligibility (BR_ACCESS_002)."""
        if not self.is_active:
            return False
        if self.scope_type == ScopeType.ALL_COURSES:
            return True
        if not self.allowed_course_ids:
            return False
        return course_id in self.allowed_course_ids

    @staticmethod
    def evaluate_revocation_eligibility(
        seat_assigned_at: str | None,
        max_progress_percent: float,
        now: datetime | None = None,
    ) -> RevocationEligibility:
        """Pure domain invariant evaluating Enterprise Seat revocation (BR_ACCESS_003).

        - Within 30 days of assignment: revocable only if max progress < 20%.
        - After 30 days of assignment (or missing timestamp): revocable unconditionally.
        """
        effective_now = now or datetime.now(UTC)
        if effective_now.tzinfo is None:
            effective_now = effective_now.replace(tzinfo=UTC)

        within_grace_period = False
        if seat_assigned_at:
            try:
                assigned_dt = datetime.fromisoformat(seat_assigned_at)
                if assigned_dt.tzinfo is None:
                    assigned_dt = assigned_dt.replace(tzinfo=UTC)
                within_grace_period = (effective_now - assigned_dt) <= timedelta(
                    days=ENTERPRISE_REVOCATION_GRACE_PERIOD_DAYS
                )
            except (ValueError, TypeError):
                within_grace_period = False

        if within_grace_period:
            if max_progress_percent >= ENTERPRISE_REVOCATION_MAX_PROGRESS_PERCENT:
                return RevocationEligibility(
                    can_revoke=False,
                    reason=(
                        f"Không thể thu hồi: Học viên đã đạt {round(max_progress_percent, 1):g}% tiến độ "
                        f"(>= {int(ENTERPRISE_REVOCATION_MAX_PROGRESS_PERCENT)}% trong "
                        f"{ENTERPRISE_REVOCATION_GRACE_PERIOD_DAYS} ngày đầu)."
                    ),
                )
            return RevocationEligibility(
                can_revoke=True,
                reason=(
                    f"Đủ điều kiện thu hồi trong {ENTERPRISE_REVOCATION_GRACE_PERIOD_DAYS} ngày đầu "
                    f"(tiến độ {round(max_progress_percent, 1):g}% < {int(ENTERPRISE_REVOCATION_MAX_PROGRESS_PERCENT)}%)."
                ),
            )

        return RevocationEligibility(
            can_revoke=True,
            reason=(
                f"Đủ điều kiện thu hồi (đã quá chu kỳ {ENTERPRISE_REVOCATION_GRACE_PERIOD_DAYS} ngày "
                "hoặc không giới hạn thời gian ân hạn)."
            ),
        )


class InvitationType(str, Enum):
    ORGANIZATION_MEMBER = "INVITATION_TYPE_ORGANIZATION_MEMBER"
    COURSE_CO_INSTRUCTOR = "INVITATION_TYPE_COURSE_CO_INSTRUCTOR"
    ENTERPRISE_SEAT = "INVITATION_TYPE_ENTERPRISE_SEAT"


class InvitationStatus(str, Enum):
    PENDING = "INVITATION_STATUS_PENDING"
    ACCEPTED = "INVITATION_STATUS_ACCEPTED"
    DECLINED = "INVITATION_STATUS_DECLINED"
    CANCELLED = "INVITATION_STATUS_CANCELLED"
    EXPIRED = "INVITATION_STATUS_EXPIRED"


class InvitationAction(str, Enum):
    ACCEPT = "INVITATION_ACTION_ACCEPT"
    DECLINE = "INVITATION_ACTION_DECLINE"


class OrganizationAuditAction(str, Enum):
    UNSPECIFIED = "ORGANIZATION_AUDIT_ACTION_UNSPECIFIED"
    MEMBER_JOINED = "ORGANIZATION_AUDIT_ACTION_MEMBER_JOINED"
    MEMBER_LEFT = "ORGANIZATION_AUDIT_ACTION_MEMBER_LEFT"
    MEMBER_KICKED = "ORGANIZATION_AUDIT_ACTION_MEMBER_KICKED"
    ROLE_CHANGED = "ORGANIZATION_AUDIT_ACTION_ROLE_CHANGED"


@dataclass
class OrganizationAuditLog:
    id: str
    organization_id: str
    actor_id: str
    target_user_id: str
    action: OrganizationAuditAction
    details: str = ""
    created_at: str = ""
    actor_name: str = ""
    target_user_name: str = ""


def hash_invitation_token(raw_token: str) -> str:
    """Computes SHA-256 hash of an invitation token for secure database lookup."""
    if not raw_token:
        return ""
    return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()


@dataclass
class Invitation:
    id: str
    type: InvitationType
    status: InvitationStatus
    inviter_id: str
    inviter_name: str
    inviter_email: str
    invitee_email: str
    target_id: str
    target_name: str
    role_id: str
    token_hash: str
    message: str = ""
    invitee_id: str | None = None
    raw_token: str | None = None  # Only populated in-memory when sending raw token
    expires_at: str = ""
    created_at: str = ""
    responded_at: str = ""


@dataclass
class AdminIdentityStats:
    """Platform-wide user & instructor application counters owned by Identity."""

    total_users: int = 0
    learner_count: int = 0
    instructor_count: int = 0
    admin_count: int = 0
    verified_user_count: int = 0
    pending_instructor_applications: int = 0


@dataclass(frozen=True)
class EnterpriseSeatSummary(ValueObject):
    """Typed summary of an Enterprise License / Seat allocation pool."""

    id: str
    partner_name: str
    seat_key: str
    total_seats: int
    used_seats: int
    is_active: bool
    scope_type: str = ScopeType.ALL_COURSES.value
    allowed_course_ids: tuple[str, ...] = ()
    organization_id: str = ""


@dataclass(frozen=True)
class OrganizationIdentityStats(ValueObject):
    """Organization-scoped member, invitation, and enterprise seat counters."""

    member_count: int = 0
    instructor_count: int = 0
    pending_invitation_count: int = 0
    active_license_count: int = 0
    total_seats: int = 0
    used_seats: int = 0


@dataclass(frozen=True)
class SeatHolderUserRow(ValueObject):
    """Raw Identity user projection for an organization's sponsored seat holder."""

    user_id: str
    full_name: str
    email: str
    avatar_url: str
    seat_key: str
    seat_assigned_at: str


@dataclass(frozen=True)
class OrganizationSeatHolder(ValueObject):
    """Enriched seat holder row including learning progress and BR_ACCESS_003 status."""

    user_id: str
    full_name: str
    email: str
    avatar_url: str
    seat_key: str
    seat_assigned_at: str
    enrolled_courses_count: int
    max_progress_percent: float
    can_revoke: bool
    revoke_reason_hint: str


@dataclass(frozen=True)
class OrganizationSeatHoldersPage(ValueObject):
    """Paginated slice of sponsored seat holders for an Organization."""

    holders: tuple[OrganizationSeatHolder, ...]
    total_count: int
    page: int
    page_size: int

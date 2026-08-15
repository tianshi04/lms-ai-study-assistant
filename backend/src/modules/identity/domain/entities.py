import hashlib
from dataclasses import dataclass
from enum import Enum


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


@dataclass
class EnterpriseLicense:
    key: str
    partner_name: str
    total_seats: int
    used_seats: int
    is_active: bool
    scope_type: ScopeType = ScopeType.ALL_COURSES
    allowed_course_ids: set[str] | None = None

    def __post_init__(self):
        if self.allowed_course_ids is None:
            self.allowed_course_ids = set()

    def can_assign_seat(self) -> bool:
        return self.used_seats < self.total_seats

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
class RefreshToken:
    id: str  # JTI UUID
    user_id: str
    token_hash: str
    expires_at: str
    is_revoked: bool = False
    created_at: str = ""
    revoked_at: str | None = None
    replaced_by_jti: str | None = None

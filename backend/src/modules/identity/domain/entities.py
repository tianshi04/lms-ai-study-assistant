import hashlib
from dataclasses import dataclass
from enum import Enum
from typing import Optional


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
    organization_id: Optional[str] = None  # None for system default roles
    parent_role_id: Optional[str] = None
    permissions: Optional[set[str]] = None

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


@dataclass
class User:
    id: str
    email: str
    full_name: str
    role: UserRole
    avatar_url: str = ""
    enterprise_seat_key: Optional[str] = None
    seat_assigned_at: Optional[str] = None
    password_hash: str = ""
    is_identity_verified: bool = False
    signature_image_url: str = ""
    title: str = ""
    google_id: Optional[str] = None


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
    allowed_course_ids: Optional[set[str]] = None

    def __post_init__(self):
        if self.allowed_course_ids is None:
            self.allowed_course_ids = set()

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
    invitee_id: Optional[str] = None
    raw_token: Optional[str] = None  # Only populated in-memory when sending raw token
    expires_at: str = ""
    created_at: str = ""
    responded_at: str = ""

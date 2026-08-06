from typing import Optional
import sqlalchemy
from sqlalchemy import (
    ARRAY,
    Boolean,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.identity.domain.constants import (
    DEFAULT_ENTERPRISE_KEY_TOTAL_SEATS,
)
from src.modules.identity.domain.entities import UserRole
from src.shared.infrastructure.database import Base


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(
            UserRole,
            native_enum=False,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        default=UserRole.LEARNER,
    )
    avatar_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    enterprise_seat_key: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True, index=True
    )
    seat_assigned_at: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    is_identity_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    signature_image_url: Mapped[str] = mapped_column(
        String(512), nullable=False, default=""
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    google_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, unique=True, index=True
    )


class OrganizationModel(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    avatar_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    created_at: Mapped[str] = mapped_column(String(64), nullable=False, default="")


class OrganizationMemberModel(Base):
    __tablename__ = "organization_members"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_org_member_org_user"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role_id: Mapped[str] = mapped_column(String(64), nullable=False, default="MEMBER")
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="ACTIVE", server_default="ACTIVE"
    )
    joined_at: Mapped[str] = mapped_column(String(64), nullable=False, default="")


class OrganizationAuditLogModel(Base):
    __tablename__ = "organization_audit_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    target_user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=True, default="")
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)


class EnterpriseLicenseModel(Base):
    __tablename__ = "enterprise_licenses"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    partner_name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_seats: Mapped[int] = mapped_column(
        Integer, nullable=False, default=DEFAULT_ENTERPRISE_KEY_TOTAL_SEATS
    )
    used_seats: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    scope_type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="ALL_COURSES", server_default="ALL_COURSES"
    )
    allowed_course_ids: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)), nullable=False, default=list, server_default="{}"
    )


class InstructorApplicationModel(Base):
    __tablename__ = "instructor_applications"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    bio: Mapped[str] = mapped_column(Text, nullable=False)
    linkedin_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    cv_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    demo_video_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="PENDING_REVIEW",
        server_default="PENDING_REVIEW",
        index=True,
    )
    rejection_reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    reviewed_at: Mapped[str] = mapped_column(String(64), nullable=False, default="")


class InvitationModel(Base):
    __tablename__ = "invitations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="INVITATION_STATUS_PENDING",
        server_default="INVITATION_STATUS_PENDING",
        index=True,
    )
    inviter_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    inviter_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    inviter_email: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    invitee_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    invitee_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    target_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    target_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    role_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    token_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    message: Mapped[str] = mapped_column(Text, nullable=False, default="")
    expires_at: Mapped[str] = mapped_column(
        String(64), nullable=False, default="", index=True
    )
    created_at: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    responded_at: Mapped[str] = mapped_column(String(64), nullable=False, default="")


class RevokedTokenModel(Base):
    __tablename__ = "revoked_tokens"

    jti: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    revoked_at = mapped_column(
        sqlalchemy.DateTime(timezone=True), server_default=sqlalchemy.func.now()
    )
    expires_at = mapped_column(sqlalchemy.DateTime(timezone=True), nullable=False)

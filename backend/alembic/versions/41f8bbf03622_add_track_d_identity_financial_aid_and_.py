"""Add Track D identity financial aid and certificate tables

Revision ID: 41f8bbf03622
Revises: 3ca78cb96417
Create Date: 2026-07-22 07:21:39.288932

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "41f8bbf03622"
down_revision: Union[str, Sequence[str], None] = "3ca78cb96417"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create Users table
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            sa.Enum(
                "UNSPECIFIED",
                "LEARNER",
                "INSTRUCTOR",
                "TA",
                "SUPER_ADMIN",
                "PARTNER_ADMIN",
                name="userrole",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "avatar_url", sa.String(length=512), nullable=False, server_default=""
        ),
        sa.Column("enterprise_seat_key", sa.String(length=128), nullable=True),
        sa.Column(
            "password_hash", sa.String(length=255), nullable=False, server_default=""
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # Create Financial Aid Applications table
    op.create_table(
        "financial_aid_applications",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("course_id", sa.String(length=64), nullable=False),
        sa.Column("essay_150_words", sa.Text(), nullable=False),
        sa.Column(
            "status", sa.String(length=32), nullable=False, server_default="PENDING"
        ),
        sa.Column(
            "review_deadline_days_left",
            sa.Integer(),
            nullable=False,
            server_default="14",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_financial_aid_applications_user_id"),
        "financial_aid_applications",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_financial_aid_applications_course_id"),
        "financial_aid_applications",
        ["course_id"],
        unique=False,
    )

    # Create Verified Certificates table
    op.create_table(
        "verified_certificates",
        sa.Column("certificate_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("course_id", sa.String(length=64), nullable=False),
        sa.Column("learner_name", sa.String(length=255), nullable=False),
        sa.Column("course_title", sa.String(length=255), nullable=False),
        sa.Column("partner_name", sa.String(length=128), nullable=False),
        sa.Column(
            "partner_logo_url", sa.String(length=512), nullable=False, server_default=""
        ),
        sa.Column("issue_date", sa.String(length=64), nullable=False),
        sa.Column("verification_url", sa.String(length=512), nullable=False),
        sa.Column(
            "qr_code_url", sa.String(length=512), nullable=False, server_default=""
        ),
        sa.Column(
            "open_badges_json_ld", sa.Text(), nullable=False, server_default="{}"
        ),
        sa.PrimaryKeyConstraint("certificate_id"),
    )
    op.create_index(
        op.f("ix_verified_certificates_user_id"),
        "verified_certificates",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_verified_certificates_course_id"),
        "verified_certificates",
        ["course_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_verified_certificates_course_id"), table_name="verified_certificates"
    )
    op.drop_index(
        op.f("ix_verified_certificates_user_id"), table_name="verified_certificates"
    )
    op.drop_table("verified_certificates")

    op.drop_index(
        op.f("ix_financial_aid_applications_course_id"),
        table_name="financial_aid_applications",
    )
    op.drop_index(
        op.f("ix_financial_aid_applications_user_id"),
        table_name="financial_aid_applications",
    )
    op.drop_table("financial_aid_applications")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

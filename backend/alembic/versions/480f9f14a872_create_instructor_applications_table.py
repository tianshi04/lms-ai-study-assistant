"""create_instructor_applications_table

Revision ID: 480f9f14a872
Revises: d510ee603d61
Create Date: 2026-07-30 15:01:10.152143

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "480f9f14a872"
down_revision: str | Sequence[str] | None = "5c33582e05dd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    from sqlalchemy import inspect

    inspector = inspect(conn)
    tables = inspector.get_table_names()
    if "instructor_applications" not in tables:
        op.create_table(
            "instructor_applications",
            sa.Column("id", sa.String(length=64), nullable=False),
            sa.Column("user_id", sa.String(length=64), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("bio", sa.Text(), nullable=False),
            sa.Column(
                "linkedin_url", sa.String(length=512), nullable=False, server_default=""
            ),
            sa.Column(
                "cv_url", sa.String(length=512), nullable=False, server_default=""
            ),
            sa.Column(
                "demo_video_url",
                sa.String(length=512),
                nullable=False,
                server_default="",
            ),
            sa.Column(
                "status",
                sa.String(length=32),
                nullable=False,
                server_default="PENDING_REVIEW",
            ),
            sa.Column("rejection_reason", sa.Text(), nullable=False, server_default=""),
            sa.Column(
                "created_at", sa.String(length=64), nullable=False, server_default=""
            ),
            sa.Column(
                "reviewed_at", sa.String(length=64), nullable=False, server_default=""
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_instructor_applications_user_id"),
            "instructor_applications",
            ["user_id"],
            unique=False,
        )
        op.create_index(
            op.f("ix_instructor_applications_status"),
            "instructor_applications",
            ["status"],
            unique=False,
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_instructor_applications_status"), table_name="instructor_applications"
    )
    op.drop_index(
        op.f("ix_instructor_applications_user_id"), table_name="instructor_applications"
    )
    op.drop_table("instructor_applications")

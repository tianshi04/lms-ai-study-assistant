"""add system announcements

Revision ID: a7c3e1f20b51
Revises: 0d3341671506
Create Date: 2026-11-18 19:30:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a7c3e1f20b51"
down_revision: str | Sequence[str] | None = "0d3341671506"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "system_announcements",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "action_url", sa.String(length=500), nullable=False, server_default=""
        ),
        sa.Column(
            "severity", sa.String(length=16), nullable=False, server_default="INFO"
        ),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "also_notify_bell", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column(
            "is_critical", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("created_by", sa.String(length=64), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recipient_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "last_user_id", sa.String(length=64), nullable=False, server_default=""
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_system_announcements_status", "system_announcements", ["status"]
    )
    op.create_index(
        "ix_system_announcements_starts_at", "system_announcements", ["starts_at"]
    )
    op.create_index(
        "ix_system_announcements_expires_at", "system_announcements", ["expires_at"]
    )

    op.add_column(
        "notifications",
        sa.Column("announcement_id", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_notifications_announcement_id", "notifications", ["announcement_id"]
    )
    op.create_unique_constraint(
        "uq_notifications_announcement_recipient",
        "notifications",
        ["announcement_id", "recipient_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_notifications_announcement_recipient", "notifications", type_="unique"
    )
    op.drop_index("ix_notifications_announcement_id", table_name="notifications")
    op.drop_column("notifications", "announcement_id")
    op.drop_index(
        "ix_system_announcements_expires_at", table_name="system_announcements"
    )
    op.drop_index(
        "ix_system_announcements_starts_at", table_name="system_announcements"
    )
    op.drop_index("ix_system_announcements_status", table_name="system_announcements")
    op.drop_table("system_announcements")

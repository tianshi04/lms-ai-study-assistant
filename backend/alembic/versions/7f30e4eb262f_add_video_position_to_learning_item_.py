"""add_video_position_to_learning_item_progresses

Revision ID: 7f30e4eb262f
Revises: 100e57c456ef
Create Date: 2026-11-17 18:46:13.499136

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7f30e4eb262f"
down_revision: str | Sequence[str] | None = "100e57c456ef"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "learning_item_progresses",
        sa.Column(
            "last_position_seconds", sa.Integer(), server_default="0", nullable=False
        ),
    )
    op.add_column(
        "learning_item_progresses",
        sa.Column(
            "video_duration_seconds", sa.Integer(), server_default="0", nullable=False
        ),
    )
    op.add_column(
        "learning_item_progresses",
        sa.Column(
            "position_updated_at",
            sa.String(length=64),
            server_default="",
            nullable=False,
        ),
    )
    op.create_index(
        "ix_learning_item_progresses_user_course",
        "learning_item_progresses",
        ["user_id", "course_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        "ix_learning_item_progresses_user_course",
        table_name="learning_item_progresses",
    )
    op.drop_column("learning_item_progresses", "position_updated_at")
    op.drop_column("learning_item_progresses", "video_duration_seconds")
    op.drop_column("learning_item_progresses", "last_position_seconds")

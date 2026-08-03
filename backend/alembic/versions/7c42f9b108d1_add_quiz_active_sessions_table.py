"""add quiz active sessions table

Revision ID: 7c42f9b108d1
Revises: 3b4f3ab87531
Create Date: 2026-08-03 20:15:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7c42f9b108d1"
down_revision: Union[str, Sequence[str], None] = "3b4f3ab87531"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "quiz_active_sessions",
        sa.Column("id", sa.String(length=128), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("item_id", sa.String(length=64), nullable=False),
        sa.Column("session_seed", sa.Integer(), nullable=False),
        sa.Column("questions_json", sa.JSON(), nullable=False),
        sa.Column("started_at", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_quiz_active_sessions_item_id"),
        "quiz_active_sessions",
        ["item_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_quiz_active_sessions_user_id"),
        "quiz_active_sessions",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_quiz_active_sessions_user_id"), table_name="quiz_active_sessions"
    )
    op.drop_index(
        op.f("ix_quiz_active_sessions_item_id"), table_name="quiz_active_sessions"
    )
    op.drop_table("quiz_active_sessions")

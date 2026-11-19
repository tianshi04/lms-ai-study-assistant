"""add draft fields to quiz_active_sessions

Revision ID: 968d39b0bbd0
Revises: 100e57c456ef
Create Date: 2026-11-18 17:28:53.778814

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "968d39b0bbd0"
down_revision: str | Sequence[str] | None = "100e57c456ef"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("DELETE FROM quiz_active_sessions")
    op.add_column(
        "quiz_active_sessions",
        sa.Column(
            "session_id", sa.String(length=64), server_default="", nullable=False
        ),
    )
    op.add_column(
        "quiz_active_sessions",
        sa.Column(
            "draft_answers_json",
            sa.JSON().with_variant(
                postgresql.JSONB(astext_type=sa.Text()), "postgresql"
            ),
            server_default="[]",
            nullable=False,
        ),
    )
    op.add_column(
        "quiz_active_sessions",
        sa.Column(
            "draft_updated_at", sa.String(length=64), server_default="", nullable=False
        ),
    )
    op.add_column(
        "quiz_active_sessions",
        sa.Column("draft_version", sa.Integer(), server_default="0", nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("quiz_active_sessions", "draft_version")
    op.drop_column("quiz_active_sessions", "draft_updated_at")
    op.drop_column("quiz_active_sessions", "draft_answers_json")
    op.drop_column("quiz_active_sessions", "session_id")

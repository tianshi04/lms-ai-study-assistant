"""add_essay_max_attempts_to_learning_items

Revision ID: 01a1eca59a2d
Revises: 2e7c375d80b8
Create Date: 2026-11-18 10:14:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "01a1eca59a2d"
down_revision: str | Sequence[str] | None = "2e7c375d80b8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "learning_items",
        sa.Column(
            "essay_max_attempts", sa.Integer(), server_default="3", nullable=False
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("learning_items", "essay_max_attempts")

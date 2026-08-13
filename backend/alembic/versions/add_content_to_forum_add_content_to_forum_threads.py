"""add content to forum_threads

Revision ID: add_content_to_forum
Revises: 44e5fc5daf08
Create Date: 2026-07-28 09:46:20.350454

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_content_to_forum"
down_revision: str | Sequence[str] | None = "44e5fc5daf08"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "forum_threads",
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("forum_threads", "content")

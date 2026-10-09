"""add google_id to users

Revision ID: f89a1029c001
Revises: 2414984b4a4b
Create Date: 2026-08-05 10:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f89a1029c001"
down_revision: str | Sequence[str] | None = "2414984b4a4b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("users", sa.Column("google_id", sa.String(length=255), nullable=True))
    op.create_index(op.f("ix_users_google_id"), "users", ["google_id"], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_users_google_id"), table_name="users")
    op.drop_column("users", "google_id")

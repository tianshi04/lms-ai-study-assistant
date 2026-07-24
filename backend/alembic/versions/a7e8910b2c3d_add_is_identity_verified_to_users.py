"""Add is_identity_verified to users table

Revision ID: a7e8910b2c3d
Revises: 5b8f9e1029aa
Create Date: 2026-07-24 12:48:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a7e8910b2c3d"
down_revision: Union[str, Sequence[str], None] = "5b8f9e1029aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users",
        sa.Column(
            "is_identity_verified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "is_identity_verified")

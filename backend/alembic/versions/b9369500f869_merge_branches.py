"""merge branches

Revision ID: b9369500f869
Revises: 38e60e429f76, 7a8f9e1029ab
Create Date: 2026-07-24 18:47:04.630265

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "b9369500f869"
down_revision: Union[str, Sequence[str], None] = ("38e60e429f76", "7a8f9e1029ab")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

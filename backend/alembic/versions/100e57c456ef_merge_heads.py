"""merge heads

Revision ID: 100e57c456ef
Revises: 5beeb5885922, d4b7a91c3e52
Create Date: 2026-11-14 14:22:08.715190

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "100e57c456ef"
down_revision: str | Sequence[str] | None = ("5beeb5885922", "d4b7a91c3e52")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""

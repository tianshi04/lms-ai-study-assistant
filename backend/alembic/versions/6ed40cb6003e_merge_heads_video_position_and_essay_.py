"""merge_heads_video_position_and_essay_upgrade

Revision ID: 6ed40cb6003e
Revises: 01a1eca59a2d, 7f30e4eb262f
Create Date: 2026-11-23 17:10:55.892141

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "6ed40cb6003e"
down_revision: str | Sequence[str] | None = ("01a1eca59a2d", "7f30e4eb262f")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""


def downgrade() -> None:
    """Downgrade schema."""

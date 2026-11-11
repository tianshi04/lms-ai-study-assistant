"""backfill_empty_enrolled_at_in_learning_progresses

Revision ID: 8b3d6d35e697
Revises: 00c565ecc4ba
Create Date: 2026-11-11 22:25:18.891579

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8b3d6d35e697"
down_revision: str | Sequence[str] | None = "00c565ecc4ba"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Backfill legacy learning_progresses rows that have empty enrolled_at."""
    op.execute(
        """
        UPDATE learning_progresses
        SET enrolled_at = COALESCE(
            NULLIF(last_accessed_at, ''),
            NULLIF(last_reset_at, ''),
            to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"+00:00"')
        )
        WHERE enrolled_at = '';
        """
    )


def downgrade() -> None:
    """Downgrade schema."""

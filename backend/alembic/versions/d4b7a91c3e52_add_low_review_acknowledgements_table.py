"""add low review acknowledgements table

Revision ID: d4b7a91c3e52
Revises: 00c565ecc4ba
Create Date: 2026-11-09 19:59:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4b7a91c3e52"
down_revision: str | Sequence[str] | None = "00c565ecc4ba"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "low_review_acknowledgements",
        sa.Column("review_id", sa.String(length=64), nullable=False),
        sa.Column("acknowledged_by", sa.String(length=64), nullable=True),
        sa.Column("acknowledged_at", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(
            ["review_id"], ["course_reviews.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["acknowledged_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("review_id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("low_review_acknowledgements")

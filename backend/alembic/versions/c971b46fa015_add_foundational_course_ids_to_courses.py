"""add_foundational_course_ids_to_courses

Revision ID: c971b46fa015
Revises: 89311627d5f7
Create Date: 2026-10-27 15:30:15.446304

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c971b46fa015"
down_revision: str | Sequence[str] | None = "89311627d5f7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "courses",
        sa.Column(
            "foundational_course_ids",
            sa.ARRAY(sa.String(length=64)),
            server_default="{}",
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("courses", "foundational_course_ids")

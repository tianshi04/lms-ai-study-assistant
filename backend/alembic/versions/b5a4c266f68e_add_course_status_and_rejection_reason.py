"""add_course_status_and_rejection_reason

Revision ID: b5a4c266f68e
Revises: e0b151c2d43e
Create Date: 2026-07-29 22:08:13.842394

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b5a4c266f68e"
down_revision: Union[str, Sequence[str], None] = "e0b151c2d43e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    course_status_enum = sa.Enum(
        "UNSPECIFIED",
        "DRAFT",
        "PENDING_REVIEW",
        "PUBLISHED",
        "REJECTED",
        name="coursestatus",
    )
    course_status_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "courses",
        sa.Column(
            "status", course_status_enum, server_default="PUBLISHED", nullable=False
        ),
    )
    op.add_column(
        "courses",
        sa.Column("rejection_reason", sa.Text(), server_default="", nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    course_status_enum = sa.Enum(
        "UNSPECIFIED",
        "DRAFT",
        "PENDING_REVIEW",
        "PUBLISHED",
        "REJECTED",
        name="coursestatus",
    )
    op.drop_column("courses", "rejection_reason")
    op.drop_column("courses", "status")
    course_status_enum.drop(op.get_bind(), checkfirst=True)

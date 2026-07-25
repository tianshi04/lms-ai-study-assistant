"""add_course_announcements_table

Revision ID: 9116458c6c68
Revises: fd77c3cd6a9a
Create Date: 2026-07-25 12:19:54.186638

"""

from typing import Sequence, Union


from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "9116458c6c68"
down_revision: Union[str, Sequence[str], None] = "fd77c3cd6a9a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "course_announcements",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("course_id", sa.String(length=64), nullable=False),
        sa.Column("author_id", sa.String(length=64), nullable=False),
        sa.Column("author_name", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_course_announcements_course_id"),
        "course_announcements",
        ["course_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_course_announcements_course_id"), table_name="course_announcements"
    )
    op.drop_table("course_announcements")

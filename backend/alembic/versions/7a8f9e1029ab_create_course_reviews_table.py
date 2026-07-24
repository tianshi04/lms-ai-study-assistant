"""create_course_reviews_table

Revision ID: 7a8f9e1029ab
Revises: 5b8f9e1029aa
Create Date: 2026-07-24 11:30:00.000000

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "7a8f9e1029ab"
down_revision: Union[str, Sequence[str], None] = "5b8f9e1029aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "course_reviews",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column(
            "user_name", sa.String(length=128), nullable=False, server_default=""
        ),
        sa.Column("course_id", sa.String(length=64), nullable=False),
        sa.Column("rating_stars", sa.Integer(), nullable=False),
        sa.Column("comment_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_course_reviews_user_id"), "course_reviews", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_course_reviews_course_id"),
        "course_reviews",
        ["course_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_course_reviews_course_id"), table_name="course_reviews")
    op.drop_index(op.f("ix_course_reviews_user_id"), table_name="course_reviews")
    op.drop_table("course_reviews")

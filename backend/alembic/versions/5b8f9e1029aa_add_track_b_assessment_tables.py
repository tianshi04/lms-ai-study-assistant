"""Add Track B assessment tables

Revision ID: 5b8f9e1029aa
Revises: 972357a021b8
Create Date: 2026-07-22 10:37:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5b8f9e1029aa"
down_revision: Union[str, Sequence[str], None] = "629bc7bbb558"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "honor_code_agreements",
        sa.Column("id", sa.String(length=128), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("item_id", sa.String(length=64), nullable=False),
        sa.Column("is_agreed", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("agreed_at", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_honor_code_agreements_user_id"),
        "honor_code_agreements",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_honor_code_agreements_item_id"),
        "honor_code_agreements",
        ["item_id"],
        unique=False,
    )

    op.create_table(
        "quiz_submissions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("item_id", sa.String(length=64), nullable=False),
        sa.Column("selected_option_indexes", sa.ARRAY(sa.Integer()), nullable=False),
        sa.Column("score_percent", sa.Float(), nullable=False),
        sa.Column("passed", sa.Boolean(), nullable=False),
        sa.Column("attempt_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_quiz_submissions_user_id"),
        "quiz_submissions",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_quiz_submissions_item_id"),
        "quiz_submissions",
        ["item_id"],
        unique=False,
    )

    op.create_table(
        "quiz_cooldowns",
        sa.Column("id", sa.String(length=128), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("item_id", sa.String(length=64), nullable=False),
        sa.Column(
            "failed_attempts_count", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("last_attempt_at", sa.String(length=64), nullable=True),
        sa.Column("cooldown_until", sa.String(length=64), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_quiz_cooldowns_user_id"), "quiz_cooldowns", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_quiz_cooldowns_item_id"), "quiz_cooldowns", ["item_id"], unique=False
    )

    op.create_table(
        "lab_submissions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("item_id", sa.String(length=64), nullable=False),
        sa.Column("source_code", sa.Text(), nullable=False),
        sa.Column(
            "language", sa.String(length=32), nullable=False, server_default="python"
        ),
        sa.Column("score_percent", sa.Float(), nullable=False),
        sa.Column("passed", sa.Boolean(), nullable=False),
        sa.Column("total_test_cases", sa.Integer(), nullable=False),
        sa.Column("passed_test_cases", sa.Integer(), nullable=False),
        sa.Column("test_logs", sa.Text(), nullable=False),
        sa.Column("created_at", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_lab_submissions_user_id"), "lab_submissions", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_lab_submissions_item_id"), "lab_submissions", ["item_id"], unique=False
    )

    op.create_table(
        "peer_assignment_submissions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("item_id", sa.String(length=64), nullable=False),
        sa.Column("submission_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("text_content", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_peer_assignment_submissions_user_id"),
        "peer_assignment_submissions",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_peer_assignment_submissions_item_id"),
        "peer_assignment_submissions",
        ["item_id"],
        unique=False,
    )

    op.create_table(
        "peer_reviews",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("submission_id", sa.String(length=64), nullable=False),
        sa.Column("reviewer_user_id", sa.String(length=64), nullable=False),
        sa.Column("item_id", sa.String(length=64), nullable=False),
        sa.Column("rubric_criteria_json", sa.JSON(), nullable=False),
        sa.Column("total_score", sa.Float(), nullable=False),
        sa.Column("is_outlier", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_peer_reviews_submission_id"),
        "peer_reviews",
        ["submission_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_peer_reviews_reviewer_user_id"),
        "peer_reviews",
        ["reviewer_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_peer_reviews_item_id"), "peer_reviews", ["item_id"], unique=False
    )

    op.create_table(
        "grade_appeals",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("submission_id", sa.String(length=64), nullable=False),
        sa.Column("appeal_reason", sa.Text(), nullable=False),
        sa.Column(
            "status", sa.String(length=32), nullable=False, server_default="PENDING"
        ),
        sa.Column("created_at", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_grade_appeals_user_id"), "grade_appeals", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_grade_appeals_submission_id"),
        "grade_appeals",
        ["submission_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("grade_appeals")
    op.drop_table("peer_reviews")
    op.drop_table("peer_assignment_submissions")
    op.drop_table("lab_submissions")
    op.drop_table("quiz_cooldowns")
    op.drop_table("quiz_submissions")
    op.drop_table("honor_code_agreements")

"""complete_scorm_questionbank_schema

Revision ID: f9caddc81895
Revises: 55863ba0dee5
Create Date: 2026-07-25 23:24:29.317335

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "f9caddc81895"
down_revision: Union[str, Sequence[str], None] = "55863ba0dee5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new columns to learning_items
    op.add_column(
        "learning_items",
        sa.Column("starter_code", sa.Text(), server_default="", nullable=False),
    )
    op.add_column(
        "learning_items",
        sa.Column("test_cases_json", sa.Text(), server_default="", nullable=False),
    )
    op.add_column(
        "learning_items",
        sa.Column("language", sa.String(length=32), server_default="", nullable=False),
    )
    op.add_column(
        "learning_items",
        sa.Column("rubric_criteria_json", sa.Text(), server_default="", nullable=False),
    )
    op.add_column(
        "learning_items",
        sa.Column(
            "quiz_matrix_id", sa.String(length=64), server_default="", nullable=False
        ),
    )

    # Create scorm_trackings table (new table, not ALTER)
    op.create_table(
        "scorm_trackings",
        sa.Column("id", sa.String(length=128), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("item_id", sa.String(length=64), nullable=False),
        sa.Column(
            "cmi_core_lesson_status",
            sa.String(length=32),
            server_default="not attempted",
            nullable=False,
        ),
        sa.Column(
            "cmi_core_score_raw", sa.Float(), server_default="0.0", nullable=False
        ),
        sa.Column(
            "cmi_core_session_time",
            sa.String(length=64),
            server_default="",
            nullable=False,
        ),
        sa.Column(
            "cmi_core_lesson_location",
            sa.String(length=255),
            server_default="",
            nullable=False,
        ),
        sa.Column(
            "cmi_suspend_data", sa.Text(), server_default="", nullable=False
        ),
        sa.Column("updated_at", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_scorm_trackings_user_id"),
        "scorm_trackings",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_scorm_trackings_item_id"),
        "scorm_trackings",
        ["item_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_scorm_trackings_item_id"), table_name="scorm_trackings"
    )
    op.drop_index(
        op.f("ix_scorm_trackings_user_id"), table_name="scorm_trackings"
    )
    op.drop_table("scorm_trackings")
    op.drop_column("learning_items", "quiz_matrix_id")
    op.drop_column("learning_items", "rubric_criteria_json")
    op.drop_column("learning_items", "language")
    op.drop_column("learning_items", "test_cases_json")
    op.drop_column("learning_items", "starter_code")

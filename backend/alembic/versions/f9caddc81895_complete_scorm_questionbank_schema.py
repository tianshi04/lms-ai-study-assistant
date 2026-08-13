"""complete_scorm_questionbank_schema

Revision ID: f9caddc81895
Revises: 8ddf086a3a4d
Create Date: 2026-07-25 23:24:29.317335

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f9caddc81895"
down_revision: str | Sequence[str] | None = "8ddf086a3a4d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
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


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("learning_items", "quiz_matrix_id")
    op.drop_column("learning_items", "rubric_criteria_json")
    op.drop_column("learning_items", "language")
    op.drop_column("learning_items", "test_cases_json")
    op.drop_column("learning_items", "starter_code")

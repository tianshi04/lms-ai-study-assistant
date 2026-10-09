"""add_unique_constraint_to_course_purchases

Revision ID: 2414984b4a4b
Revises: e2ad17d24d70
Create Date: 2026-08-04 19:07:16.709615

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
"""add_unique_constraint_to_course_purchases

Revision ID: 2414984b4a4b
Revises: e2ad17d24d70
Create Date: 2026-08-04 19:07:16.709615

"""


# revision identifiers, used by Alembic.
revision: str = "2414984b4a4b"
down_revision: str | Sequence[str] | None = "e2ad17d24d70"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_unique_constraint(
        "uq_course_purchases_user_course", "course_purchases", ["user_id", "course_id"]
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "uq_course_purchases_user_course", "course_purchases", type_="unique"
    )

"""change open_badges_json_ld from text to json type

Revision ID: dd8170ce953d
Revises: 685be7ef1e53
Create Date: 2026-07-24 14:28:32.364230

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "dd8170ce953d"
down_revision: str | Sequence[str] | None = "685be7ef1e53"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        "ALTER TABLE verified_certificates ALTER COLUMN open_badges_json_ld DROP DEFAULT"
    )
    op.alter_column(
        "verified_certificates",
        "open_badges_json_ld",
        existing_type=sa.TEXT(),
        type_=sa.JSON(),
        existing_nullable=False,
        postgresql_using="open_badges_json_ld::json",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "verified_certificates",
        "open_badges_json_ld",
        existing_type=sa.JSON(),
        type_=sa.TEXT(),
        existing_nullable=False,
        postgresql_using="open_badges_json_ld::text",
    )

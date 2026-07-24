"""change open_badges_json_ld from text to json type

Revision ID: dd8170ce953d
Revises: 685be7ef1e53
Create Date: 2026-07-24 14:28:32.364230

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "dd8170ce953d"
down_revision: Union[str, Sequence[str], None] = "685be7ef1e53"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
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

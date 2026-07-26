"""merge assessment and catalog migrations

Revision ID: e94694db5471
Revises: 04766e42c415, 8ddf086a3a4d
Create Date: 2026-07-26 15:49:15.279987

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e94694db5471'
down_revision: Union[str, Sequence[str], None] = ('04766e42c415', '8ddf086a3a4d')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

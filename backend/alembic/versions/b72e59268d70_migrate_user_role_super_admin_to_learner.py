"""migrate_user_role_super_admin_to_learner

Revision ID: b72e59268d70
Revises: f7b500c09994
Create Date: 2026-08-01 02:42:55.975588

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b72e59268d70"
down_revision: Union[str, Sequence[str], None] = "f7b500c09994"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        "UPDATE users SET role = 'USER_ROLE_LEARNER' WHERE role = 'USER_ROLE_SUPER_ADMIN'"
    )


def downgrade() -> None:
    """Downgrade schema."""
    pass

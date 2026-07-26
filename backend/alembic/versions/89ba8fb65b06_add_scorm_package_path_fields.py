"""add_scorm_package_path_fields

Revision ID: 89ba8fb65b06
Revises: f9caddc81895
Create Date: 2026-07-26 00:34:25.155092

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "89ba8fb65b06"
down_revision: Union[str, Sequence[str], None] = "f9caddc81895"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # No-op: scorm_trackings was created in parent migration without cmi_data
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass


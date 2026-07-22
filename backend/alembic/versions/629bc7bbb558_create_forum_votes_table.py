"""create_forum_votes_table

Revision ID: 629bc7bbb558
Revises: 4d186f683851
Create Date: 2026-07-22 13:57:20.682921

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '629bc7bbb558'
down_revision: Union[str, Sequence[str], None] = '4d186f683851'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
    CREATE TABLE IF NOT EXISTS forum_votes (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        post_id VARCHAR(36) NOT NULL,
        created_at VARCHAR(100) NOT NULL
    );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_forum_votes_user_id ON forum_votes (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_forum_votes_post_id ON forum_votes (post_id);")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_forum_user_post_vote ON forum_votes (user_id, post_id);")


def downgrade() -> None:
    op.drop_table('forum_votes')

"""create_forum_tables

Revision ID: 4d186f683851
Revises: 972357a021b8
Create Date: 2026-07-22 13:50:29.539258

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '4d186f683851'
down_revision: Union[str, Sequence[str], None] = '972357a021b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create forum_threads table safely
    op.execute("""
    CREATE TABLE IF NOT EXISTS forum_threads (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        course_id VARCHAR(255) NOT NULL,
        item_id VARCHAR(255) NOT NULL DEFAULT '',
        title VARCHAR(500) NOT NULL,
        author_name VARCHAR(255) NOT NULL,
        author_role VARCHAR(100) NOT NULL DEFAULT 'Student',
        author_user_id VARCHAR(255) NOT NULL DEFAULT '',
        created_at VARCHAR(100) NOT NULL,
        upvote_count INTEGER NOT NULL DEFAULT 0,
        is_staff_pinned BOOLEAN NOT NULL DEFAULT false
    );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_forum_threads_course_id ON forum_threads (course_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_forum_threads_item_id ON forum_threads (item_id);")

    # Create forum_replies table safely
    op.execute("""
    CREATE TABLE IF NOT EXISTS forum_replies (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        thread_id VARCHAR(36) NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        author_name VARCHAR(255) NOT NULL,
        author_role VARCHAR(100) NOT NULL DEFAULT 'Student',
        author_user_id VARCHAR(255) NOT NULL DEFAULT '',
        content TEXT NOT NULL,
        is_staff_answer BOOLEAN NOT NULL DEFAULT false,
        upvote_count INTEGER NOT NULL DEFAULT 0,
        created_at VARCHAR(100) NOT NULL
    );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_forum_replies_thread_id ON forum_replies (thread_id);")


def downgrade() -> None:
    op.drop_table('forum_replies')
    op.drop_table('forum_threads')

"""add_is_solved_and_search_indexes_to_forum

Revision ID: a1132ccd501b
Revises: 6ed40cb6003e
Create Date: 2026-11-15 00:31:59.129178

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1132ccd501b"
down_revision: str | Sequence[str] | None = "6ed40cb6003e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema with forum is_solved flag and Vietnamese search indexes."""
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent;")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
        RETURNS text
        LANGUAGE sql
        IMMUTABLE
        PARALLEL SAFE
        STRICT
        AS $$
            SELECT public.unaccent('public.unaccent', $1)
        $$;
        """
    )

    op.add_column(
        "forum_threads",
        sa.Column(
            "is_solved",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.create_index(
        "ix_forum_threads_is_solved",
        "forum_threads",
        ["is_solved"],
        unique=False,
    )

    op.execute(
        """
        UPDATE forum_threads
        SET is_solved = TRUE
        WHERE EXISTS (
            SELECT 1
            FROM forum_replies
            WHERE forum_replies.thread_id = forum_threads.id
              AND forum_replies.is_staff_answer = TRUE
        );
        """
    )

    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_forum_threads_title_trgm "
        "ON forum_threads USING gin (immutable_unaccent(lower(title)) gin_trgm_ops);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_forum_threads_content_trgm "
        "ON forum_threads USING gin (immutable_unaccent(lower(content)) gin_trgm_ops);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_forum_threads_author_name_trgm "
        "ON forum_threads USING gin (immutable_unaccent(lower(author_name)) gin_trgm_ops);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_forum_replies_content_trgm "
        "ON forum_replies USING gin (immutable_unaccent(lower(content)) gin_trgm_ops);"
    )


def downgrade() -> None:
    """Downgrade schema by removing forum search indexes and is_solved column."""
    op.execute("DROP INDEX IF EXISTS idx_forum_replies_content_trgm;")
    op.execute("DROP INDEX IF EXISTS idx_forum_threads_author_name_trgm;")
    op.execute("DROP INDEX IF EXISTS idx_forum_threads_content_trgm;")
    op.execute("DROP INDEX IF EXISTS idx_forum_threads_title_trgm;")
    op.drop_index("ix_forum_threads_is_solved", table_name="forum_threads")
    op.drop_column("forum_threads", "is_solved")
    op.execute("DROP FUNCTION IF EXISTS public.immutable_unaccent(text);")

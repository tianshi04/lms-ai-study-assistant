"""add_course_embeddings_table

Revision ID: 48872472b096
Revises: c773f6b0f9f7
Create Date: 2026-10-26 09:50:03.329219

"""

from collections.abc import Sequence

import pgvector.sqlalchemy
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "48872472b096"
down_revision: str | Sequence[str] | None = "c773f6b0f9f7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Ensure pgvector extension exists
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    op.create_table(
        "course_embeddings",
        sa.Column("course_id", sa.String(length=64), nullable=False),
        sa.Column("embedding", pgvector.sqlalchemy.Vector(384), nullable=False),
        sa.Column("payload_text", sa.Text(), server_default="", nullable=False),
        sa.Column("updated_at", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("course_id"),
    )

    # Create HNSW index for sub-5ms cosine similarity search
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_course_embeddings_hnsw ON course_embeddings "
        "USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_course_embeddings_hnsw;")
    op.drop_table("course_embeddings")

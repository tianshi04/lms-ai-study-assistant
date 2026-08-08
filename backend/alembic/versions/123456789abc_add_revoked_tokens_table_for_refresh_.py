"""Add revoked_tokens table for refresh token rotation

Revision ID: 123456789abc
Revises: f89a1029c001
Create Date: 2026-08-06 15:10:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "123456789abc"
down_revision = "c773f6b0f9f7"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "revoked_tokens",
        sa.Column("jti", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=False, index=True),
        sa.Column(
            "revoked_at", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table("revoked_tokens")

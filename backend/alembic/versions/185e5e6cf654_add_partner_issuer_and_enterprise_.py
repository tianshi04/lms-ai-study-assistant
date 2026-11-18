"""add partner issuer and enterprise license org links

Revision ID: 185e5e6cf654
Revises: 100e57c456ef
Create Date: 2026-11-11 14:37:46.150407

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "185e5e6cf654"
down_revision: str | Sequence[str] | None = "100e57c456ef"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "courses",
        sa.Column("issuer_partner_id", sa.String(length=64), nullable=True),
    )
    op.create_index(
        op.f("ix_courses_issuer_partner_id"),
        "courses",
        ["issuer_partner_id"],
        unique=False,
    )
    op.create_foreign_key(
        "courses_issuer_partner_id_fkey",
        "courses",
        "partners",
        ["issuer_partner_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column(
        "specializations",
        sa.Column("issuer_partner_id", sa.String(length=64), nullable=True),
    )
    op.create_index(
        op.f("ix_specializations_issuer_partner_id"),
        "specializations",
        ["issuer_partner_id"],
        unique=False,
    )
    op.create_foreign_key(
        "specializations_issuer_partner_id_fkey",
        "specializations",
        "partners",
        ["issuer_partner_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column(
        "enterprise_licenses",
        sa.Column("organization_id", sa.String(length=64), nullable=True),
    )
    op.create_index(
        op.f("ix_enterprise_licenses_organization_id"),
        "enterprise_licenses",
        ["organization_id"],
        unique=False,
    )
    op.create_foreign_key(
        "enterprise_licenses_organization_id_fkey",
        "enterprise_licenses",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.alter_column(
        "partners",
        "historical_public_keys",
        server_default=None,
        existing_type=postgresql.ARRAY(sa.VARCHAR(length=255)),
        existing_nullable=False,
    )
    op.alter_column(
        "partners",
        "historical_public_keys",
        existing_type=postgresql.ARRAY(sa.VARCHAR(length=255)),
        type_=sa.ARRAY(sa.Text()),
        existing_nullable=False,
        postgresql_using="historical_public_keys::text[]",
        server_default=sa.text("'{}'::text[]"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "partners",
        "historical_public_keys",
        server_default=None,
        existing_type=sa.ARRAY(sa.Text()),
        existing_nullable=False,
    )
    op.alter_column(
        "partners",
        "historical_public_keys",
        existing_type=sa.ARRAY(sa.Text()),
        type_=postgresql.ARRAY(sa.VARCHAR(length=255)),
        existing_nullable=False,
        postgresql_using="historical_public_keys::varchar(255)[]",
        server_default=sa.text("'{}'::character varying[]"),
    )

    op.drop_constraint(
        "enterprise_licenses_organization_id_fkey",
        "enterprise_licenses",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_enterprise_licenses_organization_id"),
        table_name="enterprise_licenses",
    )
    op.drop_column("enterprise_licenses", "organization_id")

    op.drop_constraint(
        "specializations_issuer_partner_id_fkey",
        "specializations",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_specializations_issuer_partner_id"),
        table_name="specializations",
    )
    op.drop_column("specializations", "issuer_partner_id")

    op.drop_constraint(
        "courses_issuer_partner_id_fkey",
        "courses",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_courses_issuer_partner_id"),
        table_name="courses",
    )
    op.drop_column("courses", "issuer_partner_id")

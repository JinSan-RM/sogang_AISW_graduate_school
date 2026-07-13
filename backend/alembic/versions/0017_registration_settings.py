"""add registration settings and privacy consent history

Revision ID: 0017_registration_settings
Revises: 0016_rate_limit_buckets
Create Date: 2026-07-12
"""

from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0017_registration_settings"
down_revision: Union[str, None] = "0016_rate_limit_buckets"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "major_options",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("name", name="uq_major_options_name"),
    )
    op.create_index("ix_major_options_active_order", "major_options", ["is_active", "sort_order"])

    op.create_table(
        "privacy_policy_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("version", sa.String(length=50), nullable=False),
        sa.Column("effective_at", sa.DateTime(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("version", name="uq_privacy_policy_versions_version"),
    )
    op.create_index(
        "uq_privacy_policy_versions_active",
        "privacy_policy_versions",
        ["is_active"],
        unique=True,
        postgresql_where=sa.text("is_active"),
    )

    op.add_column("users", sa.Column("privacy_policy_version", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("privacy_consented_at", sa.DateTime(), nullable=True))

    now = datetime.utcnow()
    majors = sa.table(
        "major_options",
        sa.column("name", sa.String),
        sa.column("sort_order", sa.Integer),
        sa.column("is_active", sa.Boolean),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
    )
    op.bulk_insert(
        majors,
        [
            {"name": "인공지능", "sort_order": 10, "is_active": True, "created_at": now, "updated_at": now},
            {"name": "소프트웨어", "sort_order": 20, "is_active": True, "created_at": now, "updated_at": now},
            {"name": "블록체인", "sort_order": 30, "is_active": True, "created_at": now, "updated_at": now},
            {"name": "데이터사이언스·인공지능", "sort_order": 40, "is_active": True, "created_at": now, "updated_at": now},
        ],
    )
    policies = sa.table(
        "privacy_policy_versions",
        sa.column("version", sa.String),
        sa.column("effective_at", sa.DateTime),
        sa.column("is_active", sa.Boolean),
        sa.column("created_by", sa.Integer),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
    )
    op.bulk_insert(
        policies,
        [
            {
                "version": "2026-07-12",
                "effective_at": datetime(2026, 7, 12),
                "is_active": True,
                "created_by": None,
                "created_at": now,
                "updated_at": now,
            }
        ],
    )


def downgrade() -> None:
    op.drop_column("users", "privacy_consented_at")
    op.drop_column("users", "privacy_policy_version")
    op.drop_index("uq_privacy_policy_versions_active", table_name="privacy_policy_versions")
    op.drop_table("privacy_policy_versions")
    op.drop_index("ix_major_options_active_order", table_name="major_options")
    op.drop_table("major_options")

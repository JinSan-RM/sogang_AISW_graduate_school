"""add private legacy import provenance ledger

Revision ID: 0022_legacy_import_records
Revises: 0021_account_deletion_receipts
Create Date: 2026-08-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0022_legacy_import_records"
down_revision: Union[str, None] = "0021_account_deletion_receipts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "legacy_import_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_file", sa.String(length=255), nullable=False),
        sa.Column("source_sheet", sa.String(length=100), nullable=False),
        sa.Column("source_row", sa.Integer(), nullable=True),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("source_id", sa.String(length=100), nullable=False),
        sa.Column("source_parent_id", sa.String(length=100), nullable=True),
        sa.Column("source_hash", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("target_table", sa.String(length=100), nullable=True),
        sa.Column("target_id", sa.Integer(), nullable=True),
        sa.Column("reason", sa.String(length=500), nullable=True),
        sa.Column("redacted_details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source_file",
            "source_sheet",
            "entity_type",
            "source_id",
            name="uq_legacy_import_records_source_entity",
        ),
    )
    op.create_index(
        "ix_legacy_import_records_status_entity",
        "legacy_import_records",
        ["status", "entity_type"],
    )
    op.create_index(
        "ix_legacy_import_records_target",
        "legacy_import_records",
        ["target_table", "target_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_legacy_import_records_target", table_name="legacy_import_records")
    op.drop_index("ix_legacy_import_records_status_entity", table_name="legacy_import_records")
    op.drop_table("legacy_import_records")

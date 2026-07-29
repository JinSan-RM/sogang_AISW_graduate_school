"""store non-identifying account deletion receipts

Revision ID: 0021_account_deletion_receipts
Revises: 0020_account_hard_delete
Create Date: 2026-07-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0021_account_deletion_receipts"
down_revision: Union[str, None] = "0020_account_hard_delete"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "account_deletion_receipts",
        sa.Column("receipt_id", sa.String(length=36), nullable=False),
        sa.Column("channel", sa.String(length=20), nullable=False),
        sa.Column("result", sa.String(length=20), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "channel IN ('authenticated', 'public_email')",
            name="ck_account_deletion_receipts_channel",
        ),
        sa.CheckConstraint(
            "result = 'completed'",
            name="ck_account_deletion_receipts_result",
        ),
        sa.PrimaryKeyConstraint("receipt_id"),
    )
    op.create_index(
        "ix_account_deletion_receipts_completed_at",
        "account_deletion_receipts",
        ["completed_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_account_deletion_receipts_completed_at",
        table_name="account_deletion_receipts",
    )
    op.drop_table("account_deletion_receipts")

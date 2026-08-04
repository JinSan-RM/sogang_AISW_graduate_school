"""add protected FAQ media attachments

Revision ID: 0024_faq_attachments
Revises: 0023_registration_major_options
Create Date: 2026-08-04
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0024_faq_attachments"
down_revision: Union[str, None] = "0023_registration_major_options"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "faq_attachments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("faq_id", sa.Integer(), nullable=False),
        sa.Column("media_id", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["faq_id"], ["faqs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["media_id"], ["media_assets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("faq_id", "media_id", name="uq_faq_attachments_faq_media"),
    )
    op.create_index("ix_faq_attachments_faq_sort", "faq_attachments", ["faq_id", "sort_order"])


def downgrade() -> None:
    op.drop_index("ix_faq_attachments_faq_sort", table_name="faq_attachments")
    op.drop_table("faq_attachments")

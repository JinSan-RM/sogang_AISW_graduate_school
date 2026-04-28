"""push tokens

Revision ID: 0004_push_tokens
Revises: 0003_reports
Create Date: 2026-04-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_push_tokens"
down_revision: Union[str, None] = "0003_reports"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    if "push_tokens" not in tables:
        op.create_table(
            "push_tokens",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("token", sa.String(length=255), nullable=False),
            sa.Column("platform", sa.String(length=30), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.UniqueConstraint("token", name="uq_push_tokens_token"),
        )
    indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes("push_tokens")}
    if "ix_push_tokens_user_active" not in indexes:
        op.create_index("ix_push_tokens_user_active", "push_tokens", ["user_id", "is_active"])


def downgrade() -> None:
    op.drop_index("ix_push_tokens_user_active", table_name="push_tokens")
    op.drop_table("push_tokens")

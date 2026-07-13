"""user blocks

Revision ID: 0006_user_blocks
Revises: 0005_phase2_schema_alignment
Create Date: 2026-06-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0006_user_blocks"
down_revision: Union[str, None] = "0005_phase2_schema_alignment"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    if "user_blocks" not in tables:
        op.create_table(
            "user_blocks",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("blocker_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("blocked_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.UniqueConstraint("blocker_id", "blocked_user_id", name="uq_user_blocks_pair"),
        )

    indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes("user_blocks")}
    if "ix_user_blocks_blocker_created" not in indexes:
        op.create_index("ix_user_blocks_blocker_created", "user_blocks", ["blocker_id", "created_at"])
    if "ix_user_blocks_blocked_user_id" not in indexes:
        op.create_index("ix_user_blocks_blocked_user_id", "user_blocks", ["blocked_user_id"])


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "user_blocks" not in set(inspector.get_table_names()):
        return
    indexes = {index["name"] for index in inspector.get_indexes("user_blocks")}
    if "ix_user_blocks_blocked_user_id" in indexes:
        op.drop_index("ix_user_blocks_blocked_user_id", table_name="user_blocks")
    if "ix_user_blocks_blocker_created" in indexes:
        op.drop_index("ix_user_blocks_blocker_created", table_name="user_blocks")
    op.drop_table("user_blocks")

"""add P1 notification delivery and operational audit state

Revision ID: 0014_p1_operations
Revises: 0013_auth_verification_states
Create Date: 2026-07-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0014_p1_operations"
down_revision: Union[str, None] = "0013_auth_verification_states"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _tables() -> set[str]:
    return set(sa.inspect(op.get_bind()).get_table_names())


def _columns(table_name: str) -> set[str]:
    if table_name not in _tables():
        return set()
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    if table_name not in _tables():
        return set()
    return {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table_name)}


def upgrade() -> None:
    if "notifications" in _tables() and "dedupe_key" not in _columns("notifications"):
        op.add_column("notifications", sa.Column("dedupe_key", sa.String(length=255), nullable=True))
    if "notifications" in _tables() and "ix_notifications_dedupe_key" not in _indexes("notifications"):
        op.create_index("ix_notifications_dedupe_key", "notifications", ["dedupe_key"], unique=True)

    if "push_deliveries" not in _tables():
        op.create_table(
            "push_deliveries",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("notification_id", sa.Integer(), sa.ForeignKey("notifications.id", ondelete="SET NULL")),
            sa.Column("push_token_id", sa.Integer(), sa.ForeignKey("push_tokens.id", ondelete="SET NULL")),
            sa.Column("token_snapshot", sa.String(length=255), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
            sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("ticket_id", sa.String(length=255)),
            sa.Column("error_message", sa.Text()),
            sa.Column("receipt_checked_at", sa.DateTime()),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.CheckConstraint("status IN ('pending', 'sent', 'delivered', 'failed')", name="ck_push_deliveries_status"),
        )
        op.create_index("ix_push_deliveries_status_created", "push_deliveries", ["status", "created_at"])
        op.create_index("ix_push_deliveries_ticket_id", "push_deliveries", ["ticket_id"])

    if "operational_audit_logs" not in _tables():
        op.create_table(
            "operational_audit_logs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
            sa.Column("action", sa.String(length=100), nullable=False),
            sa.Column("target_type", sa.String(length=50), nullable=False),
            sa.Column("target_id", sa.Integer()),
            sa.Column("details", postgresql.JSONB(astext_type=sa.Text())),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_operational_audit_logs_actor_created", "operational_audit_logs", ["actor_id", "created_at"])
        op.create_index("ix_operational_audit_logs_target", "operational_audit_logs", ["target_type", "target_id"])


def downgrade() -> None:
    if "operational_audit_logs" in _tables():
        op.drop_table("operational_audit_logs")
    if "push_deliveries" in _tables():
        op.drop_table("push_deliveries")
    if "notifications" in _tables() and "ix_notifications_dedupe_key" in _indexes("notifications"):
        op.drop_index("ix_notifications_dedupe_key", table_name="notifications")
    if "notifications" in _tables() and "dedupe_key" in _columns("notifications"):
        op.drop_column("notifications", "dedupe_key")

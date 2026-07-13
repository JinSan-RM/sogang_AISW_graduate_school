"""align Figma navigation support data and council workflows

Revision ID: 0012_figma_function_alignment
Revises: 0011_banner_optional_text
Create Date: 2026-07-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0012_figma_function_alignment"
down_revision: Union[str, None] = "0011_banner_optional_text"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    return table_name in set(sa.inspect(op.get_bind()).get_table_names())


def _has_column(table_name: str, column_name: str) -> bool:
    if not _has_table(table_name):
        return False
    return column_name in {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def _has_check(table_name: str, constraint_name: str) -> bool:
    if not _has_table(table_name):
        return False
    return constraint_name in {
        constraint["name"] for constraint in sa.inspect(op.get_bind()).get_check_constraints(table_name)
    }


def upgrade() -> None:
    if _has_table("notification_settings") and not _has_column("notification_settings", "notify_council"):
        op.add_column(
            "notification_settings",
            sa.Column("notify_council", sa.Boolean(), nullable=False, server_default=sa.true()),
        )
        op.alter_column("notification_settings", "notify_council", server_default=None)

    if _has_table("notifications"):
        if _has_check("notifications", "ck_notifications_notification_type"):
            op.drop_constraint("ck_notifications_notification_type", "notifications", type_="check")
        op.create_check_constraint(
            "ck_notifications_notification_type",
            "notifications",
            "notification_type IN ('comment', 'like', 'notice', 'event', 'admin_reply', 'report', 'council')",
        )

    if not _has_table("post_mutual_aid"):
        op.create_table(
            "post_mutual_aid",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, unique=True),
            sa.Column("event_type", sa.String(length=30), nullable=False),
            sa.Column("event_date", sa.Date(), nullable=False),
            sa.Column("relation", sa.String(length=50), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="processing"),
            sa.Column("rejection_reason", sa.Text(), nullable=True),
            sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(), nullable=True),
            sa.CheckConstraint(
                "status IN ('processing', 'completed', 'rejected')",
                name="ck_post_mutual_aid_status",
            ),
        )
        op.execute(
            """
            INSERT INTO post_mutual_aid (post_id, event_type, event_date, relation, status)
            SELECT p.id,
                   COALESCE(NULLIF(p.category, ''), '기타'),
                   CASE
                     WHEN COALESCE(p.metadata->>'event_date', '') ~ '^\\d{4}[.-]\\d{2}[.-]\\d{2}$'
                     THEN to_date(replace(p.metadata->>'event_date', '.', '-'), 'YYYY-MM-DD')
                     ELSE p.created_at::date
                   END,
                   COALESCE(NULLIF(p.metadata->>'relation', ''), '미상'),
                   'processing'
            FROM posts p
            JOIN boards b ON b.id = p.board_id
            WHERE b.board_type = 'mutual_aid' AND p.deleted_at IS NULL
            """
        )


def downgrade() -> None:
    if _has_table("post_mutual_aid"):
        op.drop_table("post_mutual_aid")

    if _has_table("notifications"):
        op.execute("DELETE FROM notifications WHERE notification_type = 'council'")
        if _has_check("notifications", "ck_notifications_notification_type"):
            op.drop_constraint("ck_notifications_notification_type", "notifications", type_="check")
        op.create_check_constraint(
            "ck_notifications_notification_type",
            "notifications",
            "notification_type IN ('comment', 'like', 'notice', 'event', 'admin_reply', 'report')",
        )

    if _has_column("notification_settings", "notify_council"):
        op.drop_column("notification_settings", "notify_council")

"""align P0 deadlines, privacy, eligibility, and event categories

Revision ID: 0015_p0_admin_alignment
Revises: 0014_p1_operations
Create Date: 2026-07-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0015_p0_admin_alignment"
down_revision: Union[str, None] = "0014_p1_operations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _inspector():
    return sa.inspect(op.get_bind())


def _tables() -> set[str]:
    return set(_inspector().get_table_names())


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in _inspector().get_columns(table_name)} if table_name in _tables() else set()


def _checks(table_name: str) -> set[str]:
    return {item["name"] for item in _inspector().get_check_constraints(table_name) if item.get("name")} if table_name in _tables() else set()


def _indexes(table_name: str) -> set[str]:
    return {item["name"] for item in _inspector().get_indexes(table_name) if item.get("name")} if table_name in _tables() else set()


def upgrade() -> None:
    if "banners" in _tables() and "deadline_at" not in _columns("banners"):
        op.add_column("banners", sa.Column("deadline_at", sa.DateTime(), nullable=True))
    if "posts" in _tables() and "deadline_at" not in _columns("posts"):
        op.add_column("posts", sa.Column("deadline_at", sa.DateTime(), nullable=True))
    if "posts" in _tables() and "ix_posts_notice_deadline" not in _indexes("posts"):
        op.create_index("ix_posts_notice_deadline", "posts", ["is_notice", "deadline_at"])
    if "media_assets" in _tables() and "is_private" not in _columns("media_assets"):
        op.add_column("media_assets", sa.Column("is_private", sa.Boolean(), nullable=False, server_default=sa.false()))
        if {"post_attachments", "posts", "boards"}.issubset(_tables()):
            op.execute(
                sa.text(
                    """
                    UPDATE media_assets
                    SET is_private = true, url = NULL
                    WHERE id IN (
                        SELECT pa.media_id
                        FROM post_attachments pa
                        JOIN posts p ON p.id = pa.post_id
                        JOIN boards b ON b.id = p.board_id
                        WHERE b.board_type = 'mutual_aid'
                    )
                    """
                )
            )

    if "users" in _tables():
        if "enrollment_status" not in _columns("users"):
            op.add_column("users", sa.Column("enrollment_status", sa.String(length=20), nullable=False, server_default="active"))
        if "dues_status" not in _columns("users"):
            op.add_column("users", sa.Column("dues_status", sa.String(length=20), nullable=False, server_default="paid"))
        checks = _checks("users")
        if "ck_users_enrollment_status" not in checks:
            op.create_check_constraint("ck_users_enrollment_status", "users", "enrollment_status IN ('active', 'leave', 'graduated')")
        if "ck_users_dues_status" not in checks:
            op.create_check_constraint("ck_users_dues_status", "users", "dues_status IN ('paid', 'unpaid', 'exempt')")

    if "events" in _tables():
        if "ck_events_category" in _checks("events"):
            op.drop_constraint("ck_events_category", "events", type_="check")
        op.create_check_constraint(
            "ck_events_category",
            "events",
            "category IN ('academic', 'event', 'exam', 'council', 'external', 'other')",
        )


def downgrade() -> None:
    if "events" in _tables() and "ck_events_category" in _checks("events"):
        op.drop_constraint("ck_events_category", "events", type_="check")
        op.create_check_constraint("ck_events_category", "events", "category IN ('academic', 'event', 'exam', 'other')")
    if "users" in _tables():
        if "ck_users_dues_status" in _checks("users"):
            op.drop_constraint("ck_users_dues_status", "users", type_="check")
        if "ck_users_enrollment_status" in _checks("users"):
            op.drop_constraint("ck_users_enrollment_status", "users", type_="check")
        if "dues_status" in _columns("users"):
            op.drop_column("users", "dues_status")
        if "enrollment_status" in _columns("users"):
            op.drop_column("users", "enrollment_status")
    if "media_assets" in _tables() and "is_private" in _columns("media_assets"):
        op.drop_column("media_assets", "is_private")
    if "posts" in _tables() and "deadline_at" in _columns("posts"):
        if "ix_posts_notice_deadline" in _indexes("posts"):
            op.drop_index("ix_posts_notice_deadline", table_name="posts")
        op.drop_column("posts", "deadline_at")
    if "banners" in _tables() and "deadline_at" in _columns("banners"):
        op.drop_column("banners", "deadline_at")

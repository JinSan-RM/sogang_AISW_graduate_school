"""phase2 schema alignment

Revision ID: 0005_phase2_schema_alignment
Revises: 0004_push_tokens
Create Date: 2026-04-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0005_phase2_schema_alignment"
down_revision: Union[str, None] = "0004_push_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


BOARD_TYPES = (
    "post",
    "notice",
    "calendar",
    "album",
    "resource",
    "activity_certification",
    "guide",
    "faq",
    "organization_intro",
    "activity_history",
    "external_link",
    "suggestion",
    "mutual_aid",
)
PERMISSIONS = ("guest", "user", "admin")
POST_STATUSES = ("draft", "published", "hidden", "deleted")
EMAIL_PURPOSES = ("register", "change_email")
MEDIA_STATUSES = ("pending", "ready", "failed")
EVENT_CATEGORIES = ("academic", "event", "exam", "other")
SUGGESTION_STATUSES = ("received", "in_progress", "done")
NOTIFICATION_TYPES = ("comment", "like", "notice", "event", "admin_reply", "report")


def _quote_values(values: tuple[str, ...]) -> str:
    return ", ".join(f"'{value}'" for value in values)


def _has_table(table_name: str) -> bool:
    return table_name in set(sa.inspect(op.get_bind()).get_table_names())


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def _has_check(table_name: str, constraint_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return constraint_name in {constraint["name"] for constraint in inspector.get_check_constraints(table_name)}


def _create_check(table_name: str, constraint_name: str, condition: str) -> None:
    if _has_table(table_name) and not _has_check(table_name, constraint_name):
        op.create_check_constraint(constraint_name, table_name, condition)


def _drop_check(table_name: str, constraint_name: str) -> None:
    if _has_table(table_name) and _has_check(table_name, constraint_name):
        op.drop_constraint(constraint_name, table_name, type_="check")


def _normalize_value(table_name: str, column_name: str, allowed_values: tuple[str, ...], fallback: str) -> None:
    if _has_table(table_name) and _has_column(table_name, column_name):
        op.execute(
            sa.text(
                f"UPDATE {table_name} "
                f"SET {column_name} = :fallback "
                f"WHERE {column_name} IS NULL OR {column_name} NOT IN ({_quote_values(allowed_values)})"
            ).bindparams(fallback=fallback)
        )


def _use_jsonb(table_name: str, column_name: str) -> None:
    if _has_table(table_name) and _has_column(table_name, column_name):
        op.alter_column(
            table_name,
            column_name,
            existing_type=sa.JSON(),
            type_=postgresql.JSONB(astext_type=sa.Text()),
            postgresql_using=f"{column_name}::jsonb",
            existing_nullable=True,
        )


def _use_json(table_name: str, column_name: str) -> None:
    if _has_table(table_name) and _has_column(table_name, column_name):
        op.alter_column(
            table_name,
            column_name,
            existing_type=postgresql.JSONB(astext_type=sa.Text()),
            type_=sa.JSON(),
            postgresql_using=f"{column_name}::json",
            existing_nullable=True,
        )


def upgrade() -> None:
    _use_jsonb("boards", "metadata")
    _use_jsonb("posts", "metadata")

    _normalize_value("boards", "board_type", BOARD_TYPES, "post")
    _normalize_value("boards", "read_permission", PERMISSIONS, "guest")
    _normalize_value("boards", "write_permission", PERMISSIONS, "user")
    _normalize_value("posts", "status", POST_STATUSES, "published")
    _normalize_value("email_verification_tokens", "purpose", EMAIL_PURPOSES, "register")
    _normalize_value("media_assets", "status", MEDIA_STATUSES, "pending")
    _normalize_value("events", "category", EVENT_CATEGORIES, "other")
    _normalize_value("post_suggestions", "status", SUGGESTION_STATUSES, "received")
    _normalize_value("notifications", "notification_type", NOTIFICATION_TYPES, "notice")

    _create_check("boards", "ck_boards_board_type", f"board_type IN ({_quote_values(BOARD_TYPES)})")
    _create_check("boards", "ck_boards_read_permission", f"read_permission IN ({_quote_values(PERMISSIONS)})")
    _create_check("boards", "ck_boards_write_permission", f"write_permission IN ({_quote_values(PERMISSIONS)})")
    _create_check("posts", "ck_posts_status", f"status IN ({_quote_values(POST_STATUSES)})")
    _create_check(
        "email_verification_tokens",
        "ck_email_verification_tokens_purpose",
        f"purpose IN ({_quote_values(EMAIL_PURPOSES)})",
    )
    _create_check("media_assets", "ck_media_assets_status", f"status IN ({_quote_values(MEDIA_STATUSES)})")
    _create_check("events", "ck_events_category", f"category IN ({_quote_values(EVENT_CATEGORIES)})")
    _create_check(
        "post_suggestions",
        "ck_post_suggestions_status",
        f"status IN ({_quote_values(SUGGESTION_STATUSES)})",
    )
    _create_check(
        "notifications",
        "ck_notifications_notification_type",
        f"notification_type IN ({_quote_values(NOTIFICATION_TYPES)})",
    )


def downgrade() -> None:
    _drop_check("notifications", "ck_notifications_notification_type")
    _drop_check("post_suggestions", "ck_post_suggestions_status")
    _drop_check("events", "ck_events_category")
    _drop_check("media_assets", "ck_media_assets_status")
    _drop_check("email_verification_tokens", "ck_email_verification_tokens_purpose")
    _drop_check("posts", "ck_posts_status")
    _drop_check("boards", "ck_boards_write_permission")
    _drop_check("boards", "ck_boards_read_permission")
    _drop_check("boards", "ck_boards_board_type")

    _use_json("posts", "metadata")
    _use_json("boards", "metadata")

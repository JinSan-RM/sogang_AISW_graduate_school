"""phase2 foundation

Revision ID: 0002_phase2_foundation
Revises: 0001_phase1_init
Create Date: 2026-04-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_phase2_foundation"
down_revision: Union[str, None] = "0001_phase1_init"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _schema_state():
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    columns = {table: {column["name"] for column in inspector.get_columns(table)} for table in tables}
    indexes = {table: {index["name"] for index in inspector.get_indexes(table)} for table in tables}
    return tables, columns, indexes


def _add_column(table: str, column: sa.Column, columns: dict[str, set[str]]) -> None:
    if column.name not in columns.get(table, set()):
        op.add_column(table, column)


def _create_index(name: str, table: str, column_names: list[str], indexes: dict[str, set[str]]) -> None:
    if name not in indexes.get(table, set()):
        op.create_index(name, table, column_names)


def _create_table(name: str, *elements) -> None:
    tables, _, _ = _schema_state()
    if name not in tables:
        op.create_table(name, *elements)


def upgrade() -> None:
    _, columns, indexes = _schema_state()

    _add_column("users", sa.Column("cohort", sa.String(length=20), nullable=True), columns)
    _add_column("users", sa.Column("last_login_at", sa.DateTime(), nullable=True), columns)
    _create_index("ix_users_role", "users", ["role"], indexes)
    _create_index("ix_users_is_active", "users", ["is_active"], indexes)

    _add_column("boards", sa.Column("board_type", sa.String(length=50), nullable=False, server_default="post"), columns)
    _add_column("boards", sa.Column("allow_anonymous", sa.Boolean(), nullable=False, server_default=sa.text("false")), columns)
    _add_column("boards", sa.Column("read_permission", sa.String(length=20), nullable=False, server_default="guest"), columns)
    _add_column("boards", sa.Column("write_permission", sa.String(length=20), nullable=False, server_default="user"), columns)
    _add_column("boards", sa.Column("metadata", sa.JSON(), nullable=True), columns)

    _add_column("posts", sa.Column("is_anonymous", sa.Boolean(), nullable=False, server_default=sa.text("false")), columns)
    _add_column("posts", sa.Column("status", sa.String(length=20), nullable=False, server_default="published"), columns)
    _add_column("posts", sa.Column("category", sa.String(length=50), nullable=True), columns)
    _add_column("posts", sa.Column("metadata", sa.JSON(), nullable=True), columns)
    _add_column("posts", sa.Column("deleted_at", sa.DateTime(), nullable=True), columns)
    _create_index("ix_posts_board_pinned_created", "posts", ["board_id", "is_pinned", "created_at"], indexes)
    _create_index("ix_posts_board_category", "posts", ["board_id", "category"], indexes)
    _create_index("ix_posts_author_created", "posts", ["author_id", "created_at"], indexes)

    _create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    _, _, indexes = _schema_state()
    _create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"], indexes)
    _create_index("ix_refresh_tokens_expires_at", "refresh_tokens", ["expires_at"], indexes)

    _create_table(
        "email_verification_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=100), nullable=False),
        sa.Column("code_hash", sa.String(length=255), nullable=False),
        sa.Column("purpose", sa.String(length=30), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("consumed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    _, _, indexes = _schema_state()
    _create_index("ix_email_verification_tokens_email", "email_verification_tokens", ["email"], indexes)

    _create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("consumed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    _, _, indexes = _schema_state()
    _create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"], indexes)

    _create_table(
        "media_assets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("stored_filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    _create_table(
        "post_attachments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("media_id", sa.Integer(), sa.ForeignKey("media_assets.id"), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("post_id", "media_id", name="uq_post_attachments_post_media"),
    )

    _create_table(
        "events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("category", sa.String(length=30), nullable=False),
        sa.Column("color", sa.String(length=20), nullable=True),
        sa.Column("start_at", sa.DateTime(), nullable=False),
        sa.Column("end_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    _create_table(
        "faqs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("question", sa.String(length=500), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    _create_table(
        "post_lecture_reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("subject_name", sa.String(length=100), nullable=False),
        sa.Column("professor", sa.String(length=50), nullable=True),
        sa.Column("semester", sa.String(length=20), nullable=True),
        sa.Column("difficulty", sa.SmallInteger(), nullable=True),
        sa.Column("satisfaction", sa.SmallInteger(), nullable=True),
    )

    _create_table(
        "post_suggestions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("suggestion_category", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="received"),
        sa.Column("admin_reply", sa.Text(), nullable=True),
        sa.Column("replied_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("replied_at", sa.DateTime(), nullable=True),
    )

    _create_table(
        "notification_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("notify_comment", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_like", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_notice", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_event", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    _create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("notification_type", sa.String(length=30), nullable=False),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    _create_table(
        "search_histories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("keyword", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    _, _, indexes = _schema_state()
    _create_index("ix_search_histories_user_created", "search_histories", ["user_id", "created_at"], indexes)


def downgrade() -> None:
    op.drop_index("ix_search_histories_user_created", table_name="search_histories")
    op.drop_table("search_histories")
    op.drop_table("notifications")
    op.drop_table("notification_settings")
    op.drop_table("post_suggestions")
    op.drop_table("post_lecture_reviews")
    op.drop_table("faqs")
    op.drop_table("events")
    op.drop_table("post_attachments")
    op.drop_table("media_assets")
    op.drop_index("ix_password_reset_tokens_user_id", table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")
    op.drop_index("ix_email_verification_tokens_email", table_name="email_verification_tokens")
    op.drop_table("email_verification_tokens")
    op.drop_index("ix_refresh_tokens_expires_at", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")

    op.drop_index("ix_posts_author_created", table_name="posts")
    op.drop_index("ix_posts_board_category", table_name="posts")
    op.drop_index("ix_posts_board_pinned_created", table_name="posts")
    op.drop_column("posts", "deleted_at")
    op.drop_column("posts", "metadata")
    op.drop_column("posts", "category")
    op.drop_column("posts", "status")
    op.drop_column("posts", "is_anonymous")

    op.drop_column("boards", "metadata")
    op.drop_column("boards", "write_permission")
    op.drop_column("boards", "read_permission")
    op.drop_column("boards", "allow_anonymous")
    op.drop_column("boards", "board_type")

    op.drop_index("ix_users_is_active", table_name="users")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "cohort")

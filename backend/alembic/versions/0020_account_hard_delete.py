"""support irreversible account deletion and public-content anonymization

Revision ID: 0020_account_hard_delete
Revises: 0019_past_councils
Create Date: 2026-07-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0020_account_hard_delete"
down_revision: Union[str, None] = "0019_past_councils"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _replace_user_fk(
    table_name: str,
    column_name: str,
    *,
    ondelete: str | None,
) -> None:
    constraint_name = f"{table_name}_{column_name}_fkey"
    op.drop_constraint(constraint_name, table_name, type_="foreignkey")
    op.create_foreign_key(
        constraint_name,
        table_name,
        "users",
        [column_name],
        ["id"],
        ondelete=ondelete,
    )


def upgrade() -> None:
    op.drop_constraint(
        "ck_email_verification_tokens_purpose",
        "email_verification_tokens",
        type_="check",
    )
    op.create_check_constraint(
        "ck_email_verification_tokens_purpose",
        "email_verification_tokens",
        "purpose IN ('register', 'change_email', 'account_delete')",
    )

    for table_name, column_name in (
        ("posts", "author_id"),
        ("comments", "author_id"),
        ("media_assets", "owner_id"),
    ):
        _replace_user_fk(table_name, column_name, ondelete="SET NULL")
        op.alter_column(
            table_name,
            column_name,
            existing_type=sa.Integer(),
            nullable=True,
        )

    for table_name, column_name in (
        ("likes", "user_id"),
        ("bookmarks", "user_id"),
    ):
        _replace_user_fk(table_name, column_name, ondelete="CASCADE")

    for table_name, column_name in (
        ("banners", "created_by"),
        ("events", "created_by"),
        ("post_suggestions", "replied_by"),
        ("post_mutual_aid", "reviewed_by"),
    ):
        _replace_user_fk(table_name, column_name, ondelete="SET NULL")


def downgrade() -> None:
    connection = op.get_bind()
    null_counts = {
        table_name: connection.scalar(
            sa.text(f"SELECT COUNT(*) FROM {table_name} WHERE {column_name} IS NULL")
        )
        for table_name, column_name in (
            ("posts", "author_id"),
            ("comments", "author_id"),
            ("media_assets", "owner_id"),
        )
    }
    if any(null_counts.values()):
        detail = ", ".join(f"{table}={count}" for table, count in null_counts.items() if count)
        raise RuntimeError(
            "Cannot downgrade account hard-delete support after irreversible anonymization "
            f"has occurred ({detail}). Restore a pre-deletion backup instead."
        )

    for table_name, column_name in (
        ("banners", "created_by"),
        ("events", "created_by"),
        ("post_suggestions", "replied_by"),
        ("post_mutual_aid", "reviewed_by"),
    ):
        _replace_user_fk(table_name, column_name, ondelete=None)

    for table_name, column_name in (
        ("likes", "user_id"),
        ("bookmarks", "user_id"),
    ):
        _replace_user_fk(table_name, column_name, ondelete=None)

    for table_name, column_name in (
        ("posts", "author_id"),
        ("comments", "author_id"),
        ("media_assets", "owner_id"),
    ):
        _replace_user_fk(table_name, column_name, ondelete=None)
        op.alter_column(
            table_name,
            column_name,
            existing_type=sa.Integer(),
            nullable=False,
        )

    op.execute(
        sa.text(
            "DELETE FROM email_verification_tokens "
            "WHERE purpose = 'account_delete'"
        )
    )
    op.drop_constraint(
        "ck_email_verification_tokens_purpose",
        "email_verification_tokens",
        type_="check",
    )
    op.create_check_constraint(
        "ck_email_verification_tokens_purpose",
        "email_verification_tokens",
        "purpose IN ('register', 'change_email')",
    )

"""add auth verification attempt and reset-code state

Revision ID: 0013_auth_verification_states
Revises: 0012_figma_function_alignment
Create Date: 2026-07-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0013_auth_verification_states"
down_revision: Union[str, None] = "0012_figma_function_alignment"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    return table_name in set(sa.inspect(op.get_bind()).get_table_names())


def _has_column(table_name: str, column_name: str) -> bool:
    if not _has_table(table_name):
        return False
    return column_name in {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade() -> None:
    if _has_table("email_verification_tokens") and not _has_column("email_verification_tokens", "attempt_count"):
        op.add_column(
            "email_verification_tokens",
            sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        )
        op.alter_column("email_verification_tokens", "attempt_count", server_default=None)

    if _has_table("password_reset_tokens"):
        if not _has_column("password_reset_tokens", "verified_at"):
            op.add_column("password_reset_tokens", sa.Column("verified_at", sa.DateTime(), nullable=True))
        if not _has_column("password_reset_tokens", "attempt_count"):
            op.add_column(
                "password_reset_tokens",
                sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
            )
            op.alter_column("password_reset_tokens", "attempt_count", server_default=None)


def downgrade() -> None:
    if _has_column("password_reset_tokens", "attempt_count"):
        op.drop_column("password_reset_tokens", "attempt_count")
    if _has_column("password_reset_tokens", "verified_at"):
        op.drop_column("password_reset_tokens", "verified_at")
    if _has_column("email_verification_tokens", "attempt_count"):
        op.drop_column("email_verification_tokens", "attempt_count")

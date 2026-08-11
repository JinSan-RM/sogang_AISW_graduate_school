"""preserve post and comment author display snapshots

Revision ID: 0025_author_content_snapshots
Revises: 0024_faq_attachments
Create Date: 2026-08-11
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0025_author_content_snapshots"
down_revision: Union[str, None] = "0024_faq_attachments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _backfill(table_name: str) -> None:
    op.execute(
        sa.text(
            f"""
            UPDATE {table_name}
            SET author_nickname_snapshot = (
                    SELECT users.nickname
                    FROM users
                    WHERE users.id = {table_name}.author_id
                ),
                author_cohort_snapshot = (
                    SELECT users.cohort
                    FROM users
                    WHERE users.id = {table_name}.author_id
                )
            WHERE author_id IS NOT NULL
              AND author_nickname_snapshot IS NULL
            """
        )
    )


def upgrade() -> None:
    for table_name in ("posts", "comments"):
        op.add_column(
            table_name,
            sa.Column("author_nickname_snapshot", sa.String(length=50), nullable=True),
        )
        op.add_column(
            table_name,
            sa.Column("author_cohort_snapshot", sa.String(length=20), nullable=True),
        )
        _backfill(table_name)


def downgrade() -> None:
    for table_name in ("comments", "posts"):
        with op.batch_alter_table(table_name) as batch_op:
            batch_op.drop_column("author_cohort_snapshot")
            batch_op.drop_column("author_nickname_snapshot")

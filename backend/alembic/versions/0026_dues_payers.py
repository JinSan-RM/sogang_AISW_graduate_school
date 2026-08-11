"""add dues payer roster

Revision ID: 0026_dues_payers
Revises: 0025_author_content_snapshots
Create Date: 2026-08-11
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0026_dues_payers"
down_revision: Union[str, None] = "0025_author_content_snapshots"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "dues_payers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_number", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("major", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_number", name="uq_dues_payers_student_number"),
    )
    op.create_index("ix_dues_payers_name", "dues_payers", ["name"])


def downgrade() -> None:
    op.drop_index("ix_dues_payers_name", table_name="dues_payers")
    op.drop_table("dues_payers")

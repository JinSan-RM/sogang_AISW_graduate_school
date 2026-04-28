"""reports

Revision ID: 0003_reports
Revises: 0002_phase2_foundation
Create Date: 2026-04-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_reports"
down_revision: Union[str, None] = "0002_phase2_foundation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    if "reports" not in tables:
        op.create_table(
            "reports",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("reporter_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("target_type", sa.String(length=20), nullable=False),
            sa.Column("target_id", sa.Integer(), nullable=False),
            sa.Column("reason", sa.String(length=50), nullable=False),
            sa.Column("detail", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.UniqueConstraint("reporter_id", "target_type", "target_id", name="uq_reports_reporter_target"),
        )
    indexes = {index["name"] for index in inspector.get_indexes("reports")} if "reports" in set(sa.inspect(op.get_bind()).get_table_names()) else set()
    if "ix_reports_target" not in indexes:
        op.create_index("ix_reports_target", "reports", ["target_type", "target_id"])
    if "ix_reports_status_created" not in indexes:
        op.create_index("ix_reports_status_created", "reports", ["status", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_reports_status_created", table_name="reports")
    op.drop_index("ix_reports_target", table_name="reports")
    op.drop_table("reports")

"""admin banners

Revision ID: 0007_admin_banners
Revises: 0006_user_blocks
Create Date: 2026-06-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0007_admin_banners"
down_revision: Union[str, None] = "0006_user_blocks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    if "banners" not in tables:
        op.create_table(
            "banners",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("placement", sa.String(length=30), nullable=False, server_default="home"),
            sa.Column("title", sa.String(length=120), nullable=False),
            sa.Column("subtitle", sa.Text(), nullable=True),
            sa.Column("badge_text", sa.String(length=80), nullable=True),
            sa.Column("cta_label", sa.String(length=50), nullable=True),
            sa.Column("cta_href", sa.String(length=255), nullable=True),
            sa.Column("image_url", sa.String(length=500), nullable=True),
            sa.Column("theme", sa.String(length=20), nullable=False, server_default="blue"),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("starts_at", sa.DateTime(), nullable=True),
            sa.Column("ends_at", sa.DateTime(), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
            sa.CheckConstraint("placement IN ('home')", name="ck_banners_placement"),
            sa.CheckConstraint("theme IN ('none', 'blue', 'navy', 'cyan', 'purple')", name="ck_banners_theme"),
        )

    indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes("banners")}
    if "ix_banners_placement_active_order" not in indexes:
        op.create_index(
            "ix_banners_placement_active_order",
            "banners",
            ["placement", "is_active", "sort_order"],
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "banners" not in set(inspector.get_table_names()):
        return
    indexes = {index["name"] for index in inspector.get_indexes("banners")}
    if "ix_banners_placement_active_order" in indexes:
        op.drop_index("ix_banners_placement_active_order", table_name="banners")
    op.drop_table("banners")

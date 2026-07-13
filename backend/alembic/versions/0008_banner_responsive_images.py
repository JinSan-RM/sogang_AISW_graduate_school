"""banner responsive images

Revision ID: 0008_banner_responsive_images
Revises: 0007_admin_banners
Create Date: 2026-06-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0008_banner_responsive_images"
down_revision: Union[str, None] = "0007_admin_banners"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "banners" not in set(inspector.get_table_names()):
        return
    columns = {column["name"] for column in inspector.get_columns("banners")}
    if "image_urls" not in columns:
        op.add_column("banners", sa.Column("image_urls", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "banners" not in set(inspector.get_table_names()):
        return
    columns = {column["name"] for column in inspector.get_columns("banners")}
    if "image_urls" in columns:
        op.drop_column("banners", "image_urls")

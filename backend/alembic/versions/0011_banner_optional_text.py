"""allow image-only banners

Revision ID: 0011_banner_optional_text
Revises: 0010_banner_none_theme
Create Date: 2026-07-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0011_banner_optional_text"
down_revision: Union[str, None] = "0010_banner_none_theme"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "banners" not in set(inspector.get_table_names()):
        return
    op.alter_column("banners", "title", existing_type=sa.String(length=120), nullable=True)


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "banners" not in set(inspector.get_table_names()):
        return
    op.execute("UPDATE banners SET title = 'Untitled banner' WHERE title IS NULL OR title = ''")
    op.alter_column("banners", "title", existing_type=sa.String(length=120), nullable=False)

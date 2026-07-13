"""allow none banner theme

Revision ID: 0010_banner_none_theme
Revises: 0009_policy_260705_alignment
Create Date: 2026-07-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0010_banner_none_theme"
down_revision: Union[str, None] = "0009_policy_260705_alignment"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _constraint_exists(name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    if "banners" not in set(inspector.get_table_names()):
        return False
    return any(constraint["name"] == name for constraint in inspector.get_check_constraints("banners"))


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "banners" not in set(inspector.get_table_names()):
        return
    if _constraint_exists("ck_banners_theme"):
        op.drop_constraint("ck_banners_theme", "banners", type_="check")
    op.create_check_constraint(
        "ck_banners_theme",
        "banners",
        "theme IN ('none', 'blue', 'navy', 'cyan', 'purple')",
    )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "banners" not in set(inspector.get_table_names()):
        return
    op.execute("UPDATE banners SET theme = 'blue' WHERE theme = 'none'")
    if _constraint_exists("ck_banners_theme"):
        op.drop_constraint("ck_banners_theme", "banners", type_="check")
    op.create_check_constraint(
        "ck_banners_theme",
        "banners",
        "theme IN ('blue', 'navy', 'cyan', 'purple')",
    )

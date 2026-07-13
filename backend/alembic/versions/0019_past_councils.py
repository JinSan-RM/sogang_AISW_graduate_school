"""add past councils admin board

Revision ID: 0019_past_councils
Revises: 0018_club_posts_admin
Create Date: 2026-07-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0019_past_councils"
down_revision: Union[str, None] = "0018_club_posts_admin"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "INSERT INTO boards "
            "(name, slug, category, board_type, description, sort_order, allow_anonymous, "
            "read_permission, write_permission, metadata, is_active, created_at) "
            "SELECT '역대 원우회', 'gsa-past-councils', 'gsa', 'organization_intro', "
            "'역대 원우회 임원진과 활동내역을 확인합니다.', 80, false, 'user', 'admin', "
            "'{}'::jsonb, true, CURRENT_TIMESTAMP "
            "WHERE NOT EXISTS (SELECT 1 FROM boards WHERE slug = 'gsa-past-councils')"
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM boards WHERE slug = 'gsa-past-councils'"))

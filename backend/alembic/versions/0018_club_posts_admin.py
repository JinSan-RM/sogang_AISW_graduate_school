"""align participation board write permissions

Revision ID: 0018_club_posts_admin
Revises: 0017_registration_settings
Create Date: 2026-07-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0018_club_posts_admin"
down_revision: Union[str, None] = "0017_registration_settings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE boards SET write_permission = 'admin' "
            "WHERE slug IN ('club-promo', 'networking-programs')"
        )
    )
    op.execute(
        sa.text(
            "UPDATE boards SET write_permission = 'user' "
            "WHERE slug IN ('study-recruit', 'club-activity', 'study-activity', 'networking-activity')"
        )
    )
    op.execute(
        sa.text(
            "UPDATE boards SET write_permission = 'admin' "
            "WHERE category IN ('council', 'gsa') "
            "AND board_type NOT IN ('suggestion', 'mutual_aid')"
        )
    )
    op.execute(
        sa.text(
            "UPDATE boards SET write_permission = 'user' "
            "WHERE category IN ('council', 'gsa') "
            "AND board_type IN ('suggestion', 'mutual_aid')"
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE boards SET write_permission = 'user' "
            "WHERE slug = 'club-promo'"
        )
    )

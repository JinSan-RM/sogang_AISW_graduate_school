"""collapse event categories to academic/event/other

Revision ID: 0027_event_category_cleanup
Revises: 0026_dues_payers
Create Date: 2026-08-24

"""

from typing import Sequence, Union

from alembic import op


revision: str = "0027_event_category_cleanup"
down_revision: Union[str, None] = "0026_dues_payers"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 일정 카테고리는 학사일정/행사일정/기타일정 3종만 쓴다. 나머지는 기타로 흡수.
    op.execute("UPDATE events SET category = 'other' WHERE category NOT IN ('academic', 'event', 'other')")


def downgrade() -> None:
    # 원본 구분은 복원할 수 없다 — 데이터 정리 마이그레이션.
    pass

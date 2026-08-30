"""retain the 0027 revision without rewriting event categories

Revision ID: 0027_event_category_cleanup
Revises: 0026_dues_payers
Create Date: 2026-08-24

This revision may already be recorded in deployed databases. Keeping the
revision makes those databases compatible with the migration graph, while the
no-op upgrade preserves all legacy event category values.
"""

from typing import Sequence, Union


revision: str = "0027_event_category_cleanup"
down_revision: Union[str, None] = "0026_dues_payers"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

"""align signup major options with the current AISW program list

Revision ID: 0023_registration_major_options
Revises: 0022_legacy_import_records
Create Date: 2026-08-04
"""

from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0023_registration_major_options"
down_revision: Union[str, None] = "0022_legacy_import_records"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


OFFICIAL_MAJOR_OPTIONS = (
    "데이터사이언스ㆍ인공지능",
    "데이터사이언스",
    "인공지능",
    "소프트웨어공학",
    "소프트웨어공학 및 컴퓨터시스템",
    "정보보호",
    "블록체인",
    "보안 및 블록체인",
)

LEGACY_MAJOR_OPTIONS = (
    "인공지능",
    "소프트웨어",
    "블록체인",
    "데이터사이언스·인공지능",
)

major_options = sa.table(
    "major_options",
    sa.column("id", sa.Integer),
    sa.column("name", sa.String),
    sa.column("sort_order", sa.Integer),
    sa.column("is_active", sa.Boolean),
    sa.column("created_at", sa.DateTime),
    sa.column("updated_at", sa.DateTime),
)


def _sync_major_options(bind, names: tuple[str, ...]) -> None:
    now = datetime.utcnow()
    bind.execute(sa.update(major_options).values(is_active=False, updated_at=now))

    for index, name in enumerate(names, start=1):
        existing_id = bind.execute(
            sa.select(major_options.c.id).where(major_options.c.name == name)
        ).scalar_one_or_none()
        values = {
            "sort_order": index * 10,
            "is_active": True,
            "updated_at": now,
        }
        if existing_id is None:
            bind.execute(
                sa.insert(major_options).values(
                    name=name,
                    created_at=now,
                    **values,
                )
            )
        else:
            bind.execute(
                sa.update(major_options)
                .where(major_options.c.id == existing_id)
                .values(**values)
            )


def upgrade() -> None:
    _sync_major_options(op.get_bind(), OFFICIAL_MAJOR_OPTIONS)


def downgrade() -> None:
    _sync_major_options(op.get_bind(), LEGACY_MAJOR_OPTIONS)

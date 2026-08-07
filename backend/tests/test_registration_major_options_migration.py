from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import sqlalchemy as sa


MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "0023_registration_major_options.py"
)


def _load_migration():
    spec = spec_from_file_location("registration_major_options_migration", MIGRATION_PATH)
    assert spec is not None and spec.loader is not None
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_registration_major_migration_activates_only_the_official_options() -> None:
    migration = _load_migration()
    engine = sa.create_engine("sqlite:///:memory:")
    metadata = sa.MetaData()
    majors = sa.Table(
        "major_options",
        metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(100), unique=True, nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    metadata.create_all(engine)

    now = migration.datetime.utcnow()
    with engine.begin() as connection:
        connection.execute(
            sa.insert(majors),
            [
                {
                    "name": "인공지능",
                    "sort_order": 40,
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                },
                {
                    "name": "이전 관리자 추가 전공",
                    "sort_order": 50,
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                },
            ],
        )
        migration._sync_major_options(connection, migration.OFFICIAL_MAJOR_OPTIONS)
        active_names = connection.execute(
            sa.select(majors.c.name)
            .where(majors.c.is_active.is_(True))
            .order_by(majors.c.sort_order)
        ).scalars().all()
        custom_is_active = connection.execute(
            sa.select(majors.c.is_active).where(majors.c.name == "이전 관리자 추가 전공")
        ).scalar_one()

    assert active_names == list(migration.OFFICIAL_MAJOR_OPTIONS)
    assert custom_is_active is False

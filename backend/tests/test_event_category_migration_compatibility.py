from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations


MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "0027_event_category_cleanup.py"
)


def _load_migration():
    spec = spec_from_file_location("event_category_compatibility_migration", MIGRATION_PATH)
    assert spec is not None and spec.loader is not None
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_0027_upgrade_collapses_legacy_event_categories_to_other() -> None:
    migration = _load_migration()
    engine = sa.create_engine("sqlite://")

    with engine.begin() as connection:
        connection.execute(
            sa.text(
                "CREATE TABLE events ("
                "id INTEGER PRIMARY KEY, "
                "category VARCHAR(50) NOT NULL"
                ")"
            )
        )
        for index, category in enumerate(
            ("academic", "event", "exam", "council", "external", "other"),
            start=1,
        ):
            connection.execute(
                sa.text("INSERT INTO events (id, category) VALUES (:id, :category)"),
                {"id": index, "category": category},
            )

        migration.op = Operations(MigrationContext.configure(connection))
        migration.upgrade()

        categories = connection.execute(
            sa.text("SELECT category FROM events ORDER BY id")
        ).scalars().all()

    assert migration.revision == "0027_event_category_cleanup"
    assert migration.down_revision == "0026_dues_payers"
    assert categories == ["academic", "event", "other", "other", "other", "other"]

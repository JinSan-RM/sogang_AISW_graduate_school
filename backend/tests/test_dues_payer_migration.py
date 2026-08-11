from pathlib import Path
from importlib.util import module_from_spec, spec_from_file_location

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations


MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "0026_dues_payers.py"
)


def _load_migration():
    spec = spec_from_file_location("dues_payer_migration", MIGRATION_PATH)
    assert spec is not None and spec.loader is not None
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_dues_payer_migration_creates_unique_searchable_roster_table() -> None:
    migration = _load_migration()
    assert migration.down_revision == "0025_author_content_snapshots"
    engine = sa.create_engine("sqlite:///:memory:")

    with engine.begin() as connection:
        migration.op = Operations(MigrationContext.configure(connection))
        migration.upgrade()
        inspector = sa.inspect(connection)

        assert "dues_payers" in inspector.get_table_names()
        assert {column["name"] for column in inspector.get_columns("dues_payers")} == {
            "id",
            "student_number",
            "name",
            "major",
            "created_at",
            "updated_at",
        }
        assert any(
            constraint["name"] == "uq_dues_payers_student_number"
            and constraint["column_names"] == ["student_number"]
            for constraint in inspector.get_unique_constraints("dues_payers")
        )
        assert any(
            index["name"] == "ix_dues_payers_name"
            and index["column_names"] == ["name"]
            for index in inspector.get_indexes("dues_payers")
        )

        migration.downgrade()
        assert "dues_payers" not in sa.inspect(connection).get_table_names()


def test_dues_payer_model_matches_migration_constraints() -> None:
    from app.models.dues_payer import DuesPayer

    constraints = {constraint.name for constraint in DuesPayer.__table__.constraints}
    indexes = {index.name: tuple(column.name for column in index.columns) for index in DuesPayer.__table__.indexes}

    assert "uq_dues_payers_student_number" in constraints
    assert indexes["ix_dues_payers_name"] == ("name",)

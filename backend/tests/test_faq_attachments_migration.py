from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations


MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "0024_faq_attachments.py"
)


def _load_migration():
    spec = spec_from_file_location("faq_attachments_migration", MIGRATION_PATH)
    assert spec is not None and spec.loader is not None
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_faq_attachment_migration_creates_and_drops_the_relation_table() -> None:
    migration = _load_migration()
    assert migration.down_revision == "0023_registration_major_options"
    engine = sa.create_engine("sqlite:///:memory:")
    metadata = sa.MetaData()
    sa.Table("faqs", metadata, sa.Column("id", sa.Integer, primary_key=True))
    sa.Table("media_assets", metadata, sa.Column("id", sa.Integer, primary_key=True))
    metadata.create_all(engine)

    with engine.begin() as connection:
        migration.op = Operations(MigrationContext.configure(connection))
        migration.upgrade()
        inspector = sa.inspect(connection)
        assert "faq_attachments" in inspector.get_table_names()
        unique_constraints = inspector.get_unique_constraints("faq_attachments")
        assert any(
            constraint["name"] == "uq_faq_attachments_faq_media"
            and set(constraint["column_names"]) == {"faq_id", "media_id"}
            for constraint in unique_constraints
        )
        migration.downgrade()
        assert "faq_attachments" not in sa.inspect(connection).get_table_names()

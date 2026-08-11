from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations

from app.models.comment import Comment
from app.models.post import Post


MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "0025_author_content_snapshots.py"
)


def _load_migration():
    spec = spec_from_file_location("author_content_snapshots_migration", MIGRATION_PATH)
    assert spec is not None and spec.loader is not None
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_author_snapshot_migration_adds_backfills_and_drops_columns() -> None:
    migration = _load_migration()
    assert migration.down_revision == "0024_faq_attachments"
    engine = sa.create_engine("sqlite:///:memory:")
    metadata = sa.MetaData()
    users = sa.Table(
        "users",
        metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("nickname", sa.String(50), nullable=False),
        sa.Column("cohort", sa.String(20)),
    )
    posts = sa.Table(
        "posts",
        metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("author_id", sa.Integer),
    )
    comments = sa.Table(
        "comments",
        metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("author_id", sa.Integer),
    )
    metadata.create_all(engine)

    with engine.begin() as connection:
        connection.execute(users.insert(), [{"id": 1, "nickname": "Owner", "cohort": "72"}])
        connection.execute(posts.insert(), [{"id": 1, "author_id": 1}, {"id": 2, "author_id": None}])
        connection.execute(comments.insert(), [{"id": 1, "author_id": 1}, {"id": 2, "author_id": None}])

        migration.op = Operations(MigrationContext.configure(connection))
        migration.upgrade()

        post_rows = connection.execute(
            sa.text(
                "SELECT id, author_nickname_snapshot, author_cohort_snapshot "
                "FROM posts ORDER BY id"
            )
        ).mappings().all()
        comment_rows = connection.execute(
            sa.text(
                "SELECT id, author_nickname_snapshot, author_cohort_snapshot "
                "FROM comments ORDER BY id"
            )
        ).mappings().all()
        assert post_rows == [
            {"id": 1, "author_nickname_snapshot": "Owner", "author_cohort_snapshot": "72"},
            {"id": 2, "author_nickname_snapshot": None, "author_cohort_snapshot": None},
        ]
        assert comment_rows == post_rows

        migration.downgrade()
        post_columns = {column["name"] for column in sa.inspect(connection).get_columns("posts")}
        comment_columns = {column["name"] for column in sa.inspect(connection).get_columns("comments")}
        assert "author_nickname_snapshot" not in post_columns
        assert "author_cohort_snapshot" not in post_columns
        assert "author_nickname_snapshot" not in comment_columns
        assert "author_cohort_snapshot" not in comment_columns


def test_post_and_comment_models_declare_author_snapshot_columns() -> None:
    for model in (Post, Comment):
        columns = model.__table__.columns
        assert columns["author_nickname_snapshot"].type.length == 50
        assert columns["author_nickname_snapshot"].nullable is True
        assert columns["author_cohort_snapshot"].type.length == 20
        assert columns["author_cohort_snapshot"].nullable is True

from __future__ import annotations

import sys
from dataclasses import dataclass
from datetime import date
import os
from pathlib import Path
from typing import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.engine import make_url
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app import models  # noqa: E402,F401
from app.database import Base  # noqa: E402
from app.deps import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.board import Board  # noqa: E402
from app.models.comment import Comment  # noqa: E402
from app.models.media import MediaAsset, PostAttachment  # noqa: E402
from app.models.post import Post  # noqa: E402
from app.models.post_extension import PostMutualAid  # noqa: E402
from app.models.user import User  # noqa: E402
from app.routers import auth as auth_router  # noqa: E402
from app.routers import comments as comments_router  # noqa: E402
from app.routers import posts as posts_router  # noqa: E402
from app.routers import reports as reports_router  # noqa: E402
from app.routers import users as users_router  # noqa: E402
from app.security import create_access_token, hash_password  # noqa: E402

TEST_PASSWORD = "TestPassword1!"


@compiles(JSONB, "sqlite")
def _compile_jsonb_for_sqlite(_type, _compiler, **_kwargs):
    return "JSON"


@dataclass(frozen=True)
class ApiContext:
    client: TestClient
    session_factory: sessionmaker[Session]
    headers: dict[str, dict[str, str]]

    def session(self) -> Session:
        return self.session_factory()


@pytest.fixture(scope="session")
def password_hash() -> str:
    return hash_password(TEST_PASSWORD)


@pytest.fixture(autouse=True)
def isolate_request_side_effects(monkeypatch: pytest.MonkeyPatch) -> None:
    no_op = lambda *_args, **_kwargs: None
    monkeypatch.setattr(auth_router, "enforce_rate_limit", no_op)
    monkeypatch.setattr(posts_router, "enforce_rate_limit", no_op)
    monkeypatch.setattr(comments_router, "enforce_rate_limit", no_op)
    monkeypatch.setattr(reports_router, "enforce_rate_limit", no_op)
    monkeypatch.setattr(users_router, "enforce_rate_limit", no_op)
    monkeypatch.setattr(posts_router, "create_notification", no_op)
    monkeypatch.setattr(comments_router, "create_notification", no_op)


def _database_url() -> str:
    configured_url = os.getenv("TEST_DATABASE_URL")
    if not configured_url:
        return "sqlite+pysqlite://"

    parsed_url = make_url(configured_url)
    database_name = (parsed_url.database or "").lower()
    app_environment = os.getenv("APP_ENVIRONMENT", "").lower()
    reset_allowed = os.getenv("ALLOW_TEST_DB_RESET", "") == "1"
    has_explicit_test_name = (
        database_name == "test"
        or database_name.startswith("test_")
        or database_name.endswith("_test")
    )
    if app_environment != "test" or not reset_allowed or not has_explicit_test_name:
        raise RuntimeError(
            "Refusing to reset TEST_DATABASE_URL unless APP_ENVIRONMENT=test, "
            "ALLOW_TEST_DB_RESET=1, and the database name is 'test', starts with "
            "'test_', or ends with '_test'."
        )
    return configured_url


@pytest.fixture
def api(password_hash: str, request: pytest.FixtureRequest) -> Iterator[ApiContext]:
    database_url = _database_url()
    is_sqlite = make_url(database_url).get_backend_name() == "sqlite"
    engine_options = {"future": True}
    if is_sqlite:
        engine_options.update(
            {
                "connect_args": {"check_same_thread": False},
                "poolclass": StaticPool,
            }
        )
    engine = create_engine(database_url, **engine_options)
    clients: list[TestClient] = []

    def _cleanup() -> None:
        for test_client in clients:
            test_client.close()
        app.dependency_overrides.pop(get_db, None)
        try:
            Base.metadata.drop_all(engine)
        finally:
            engine.dispose()

    # Pytest runs finalizers even when fixture setup fails after this point.
    request.addfinalizer(_cleanup)

    if is_sqlite:
        @event.listens_for(engine, "connect")
        def _enable_foreign_keys(dbapi_connection, _connection_record) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    # TEST_DATABASE_URL is guarded above because this reset is destructive.
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    with testing_session() as db:
        db.add_all(
            [
                User(
                    username="owner",
                    email="owner@sogang.ac.kr",
                    nickname="Owner",
                    password_hash=password_hash,
                    role="user",
                ),
                User(
                    username="other",
                    email="other@sogang.ac.kr",
                    nickname="Other",
                    password_hash=password_hash,
                    role="user",
                ),
                User(
                    username="admin",
                    email="admin@sogang.ac.kr",
                    nickname="Admin",
                    password_hash=password_hash,
                    role="admin",
                ),
            ]
        )
        db.add_all(
            [
                Board(
                    name="Mutual Aid",
                    slug="mutual-aid",
                    category="council",
                    board_type="mutual_aid",
                    read_permission="user",
                    write_permission="user",
                ),
                Board(
                    name="General",
                    slug="general",
                    category="community",
                    board_type="post",
                    read_permission="user",
                    write_permission="user",
                ),
            ]
        )
        db.flush()
        db.add(
            MediaAsset(
                owner_id=1,
                original_filename="thumbnail.png",
                stored_filename="thumbnail.png",
                content_type="image/png",
                file_size=123,
                url="/uploads/thumbnail.png",
                status="ready",
            )
        )
        db.flush()
        db.add_all(
            [
                Post(
                    board_id=1,
                    author_id=1,
                    title="Private Need Alpha",
                    content="Owner private request",
                    comment_count=1,
                ),
                Post(
                    board_id=1,
                    author_id=2,
                    title="Private Need Beta",
                    content="Other private request",
                ),
                Post(
                    board_id=2,
                    author_id=1,
                    title="Public General Topic",
                    content="A regular post",
                ),
                Post(
                    board_id=2,
                    author_id=1,
                    title="Owner Hidden Draft",
                    content="Only the author and admins may read this",
                    status="hidden",
                ),
                Post(
                    board_id=2,
                    author_id=2,
                    title="Other Private Draft",
                    content="Only the other user and admins may read this",
                    status="draft",
                ),
            ]
        )
        db.flush()
        db.add(PostAttachment(post_id=3, media_id=1, sort_order=0))
        db.add_all(
            [
                PostMutualAid(
                    post_id=1,
                    event_type="wedding",
                    event_date=date(2026, 8, 1),
                    relation="self",
                ),
                PostMutualAid(
                    post_id=2,
                    event_type="funeral",
                    event_date=date(2026, 8, 2),
                    relation="family",
                ),
            ]
        )
        db.add(Comment(post_id=1, author_id=1, content="Owner comment"))
        db.commit()

    def _override_get_db() -> Iterator[Session]:
        with testing_session() as db:
            yield db

    app.dependency_overrides[get_db] = _override_get_db
    client = TestClient(app)
    clients.append(client)
    headers = {
        "owner": {"Authorization": f"Bearer {create_access_token(1, 'user')}"},
        "other": {"Authorization": f"Bearer {create_access_token(2, 'user')}"},
        "admin": {"Authorization": f"Bearer {create_access_token(3, 'admin')}"},
    }

    yield ApiContext(client=client, session_factory=testing_session, headers=headers)

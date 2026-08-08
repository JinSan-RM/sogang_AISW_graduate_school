from __future__ import annotations

from pathlib import Path
import sys

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app import notifications as notifications_module
from app.database import Base
from app.models.notification import Notification
from app.routers import comments as comments_router


@pytest.fixture
def db() -> Session:
    engine = create_engine("sqlite+pysqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def _notify(db: Session) -> Notification | None:
    return notifications_module.create_notification(
        db,
        user_id=1,
        actor_id=1,
        notification_type="comment",
        message='내 게시글에 새 댓글이 달렸어요: "저도 참여하고 싶어요!"',
        post_id=1,
        setting_field="notify_comment",
    )


def test_self_notification_skipped_by_default(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(notifications_module, "send_push_to_user", lambda *_a, **_k: None)
    monkeypatch.setattr(notifications_module.settings, "notify_self", False)

    assert _notify(db) is None
    assert db.scalars(select(Notification)).all() == []


def test_self_notification_created_when_enabled(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(notifications_module, "send_push_to_user", lambda *_a, **_k: None)
    monkeypatch.setattr(notifications_module.settings, "notify_self", True)

    assert _notify(db) is not None
    stored = db.scalars(select(Notification)).all()
    assert len(stored) == 1
    assert stored[0].message == '내 게시글에 새 댓글이 달렸어요: "저도 참여하고 싶어요!"'


@pytest.mark.parametrize(
    ("content", "expected"),
    [
        ("저도 참여하고 싶어요!", '내 게시글에 새 댓글이 달렸어요: "저도 참여하고 싶어요!"'),
        ("여러 줄로\n  적힌   댓글", '내 게시글에 새 댓글이 달렸어요: "여러 줄로 적힌 댓글"'),
        ("가" * 45, f'내 게시글에 새 댓글이 달렸어요: "{"가" * 40}…"'),
    ],
)
def test_comment_notification_message(api, monkeypatch: pytest.MonkeyPatch, content: str, expected: str) -> None:
    calls: list[dict] = []
    monkeypatch.setattr(comments_router, "create_notification", lambda *_a, **kwargs: calls.append(kwargs))

    response = api.client.post("/api/posts/3/comments", json={"content": content}, headers=api.headers["other"])

    assert response.status_code == 200, response.text
    assert calls[0]["message"] == expected


def test_test_script_reuses_real_message_builders(db: Session) -> None:
    """scripts/send_test_notifications.py must never invent its own wording or fake links."""
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
    import send_test_notifications as script

    jobs = script.build_jobs(db, user_id=1)
    assert [job[0] for job in jobs] == script.SAMPLE_NAMES
    # Empty database: every sample skips with a hint instead of linking to unrelated data.
    assert all(message is None and hint for _n, _t, message, _p, _e, hint in jobs)

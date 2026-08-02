import json
import logging
from datetime import date

import pytest
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.requests import Request

from app.errors import http_exception_handler, unhandled_exception_handler
from app.models.comment import Comment
from app.models.media import MediaAsset
from app.models.post import Post
from app.models.post_extension import PostMutualAid
from app.routers import posts as posts_router
from app.schemas.comment import COMMENT_MAX_LENGTH
from app.schemas.post import POST_CONTENT_MAX_LENGTH, POST_TITLE_MAX_LENGTH


def _assert_validation_error(response) -> None:
    assert response.status_code == 422
    assert response.json()["status"] == "error"
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert set(response.json()) == {"status", "message", "code"}


def test_unhandled_exception_is_logged_without_leaking_details(caplog) -> None:
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/example",
            "headers": [],
            "query_string": b"",
            "server": ("testserver", 80),
            "client": ("testclient", 123),
            "scheme": "http",
        }
    )

    with caplog.at_level(logging.ERROR, logger="app.errors"):
        response = unhandled_exception_handler(request, RuntimeError("sensitive database detail"))

    assert response.status_code == 500
    assert json.loads(response.body) == {
        "status": "error",
        "message": "Internal server error.",
        "code": "INTERNAL_ERROR",
    }
    assert "sensitive database detail" not in response.body.decode()
    assert "Unhandled exception for GET /api/example" in caplog.text


def test_http_500_uses_internal_error_without_detail_leak() -> None:
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/example",
            "headers": [],
            "query_string": b"",
            "server": ("testserver", 80),
            "client": ("testclient", 123),
            "scheme": "http",
        }
    )
    response = http_exception_handler(
        request,
        StarletteHTTPException(status_code=500, detail="sensitive implementation detail"),
    )

    assert response.status_code == 500
    assert json.loads(response.body) == {
        "status": "error",
        "message": "Internal server error.",
        "code": "INTERNAL_ERROR",
    }


def test_framework_and_auth_errors_use_normalized_envelope(api) -> None:
    invalid_login = api.client.post("/api/auth/login", json={})
    missing_route = api.client.get("/does-not-exist")
    invalid_token = api.client.get(
        "/api/posts/3",
        headers={"Authorization": "Bearer malformed"},
    )

    _assert_validation_error(invalid_login)
    assert missing_route.status_code == 404
    assert missing_route.json() == {
        "status": "error",
        "message": "Not Found",
        "code": "NOT_FOUND",
    }
    assert invalid_token.status_code == 401
    assert invalid_token.json()["status"] == "error"
    assert invalid_token.json()["code"] == "UNAUTHORIZED"


@pytest.mark.parametrize(
    ("path", "params"),
    [
        ("/api/boards", None),
        ("/api/banners", None),
        ("/api/events", None),
        ("/api/faqs", None),
        ("/api/search", {"q": "topic"}),
        ("/api/posts/3", None),
        ("/api/posts/3/comments", None),
    ],
)
def test_guest_content_requests_return_normalized_unauthorized(api, path, params) -> None:
    response = api.client.get(path, params=params)

    assert response.status_code == 401
    assert response.json() == {
        "status": "error",
        "message": "Authentication required.",
        "code": "UNAUTHORIZED",
    }


@pytest.mark.parametrize(
    "payload",
    [
        {"title": "   ", "content": "Body"},
        {"title": "Title", "content": "   "},
        {"title": "x" * (POST_TITLE_MAX_LENGTH + 1), "content": "Body"},
        {"title": "Title", "content": "x" * (POST_CONTENT_MAX_LENGTH + 1)},
    ],
)
def test_post_title_and_content_validation(api, payload) -> None:
    response = api.client.post(
        "/api/boards/2/posts",
        json=payload,
        headers=api.headers["owner"],
    )
    _assert_validation_error(response)


def test_mutual_aid_optional_notes_can_be_empty(api, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(posts_router, "_minimum_mutual_aid_event_date", lambda: date(2026, 8, 1))

    with api.session() as db:
        evidence = MediaAsset(
            owner_id=1,
            original_filename="evidence.pdf",
            stored_filename="private-evidence.pdf",
            content_type="application/pdf",
            file_size=123,
            url="/private-uploads/private-evidence.pdf",
            is_private=True,
            status="ready",
        )
        db.add(evidence)
        db.commit()
        evidence_id = evidence.id

    response = api.client.post(
        "/api/boards/1/posts",
        json={
            "title": "Wedding mutual-aid request",
            "content": "",
            "category": "wedding",
            "metadata": {"event_date": "2026-08-01", "relation": "self"},
            "attachment_ids": [evidence_id],
        },
        headers=api.headers["owner"],
    )

    assert response.status_code == 200
    post_id = response.json()["data"]["id"]

    update_response = api.client.put(
        f"/api/posts/{post_id}",
        json={
            "title": "Updated wedding mutual-aid request",
            "content": "   ",
            "category": "wedding",
            "metadata": {"event_date": "2026-08-01", "relation": "self"},
            "attachment_ids": [evidence_id],
        },
        headers=api.headers["owner"],
    )

    assert update_response.status_code == 200
    with api.session() as db:
        post = db.get(Post, post_id)
        mutual_aid = db.query(PostMutualAid).filter(PostMutualAid.post_id == post_id).one()
        assert post.content == ""
        assert (mutual_aid.event_type, mutual_aid.event_date, mutual_aid.relation) == (
            "wedding",
            date(2026, 8, 1),
            "self",
        )


def test_regular_post_update_still_requires_content(api) -> None:
    response = api.client.put(
        "/api/posts/3",
        json={"title": "Public General Topic", "content": "   "},
        headers=api.headers["owner"],
    )

    _assert_validation_error(response)


@pytest.mark.parametrize("content", ["   ", "x" * (COMMENT_MAX_LENGTH + 1)])
def test_comment_content_validation(api, content: str) -> None:
    response = api.client.post(
        "/api/posts/3/comments",
        json={"content": content},
        headers=api.headers["owner"],
    )
    _assert_validation_error(response)


def test_post_and_comment_text_is_trimmed_before_persistence(api) -> None:
    post_response = api.client.post(
        "/api/boards/2/posts",
        json={"title": "  Trimmed title  ", "content": "  Trimmed body  "},
        headers=api.headers["owner"],
    )
    assert post_response.status_code == 200
    post_id = post_response.json()["data"]["id"]

    comment_response = api.client.post(
        "/api/posts/3/comments",
        json={"content": "  Trimmed comment  "},
        headers=api.headers["owner"],
    )
    assert comment_response.status_code == 200
    comment_id = comment_response.json()["data"]["id"]

    with api.session() as db:
        post = db.get(Post, post_id)
        comment = db.get(Comment, comment_id)
        assert (post.title, post.content) == ("Trimmed title", "Trimmed body")
        assert comment.content == "Trimmed comment"

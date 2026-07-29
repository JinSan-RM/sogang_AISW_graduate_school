import json
import logging

import pytest
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.requests import Request

from app.errors import http_exception_handler, unhandled_exception_handler
from app.models.comment import Comment
from app.models.post import Post
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

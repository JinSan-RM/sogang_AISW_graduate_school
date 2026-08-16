import pytest

from app.models.board import Board
from app.models.bookmark import Bookmark
from app.models.comment import Comment
from app.models.like import Like
from app.models.media import PostAttachment
from app.models.post import Post


RESOURCE_TARGETS = [
    ("lecture-reviews", "강의후기"),
    ("exam-archive", "시험족보"),
    ("comprehensive-exam", "종합시험"),
    ("graduation-thesis", "졸업논문"),
]


def _create_resource_post(
    api,
    *,
    target_write_permission: str = "user",
    source_slug: str = "lecture-reviews-move-test",
    source_name: str = "Lecture Reviews",
    target_slug: str | None = None,
    target_name: str = "Exam Archive",
    post_category: str | None = None,
) -> tuple[int, int, int]:
    resolved_target_slug = target_slug or f"exam-archive-move-test-{target_write_permission}"
    with api.session() as db:
        source = Board(
            name=source_name,
            slug=source_slug,
            category="resources",
            board_type="resource",
            read_permission="user",
            write_permission="user",
            allow_anonymous=True,
        )
        target = Board(
            name=target_name,
            slug=resolved_target_slug,
            category="resources",
            board_type="resource",
            read_permission="user",
            write_permission=target_write_permission,
            allow_anonymous=True,
        )
        db.add_all([source, target])
        db.flush()

        post = Post(
            board_id=source.id,
            author_id=1,
            title="Original resource post",
            content="Resource body",
            category=post_category,
            comment_count=1,
            like_count=1,
        )
        db.add(post)
        db.flush()
        db.add_all(
            [
                Comment(post_id=post.id, author_id=2, content="Keep this comment"),
                Like(post_id=post.id, user_id=2),
                Bookmark(post_id=post.id, user_id=2),
                PostAttachment(post_id=post.id, media_id=1, sort_order=0),
            ]
        )
        db.commit()
        return source.id, target.id, post.id


def _update_payload(*, board_id: int) -> dict:
    return {
        "board_id": board_id,
        "title": "Moved resource post",
        "content": "Updated resource body",
        "is_anonymous": False,
        "attachment_ids": [1],
    }


def test_owner_can_move_resource_post_without_losing_related_data(api) -> None:
    source_id, target_id, post_id = _create_resource_post(api)

    response = api.client.put(
        f"/api/posts/{post_id}",
        json=_update_payload(board_id=target_id),
        headers=api.headers["owner"],
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success", "data": {"id": post_id}}
    with api.session() as db:
        post = db.get(Post, post_id)
        assert post is not None
        assert post.board_id == target_id
        assert db.query(Comment).filter(Comment.post_id == post_id).count() == 1
        assert db.query(Like).filter(Like.post_id == post_id).count() == 1
        assert db.query(Bookmark).filter(Bookmark.post_id == post_id).count() == 1
        assert db.query(PostAttachment).filter(PostAttachment.post_id == post_id).count() == 1

    source_posts = api.client.get(f"/api/boards/{source_id}/posts", headers=api.headers["owner"])
    target_posts = api.client.get(f"/api/boards/{target_id}/posts", headers=api.headers["owner"])
    assert all(item["id"] != post_id for item in source_posts.json()["data"])
    assert any(item["id"] == post_id for item in target_posts.json()["data"])


@pytest.mark.parametrize(("target_slug", "expected_category"), RESOURCE_TARGETS)
def test_resource_move_replaces_stale_category_with_target_board_tag(
    api,
    target_slug: str,
    expected_category: str,
) -> None:
    _source_id, target_id, post_id = _create_resource_post(
        api,
        source_slug=f"source-{target_slug}",
        source_name="이전 자료",
        target_slug=target_slug,
        target_name=expected_category,
        post_category="이전 태그",
    )

    response = api.client.put(
        f"/api/posts/{post_id}",
        json={**_update_payload(board_id=target_id), "category": "이전 태그"},
        headers=api.headers["owner"],
    )

    assert response.status_code == 200
    with api.session() as db:
        post = db.get(Post, post_id)
        assert post is not None
        assert post.board_id == target_id
        assert post.category == expected_category


def test_resource_create_uses_board_tag_instead_of_submitted_category(api) -> None:
    with api.session() as db:
        board = Board(
            name="시험족보",
            slug="exam-archive",
            category="resources",
            board_type="resource",
            read_permission="user",
            write_permission="user",
        )
        db.add(board)
        db.commit()
        board_id = board.id

    response = api.client.post(
        f"/api/boards/{board_id}/posts",
        json={
            "title": "새 자료",
            "content": "본문",
            "category": "이전 태그",
            "is_anonymous": False,
            "attachment_ids": [],
        },
        headers=api.headers["owner"],
    )

    assert response.status_code == 200
    with api.session() as db:
        post = db.get(Post, response.json()["data"]["id"])
        assert post is not None
        assert post.category == "시험족보"


def test_non_resource_update_keeps_submitted_category(api) -> None:
    response = api.client.put(
        "/api/posts/3",
        json={
            "title": "Updated general post",
            "content": "Updated body",
            "category": "자유주제",
            "is_anonymous": False,
        },
        headers=api.headers["owner"],
    )

    assert response.status_code == 200
    with api.session() as db:
        post = db.get(Post, 3)
        assert post is not None
        assert post.category == "자유주제"


def test_resource_post_cannot_move_to_non_resource_board(api) -> None:
    _source_id, _target_id, post_id = _create_resource_post(api)

    response = api.client.put(
        f"/api/posts/{post_id}",
        json=_update_payload(board_id=2),
        headers=api.headers["owner"],
    )

    assert response.status_code == 400
    assert response.json() == {
        "status": "error",
        "message": "Posts can only be moved between resource boards.",
        "code": "BAD_REQUEST",
    }


def test_member_cannot_move_resource_post_to_admin_only_target(api) -> None:
    source_id, target_id, post_id = _create_resource_post(api, target_write_permission="admin")

    response = api.client.put(
        f"/api/posts/{post_id}",
        json=_update_payload(board_id=target_id),
        headers=api.headers["owner"],
    )

    assert response.status_code == 403
    assert response.json() == {
        "status": "error",
        "message": "Forbidden.",
        "code": "FORBIDDEN",
    }
    with api.session() as db:
        assert db.get(Post, post_id).board_id == source_id

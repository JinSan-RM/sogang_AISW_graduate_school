from app.models.board import Board
from app.models.bookmark import Bookmark
from app.models.comment import Comment
from app.models.like import Like
from app.models.media import PostAttachment
from app.models.post import Post


def _create_resource_post(api, *, target_write_permission: str = "user") -> tuple[int, int, int]:
    with api.session() as db:
        source = Board(
            name="Lecture Reviews",
            slug="lecture-reviews-move-test",
            category="resources",
            board_type="resource",
            read_permission="user",
            write_permission="user",
            allow_anonymous=True,
        )
        target = Board(
            name="Exam Archive",
            slug=f"exam-archive-move-test-{target_write_permission}",
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

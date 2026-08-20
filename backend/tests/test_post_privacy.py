from app.models.bookmark import Bookmark
from app.models.board import Board
from app.models.comment import Comment
from app.models.notification import Notification
from app.models.post import Post
from app.models.post_extension import PostMutualAid, PostSuggestion
from app.models.report import Report
from app.models.user_block import UserBlock


def _assert_hidden(response) -> None:
    assert response.status_code == 404
    assert response.json() == {
        "status": "error",
        "message": "Post not found.",
        "code": "NOT_FOUND",
    }


def _assert_comment_hidden(response) -> None:
    assert response.status_code == 404
    assert response.json() == {
        "status": "error",
        "message": "Comment not found.",
        "code": "NOT_FOUND",
    }


def test_mutual_aid_posts_are_visible_to_every_member(api) -> None:
    """상조회 신청은 원우 전체 공개다. 작성자/관리자만 보는 제한은 없다."""

    responses = {
        "owner": api.client.get("/api/posts/1", headers=api.headers["owner"]),
        "other": api.client.get("/api/posts/1", headers=api.headers["other"]),
        "admin": api.client.get("/api/posts/1", headers=api.headers["admin"]),
    }

    assert [response.status_code for response in responses.values()] == [200, 200, 200]
    assert {response.json()["data"]["id"] for response in responses.values()} == {1}
    # 목록에서도 남의 신청이 함께 보인다.
    listing = api.client.get("/api/boards/1/posts", headers=api.headers["other"])
    assert listing.status_code == 200
    assert {post["id"] for post in listing.json()["data"]} == {1, 2}


def test_admin_can_update_mutual_aid_status(api) -> None:
    response = api.client.put(
        "/api/posts/1/mutual-aid",
        json={"status": "completed"},
        headers=api.headers["admin"],
    )

    assert response.status_code == 200
    assert response.json()["data"]["mutual_aid"]["status"] == "completed"
    with api.session() as db:
        mutual_aid = db.query(PostMutualAid).filter(PostMutualAid.post_id == 1).one()
        assert mutual_aid.status == "completed"
        assert mutual_aid.reviewed_by == 3


def test_owner_cannot_delete_completed_mutual_aid_request(api) -> None:
    with api.session() as db:
        mutual_aid = db.query(PostMutualAid).filter(PostMutualAid.post_id == 1).one()
        mutual_aid.status = "completed"
        db.commit()

    response = api.client.delete("/api/posts/1", headers=api.headers["owner"])

    assert response.status_code == 403
    assert response.json() == {
        "status": "error",
        "message": "Completed mutual-aid requests cannot be deleted.",
        "code": "FORBIDDEN",
    }
    with api.session() as db:
        assert db.get(Post, 1).deleted_at is None


def test_owner_can_delete_rejected_mutual_aid_request(api) -> None:
    with api.session() as db:
        mutual_aid = db.query(PostMutualAid).filter(PostMutualAid.post_id == 1).one()
        mutual_aid.status = "rejected"
        mutual_aid.rejection_reason = "Please submit a clearer document."
        db.commit()

    response = api.client.delete("/api/posts/1", headers=api.headers["owner"])

    assert response.status_code == 200
    assert response.json() == {"status": "success", "data": {"id": 1}}
    with api.session() as db:
        assert db.get(Post, 1).deleted_at is not None


def test_members_cannot_update_council_admin_fields(api) -> None:
    with api.session() as db:
        suggestion_board = Board(
            name="Suggestions",
            slug="suggestions",
            category="council",
            board_type="suggestion",
            read_permission="user",
            write_permission="user",
        )
        db.add(suggestion_board)
        db.flush()
        suggestion_post = Post(
            board_id=suggestion_board.id,
            author_id=1,
            title="Anonymous suggestion",
            content="Please review this suggestion",
            is_anonymous=True,
        )
        db.add(suggestion_post)
        db.flush()
        db.add(PostSuggestion(post_id=suggestion_post.id, suggestion_category="general"))
        db.commit()
        suggestion_post_id = suggestion_post.id

    requests = [
        ("/api/posts/1/mutual-aid", {"status": "completed"}),
        (f"/api/posts/{suggestion_post_id}/suggestion", {"status": "answered", "admin_reply": "Official reply"}),
    ]

    for path, payload in requests:
        response = api.client.put(path, json=payload, headers=api.headers["owner"])
        assert response.status_code == 403
        assert response.json() == {
            "status": "error",
            "message": "Admin permission required.",
            "code": "FORBIDDEN",
        }

    with api.session() as db:
        mutual_aid = db.query(PostMutualAid).filter(PostMutualAid.post_id == 1).one()
        assert mutual_aid.status == "processing"
        assert mutual_aid.reviewed_by is None
        suggestion = db.query(PostSuggestion).filter(PostSuggestion.post_id == suggestion_post_id).one()
        assert suggestion.status == "received"
        assert suggestion.admin_reply is None
        assert suggestion.replied_by is None


def test_mutual_aid_search_returns_every_request_for_members(api) -> None:
    """상조회가 전체 공개이므로 검색 결과도 신청자에 따라 잘리지 않는다."""

    for role in ("owner", "other", "admin"):
        response = api.client.get("/api/search", params={"q": "Need"}, headers=api.headers[role])
        assert {item["id"] for item in response.json()["data"]} == {1, 2}, role


def test_unpublished_posts_are_author_or_admin_only_across_detail_list_and_search(api) -> None:
    _assert_hidden(api.client.get("/api/posts/4", headers=api.headers["other"]))
    assert api.client.get("/api/posts/4", headers=api.headers["owner"]).status_code == 200
    assert api.client.get("/api/posts/4", headers=api.headers["admin"]).status_code == 200

    owner_hidden = api.client.get(
        "/api/boards/2/posts",
        params={"status": "hidden"},
        headers=api.headers["owner"],
    )
    other_hidden = api.client.get(
        "/api/boards/2/posts",
        params={"status": "hidden"},
        headers=api.headers["other"],
    )
    admin_hidden = api.client.get(
        "/api/boards/2/posts",
        params={"status": "hidden"},
        headers=api.headers["admin"],
    )
    assert [item["id"] for item in owner_hidden.json()["data"]] == [4]
    assert other_hidden.json()["data"] == []
    assert [item["id"] for item in admin_hidden.json()["data"]] == [4]

    assert api.client.get("/api/search", params={"q": "Hidden"}, headers=api.headers["other"]).json()["data"] == []
    assert [item["id"] for item in api.client.get(
        "/api/search",
        params={"q": "Hidden"},
        headers=api.headers["owner"],
    ).json()["data"]] == [4]

    with api.session() as db:
        db.get(Post, 5).status = "deleted"
        db.commit()
    _assert_hidden(api.client.get("/api/posts/5", headers=api.headers["other"]))
    assert api.client.get("/api/posts/5", headers=api.headers["admin"]).status_code == 200


def test_activity_history_does_not_leak_posts_that_are_no_longer_readable(api) -> None:
    with api.session() as db:
        db.add(Comment(post_id=4, author_id=2, content="Historical comment"))
        db.add(Bookmark(post_id=4, user_id=2))
        db.commit()

    comments = api.client.get(
        "/api/users/me/activity",
        params={"type": "comments"},
        headers=api.headers["other"],
    )
    bookmarks = api.client.get(
        "/api/users/me/activity",
        params={"type": "bookmarks"},
        headers=api.headers["other"],
    )

    assert comments.status_code == 200
    assert bookmarks.status_code == 200
    assert all(item["post_id"] != 4 for item in comments.json()["data"])
    assert all(item["post_id"] != 4 for item in bookmarks.json()["data"])
    assert comments.json()["pagination"]["total"] == len(comments.json()["data"])
    assert bookmarks.json()["pagination"]["total"] == len(bookmarks.json()["data"])


def test_inactive_board_post_is_hidden_from_members_but_available_to_admin_moderation(api) -> None:
    with api.session() as db:
        board = Board(
            name="Archived Moderation Board",
            slug="archived-moderation-board",
            category="community",
            board_type="post",
            read_permission="user",
            write_permission="admin",
            is_active=False,
        )
        db.add(board)
        db.flush()
        post = Post(
            board_id=board.id,
            author_id=1,
            title="Archived moderation target",
            content="Retained for administrator review",
        )
        db.add(post)
        db.commit()
        post_id = post.id

    _assert_hidden(api.client.get(f"/api/posts/{post_id}", headers=api.headers["owner"]))
    assert api.client.get(f"/api/posts/{post_id}", headers=api.headers["admin"]).status_code == 200


def test_anonymous_author_identity_is_not_exposed_to_other_members(api) -> None:
    with api.session() as db:
        optional_anonymous = db.get(Post, 3)
        optional_anonymous.is_anonymous = True
        forced_board = Board(
            name="Lecture Reviews",
            slug="lecture-reviews",
            category="community",
            board_type="post",
            read_permission="user",
            write_permission="user",
        )
        db.add(forced_board)
        db.flush()
        forced_anonymous = Post(
            board_id=forced_board.id,
            author_id=1,
            title="Forced anonymous review",
            content="The board hides author identity",
            is_anonymous=False,
        )
        db.add(forced_anonymous)
        db.flush()
        db.add_all(
            [
                Bookmark(post_id=optional_anonymous.id, user_id=2),
                Bookmark(post_id=forced_anonymous.id, user_id=2),
            ]
        )
        db.commit()
        forced_post_id = forced_anonymous.id

    member_list = api.client.get("/api/boards/2/posts", headers=api.headers["other"]).json()["data"]
    member_item = next(item for item in member_list if item["id"] == 3)
    assert member_item["author_id"] is None
    assert member_item["author_nickname"] == "Anonymous"
    assert member_item["author_cohort"] is None

    member_detail = api.client.get("/api/posts/3", headers=api.headers["other"]).json()["data"]
    owner_detail = api.client.get("/api/posts/3", headers=api.headers["owner"]).json()["data"]
    admin_detail = api.client.get("/api/posts/3", headers=api.headers["admin"]).json()["data"]
    assert member_detail["author_id"] is None
    assert owner_detail["author_id"] == 1
    assert owner_detail["author_nickname"] == "Anonymous"
    assert admin_detail["author_id"] == 1
    assert admin_detail["author_nickname"] == "Owner"

    forced_member = api.client.get(
        f"/api/posts/{forced_post_id}",
        headers=api.headers["other"],
    ).json()["data"]
    forced_admin = api.client.get(
        f"/api/posts/{forced_post_id}",
        headers=api.headers["admin"],
    ).json()["data"]
    assert (forced_member["author_id"], forced_member["author_nickname"], forced_member["author_cohort"]) == (
        None,
        "Anonymous",
        None,
    )
    assert (forced_admin["author_id"], forced_admin["author_nickname"]) == (1, "Owner")

    assert api.client.get(
        "/api/boards/2/posts",
        params={"q": "Owner"},
        headers=api.headers["other"],
    ).json()["data"] == []
    assert all(
        item["id"] != 3
        for item in api.client.get(
            "/api/search",
            params={"q": "Owner"},
            headers=api.headers["other"],
        ).json()["data"]
    )
    assert any(
        item["id"] == 3
        for item in api.client.get(
            "/api/search",
            params={"q": "Owner"},
            headers=api.headers["admin"],
        ).json()["data"]
    )

    bookmarks = api.client.get(
        "/api/users/me/activity",
        params={"type": "bookmarks"},
        headers=api.headers["other"],
    ).json()["data"]
    anonymous_bookmarks = [item for item in bookmarks if item["post_id"] in {3, forced_post_id}]
    assert len(anonymous_bookmarks) == 2
    assert all(item["author_nickname"] == "Anonymous" for item in anonymous_bookmarks)
    assert all(item["author_cohort"] is None for item in anonymous_bookmarks)

    with api.session() as db:
        db.add(UserBlock(blocker_id=2, blocked_user_id=1, reason="privacy regression"))
        db.commit()
    blocked_list = api.client.get(
        "/api/boards/2/posts",
        params={"q": "Public General"},
        headers=api.headers["other"],
    ).json()["data"]
    blocked_search = api.client.get(
        "/api/search",
        params={"q": "Forced anonymous"},
        headers=api.headers["other"],
    ).json()["data"]
    assert [item["id"] for item in blocked_list] == [3]
    assert [item["id"] for item in blocked_search] == [forced_post_id]


def test_exam_archive_shows_author_unless_the_post_itself_is_anonymous(api) -> None:
    with api.session() as db:
        board = Board(
            name="Exam Archive",
            slug="exam-archive",
            category="resources",
            board_type="resource",
            read_permission="user",
            write_permission="user",
            allow_anonymous=True,
        )
        db.add(board)
        db.flush()
        named_post = Post(
            board_id=board.id,
            author_id=1,
            title="Named exam archive",
            content="Show the contributor",
            is_anonymous=False,
        )
        anonymous_post = Post(
            board_id=board.id,
            author_id=1,
            title="Anonymous exam archive",
            content="Hide only an explicitly anonymous contributor",
            is_anonymous=True,
        )
        db.add_all([named_post, anonymous_post])
        db.commit()
        named_post_id = named_post.id
        anonymous_post_id = anonymous_post.id

    named = api.client.get(
        f"/api/posts/{named_post_id}",
        headers=api.headers["other"],
    ).json()["data"]
    anonymous = api.client.get(
        f"/api/posts/{anonymous_post_id}",
        headers=api.headers["other"],
    ).json()["data"]

    assert (named["author_id"], named["author_nickname"]) == (1, "Owner")
    assert (anonymous["author_id"], anonymous["author_nickname"]) == (None, "Anonymous")


def test_post_list_exposes_thumbnail_media_id_for_access_url_resolution(api) -> None:
    response = api.client.get("/api/boards/2/posts", headers=api.headers["owner"])

    assert response.status_code == 200
    item = next(item for item in response.json()["data"] if item["id"] == 3)
    assert item["thumbnail_media_id"] == 1


def test_mutual_aid_comment_routes_are_open_but_still_author_scoped(api) -> None:
    """다른 원우도 상조회 댓글을 읽고 쓸 수 있지만, 남의 댓글을 고치지는 못한다."""

    assert api.client.get("/api/posts/1/comments", headers=api.headers["other"]).status_code == 200
    assert api.client.post(
        "/api/posts/1/comments",
        json={"content": "삼가 조의를 표합니다"},
        headers=api.headers["other"],
    ).status_code == 200

    for response in (
        api.client.put("/api/comments/1", json={"content": "Should not be accepted"}, headers=api.headers["other"]),
        api.client.delete("/api/comments/1", headers=api.headers["other"]),
    ):
        assert response.status_code == 403
        assert response.json()["code"] == "FORBIDDEN"


def test_mutual_aid_report_routes_are_open_to_other_members(api) -> None:
    payload = {"reason": "spam", "detail": "광고성 신청입니다"}

    assert api.client.post("/api/posts/1/report", json=payload, headers=api.headers["other"]).status_code == 200
    assert api.client.post("/api/comments/1/report", json=payload, headers=api.headers["other"]).status_code == 200


def test_hidden_and_missing_comment_ids_are_indistinguishable_without_side_effects(api) -> None:
    # 상조회는 전체 공개이므로, 읽을 수 없는 댓글은 비공개 글(post 4)에 달린 것으로 만든다.
    with api.session() as db:
        hidden_comment = Comment(post_id=4, author_id=1, content="Hidden board comment")
        db.add(hidden_comment)
        db.commit()
        hidden_comment_id = hidden_comment.id
        original_content = hidden_comment.content
        original_report_count = db.query(Report).count()
        original_notification_count = db.query(Notification).count()

    hidden_update = api.client.put(
        f"/api/comments/{hidden_comment_id}",
        json={"content": "Must not change"},
        headers=api.headers["other"],
    )
    missing_update = api.client.put(
        "/api/comments/999999",
        json={"content": "Must not change"},
        headers=api.headers["other"],
    )
    hidden_delete = api.client.delete(f"/api/comments/{hidden_comment_id}", headers=api.headers["other"])
    missing_delete = api.client.delete("/api/comments/999999", headers=api.headers["other"])
    report_payload = {"reason": "spam", "detail": "Must not create a report"}
    hidden_report = api.client.post(
        f"/api/comments/{hidden_comment_id}/report",
        json=report_payload,
        headers=api.headers["other"],
    )
    missing_report = api.client.post(
        "/api/comments/999999/report",
        json=report_payload,
        headers=api.headers["other"],
    )

    expected = {
        "status": "error",
        "message": "Comment not found.",
        "code": "NOT_FOUND",
    }
    for hidden, missing in (
        (hidden_update, missing_update),
        (hidden_delete, missing_delete),
        (hidden_report, missing_report),
    ):
        assert hidden.status_code == missing.status_code == 404
        assert hidden.json() == missing.json() == expected

    with api.session() as db:
        assert db.get(Comment, hidden_comment_id).content == original_content
        assert db.query(Report).count() == original_report_count
        assert db.query(Notification).count() == original_notification_count


def test_mutual_aid_comments_remain_available_to_owner_and_admin(api) -> None:
    owner_response = api.client.get("/api/posts/1/comments", headers=api.headers["owner"])
    admin_response = api.client.get("/api/posts/1/comments", headers=api.headers["admin"])
    update_response = api.client.put(
        "/api/comments/1",
        json={"content": "  Reviewed by admin  "},
        headers=api.headers["admin"],
    )

    assert owner_response.status_code == 200
    assert admin_response.status_code == 200
    assert update_response.status_code == 200
    with api.session() as db:
        assert db.get(Comment, 1).content == "Reviewed by admin"

    delete_response = api.client.delete("/api/comments/1", headers=api.headers["admin"])
    assert delete_response.status_code == 200
    with api.session() as db:
        assert db.get(Comment, 1) is None


def test_comment_author_can_delete_own_comment(api) -> None:
    response = api.client.delete("/api/comments/1", headers=api.headers["owner"])

    assert response.status_code == 200
    assert response.json() == {
        "status": "success",
        "data": {"id": 1, "deleted_count": 1},
    }
    with api.session() as db:
        assert db.get(Comment, 1) is None
        assert db.get(Post, 1).comment_count == 0


def test_comment_replies_stop_at_two_depths(api) -> None:
    root_response = api.client.post(
        "/api/posts/1/comments",
        json={"content": "Root"},
        headers=api.headers["owner"],
    )
    assert root_response.status_code == 200
    root_id = root_response.json()["data"]["id"]

    reply_response = api.client.post(
        "/api/posts/1/comments",
        json={"content": "Reply", "parent_id": root_id},
        headers=api.headers["owner"],
    )
    assert reply_response.status_code == 200
    reply_id = reply_response.json()["data"]["id"]

    nested_response = api.client.post(
        "/api/posts/1/comments",
        json={"content": "Nested reply", "parent_id": reply_id},
        headers=api.headers["owner"],
    )
    assert nested_response.status_code == 400
    assert nested_response.json() == {
        "status": "error",
        "message": "Comment replies support max depth 2.",
        "code": "BAD_REQUEST",
    }

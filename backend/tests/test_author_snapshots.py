from sqlalchemy import select

from app.models.bookmark import Bookmark
from app.models.comment import Comment
from app.models.post import Post
from app.models.report import Report
from app.models.user import User


def test_post_and_comment_creation_capture_author_name_and_cohort(api) -> None:
    with api.session() as db:
        owner = db.get(User, 1)
        assert owner is not None
        owner.cohort = "72"
        db.commit()

    created_post = api.client.post(
        "/api/boards/2/posts",
        headers=api.headers["owner"],
        json={"title": "Snapshot capture", "content": "Post body"},
    )
    assert created_post.status_code == 200
    post_id = created_post.json()["data"]["id"]

    created_comment = api.client.post(
        f"/api/posts/{post_id}/comments",
        headers=api.headers["owner"],
        json={"content": "Comment body"},
    )
    assert created_comment.status_code == 200
    comment_id = created_comment.json()["data"]["id"]

    with api.session() as db:
        post = db.get(Post, post_id)
        comment = db.get(Comment, comment_id)
        assert post is not None
        assert comment is not None
        assert (post.author_nickname_snapshot, post.author_cohort_snapshot) == ("Owner", "72")
        assert (comment.author_nickname_snapshot, comment.author_cohort_snapshot) == ("Owner", "72")


def test_deleted_author_snapshot_is_used_across_post_comment_and_admin_views(api) -> None:
    with api.session() as db:
        post = Post(
            board_id=2,
            author_id=None,
            author_nickname_snapshot="HistoricOwner",
            author_cohort_snapshot="72",
            title="Snapshot lookup target",
            content="Preserved body",
        )
        db.add(post)
        db.flush()
        comment = Comment(
            post_id=post.id,
            author_id=None,
            author_nickname_snapshot="HistoricCommenter",
            author_cohort_snapshot="73",
            content="Preserved comment",
        )
        db.add_all(
            [
                comment,
                Bookmark(user_id=2, post_id=post.id),
                Report(reporter_id=2, target_type="post", target_id=post.id, reason="test"),
            ]
        )
        db.flush()
        db.add(
            Report(
                reporter_id=2,
                target_type="comment",
                target_id=comment.id,
                reason="test comment",
            )
        )
        db.commit()
        post_id = post.id
        comment_id = comment.id

    detail = api.client.get(f"/api/posts/{post_id}", headers=api.headers["other"])
    board_list = api.client.get(
        "/api/boards/2/posts",
        params={"q": "HistoricOwner"},
        headers=api.headers["other"],
    )
    search = api.client.get(
        "/api/search",
        params={"q": "HistoricOwner"},
        headers=api.headers["other"],
    )
    comments = api.client.get(f"/api/posts/{post_id}/comments", headers=api.headers["other"])
    bookmarks = api.client.get(
        "/api/users/me/activity",
        params={"type": "bookmarks"},
        headers=api.headers["other"],
    )
    admin_posts = api.client.get("/api/posts/admin/all", headers=api.headers["admin"])
    admin_reports = api.client.get("/api/admin/reports", headers=api.headers["admin"])

    assert detail.status_code == 200
    assert (
        detail.json()["data"]["author_nickname"],
        detail.json()["data"]["author_cohort"],
    ) == ("HistoricOwner", "72")

    assert board_list.status_code == 200
    board_item = next(item for item in board_list.json()["data"] if item["id"] == post_id)
    assert (board_item["author_nickname"], board_item["author_cohort"]) == ("HistoricOwner", "72")

    assert search.status_code == 200
    search_item = next(item for item in search.json()["data"] if item["id"] == post_id)
    assert (search_item["author_nickname"], search_item["author_cohort"]) == ("HistoricOwner", "72")

    assert comments.status_code == 200
    assert (
        comments.json()["data"][0]["author_nickname"],
        comments.json()["data"][0]["author_cohort"],
    ) == ("HistoricCommenter", "73")

    assert bookmarks.status_code == 200
    bookmark_item = next(item for item in bookmarks.json()["data"] if item["post_id"] == post_id)
    assert (bookmark_item["author_nickname"], bookmark_item["author_cohort"]) == ("HistoricOwner", "72")

    assert admin_posts.status_code == 200
    admin_post = next(item for item in admin_posts.json()["data"] if item["id"] == post_id)
    assert (admin_post["author_nickname"], admin_post["author_cohort"]) == ("HistoricOwner", "72")

    assert admin_reports.status_code == 200
    post_report = next(
        item
        for item in admin_reports.json()["data"]
        if item["target_type"] == "post" and item["target_id"] == post_id
    )
    comment_report = next(
        item
        for item in admin_reports.json()["data"]
        if item["target_type"] == "comment" and item["target_id"] == comment_id
    )
    assert post_report["target"]["author_nickname"] == "HistoricOwner"
    assert comment_report["target"]["author_nickname"] == "HistoricCommenter"


def test_orphaned_anonymous_post_stays_anonymous_for_members_but_admin_sees_snapshot(api) -> None:
    with api.session() as db:
        post = Post(
            board_id=2,
            author_id=None,
            author_nickname_snapshot="HistoricOwner",
            author_cohort_snapshot="72",
            title="Anonymous snapshot",
            content="Anonymous body",
            is_anonymous=True,
        )
        db.add(post)
        db.flush()
        db.add(Report(reporter_id=2, target_type="post", target_id=post.id, reason="anonymous"))
        db.commit()
        post_id = post.id

    member = api.client.get(f"/api/posts/{post_id}", headers=api.headers["other"])
    admin = api.client.get(f"/api/posts/{post_id}", headers=api.headers["admin"])
    admin_search = api.client.get(
        "/api/search",
        params={"q": "Anonymous snapshot"},
        headers=api.headers["admin"],
    )
    admin_reports = api.client.get("/api/admin/reports", headers=api.headers["admin"])

    assert member.status_code == admin.status_code == 200
    assert (member.json()["data"]["author_nickname"], member.json()["data"]["author_cohort"]) == (
        "Anonymous",
        None,
    )
    assert (admin.json()["data"]["author_nickname"], admin.json()["data"]["author_cohort"]) == (
        "HistoricOwner",
        "72",
    )
    search_item = next(item for item in admin_search.json()["data"] if item["id"] == post_id)
    assert (search_item["author_nickname"], search_item["author_cohort"]) == ("HistoricOwner", "72")
    report = next(item for item in admin_reports.json()["data"] if item["target_id"] == post_id)
    assert report["target"]["author_nickname"] == "HistoricOwner"


def test_missing_snapshot_uses_deleted_user_fallback(api) -> None:
    with api.session() as db:
        post = db.scalar(select(Post).where(Post.id == 3))
        assert post is not None
        post.author_id = None
        post.author_nickname_snapshot = None
        post.author_cohort_snapshot = None
        db.commit()

    detail = api.client.get("/api/posts/3", headers=api.headers["other"])

    assert detail.status_code == 200
    assert detail.json()["data"]["author_nickname"] == "Deleted user"
    assert detail.json()["data"]["author_cohort"] is None

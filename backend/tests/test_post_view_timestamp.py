from __future__ import annotations

from app.models.post import Post


def test_reading_post_increments_views_without_changing_updated_at(api) -> None:
    with api.session() as db:
        post = db.get(Post, 3)
        original_views = post.view_count
        original_updated_at = post.updated_at

    response = api.client.get("/api/posts/3", headers=api.headers["owner"])

    assert response.status_code == 200
    assert response.json()["data"]["view_count"] == original_views + 1
    with api.session() as db:
        post = db.get(Post, 3)
        assert post.view_count == original_views + 1
        assert post.updated_at == original_updated_at

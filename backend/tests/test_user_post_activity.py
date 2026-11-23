from sqlalchemy import inspect, text

from conftest import TEST_PASSWORD


POST = {"title": "Member post title", "content": "Member post content"}


def _events(api):
    with api.session() as db:
        inspector = inspect(db.connection())
        assert inspector.has_table("user_post_activity_logs"), "User activity needs its own persistent table"
        assert {column["name"] for column in inspector.get_columns("user_post_activity_logs")} == {
            "id", "actor_id", "action", "board_id", "post_id", "created_at",
        }
        return list(db.execute(text(
            "SELECT actor_id, action, board_id, post_id, created_at "
            "FROM user_post_activity_logs ORDER BY id"
        )).mappings())


def _create_post(api, actor):
    response = api.client.post("/api/boards/2/posts", json=POST, headers=api.headers[actor])
    assert response.status_code == 200
    return response.json()["data"]["id"]


def test_member_post_lifecycle_is_recorded_separately(api):
    member = api.headers["owner"]
    post_id = _create_post(api, "owner")
    updated = {**POST, "content": "Edited member post"}
    assert api.client.put(f"/api/posts/{post_id}", json=updated, headers=member).status_code == 200
    assert api.client.delete(f"/api/posts/{post_id}", headers=member).status_code == 200
    assert api.client.delete(f"/api/posts/{post_id}", headers=member).status_code == 404

    rows = _events(api)
    assert [(row["actor_id"], row["action"], row["board_id"], row["post_id"]) for row in rows] == [
        (1, "post.create", 2, post_id),
        (1, "post.update", 2, post_id),
        (1, "post.delete", 2, post_id),
    ]
    assert all(row["created_at"] is not None for row in rows)
    admin_log = api.client.get("/api/admin/audit-logs", headers=api.headers["admin"])
    assert admin_log.json()["data"] == []


def test_rejected_requests_and_admin_actions_do_not_enter_member_log(api):
    member_post_id = _create_post(api, "owner")
    other = api.headers["other"]
    assert api.client.put(f"/api/posts/{member_post_id}", json=POST, headers=other).status_code == 403
    assert api.client.delete(f"/api/posts/{member_post_id}", headers=other).status_code == 403
    rejected = api.client.post("/api/boards/2/posts", json={**POST, "attachment_ids": [999999]}, headers=other)
    assert rejected.status_code >= 400

    admin = api.headers["admin"]
    admin_post_id = _create_post(api, "admin")
    assert api.client.put(
        f"/api/posts/{admin_post_id}", json={**POST, "content": "Admin edit"}, headers=admin
    ).status_code == 200
    assert api.client.delete(f"/api/posts/{admin_post_id}", headers=admin).status_code == 200

    assert [(row["action"], row["post_id"]) for row in _events(api)] == [("post.create", member_post_id)]
    admin_log = api.client.get("/api/admin/audit-logs", headers=admin)
    assert [row["action"] for row in admin_log.json()["data"]] == ["post.delete", "post.update", "post.create"]


def test_account_deletion_clears_the_activity_actor(api):
    post_id = _create_post(api, "owner")
    result = api.client.request(
        "DELETE", "/api/users/me",
        headers=api.headers["owner"], json={"current_password": TEST_PASSWORD},
    )
    assert result.status_code == 200
    events = _events(api)
    assert [(event["actor_id"], event["post_id"]) for event in events] == [(None, post_id)]

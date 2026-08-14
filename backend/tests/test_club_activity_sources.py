from datetime import datetime

from app.models.board import Board
from app.models.dues_payer import DuesPayer
from app.models.media import PostAttachment
from app.models.post import Post


def _setup_club_sources(api) -> dict[str, int]:
    with api.session() as db:
        payer = DuesPayer(name="Club payer", major="AI", student_number="A74001")
        promo_board = Board(
            name="Club Promotion",
            slug="club-promo",
            category="club",
            board_type="post",
            read_permission="user",
            write_permission="admin",
        )
        activity_board = Board(
            name="Club Activity Certification",
            slug="club-activity",
            category="participation",
            board_type="activity_certification",
            read_permission="user",
            write_permission="user",
        )
        wrong_board = Board(
            name="General Source",
            slug="club-source-wrong-board",
            category="community",
            board_type="post",
            read_permission="user",
            write_permission="user",
        )
        db.add_all([payer, promo_board, activity_board, wrong_board])
        db.flush()

        published = Post(
            board_id=promo_board.id,
            author_id=3,
            title="SG_LLM",
            content="Official club",
            status="published",
        )
        hidden = Post(
            board_id=promo_board.id,
            author_id=3,
            title="Hidden club",
            content="Not selectable",
            status="hidden",
        )
        deleted = Post(
            board_id=promo_board.id,
            author_id=3,
            title="Retired club",
            content="Historical only",
            status="published",
            deleted_at=datetime.utcnow(),
        )
        wrong_board_post = Post(
            board_id=wrong_board.id,
            author_id=1,
            title="Not a club source",
            content="Wrong board",
            status="published",
        )
        db.add_all([published, hidden, deleted, wrong_board_post])
        db.commit()
        return {
            "payer": payer.id,
            "activity_board": activity_board.id,
            "published": published.id,
            "hidden": hidden.id,
            "deleted": deleted.id,
            "wrong_board": wrong_board_post.id,
        }


def _create_payload(payer_id: int, source_id: object = None) -> dict:
    metadata: dict[str, object] = {
        "activity_date": "2026.08.14",
        "participant_dues_payer_ids": [payer_id],
        "bank_account": "Sogang 123",
    }
    if source_id is not None:
        metadata["activity_source_post_id"] = source_id
    return {
        "title": "Client activity title",
        "content": "Activity reflection",
        "category": "Client supplied club",
        "metadata": metadata,
        "attachment_ids": [1],
        "is_anonymous": False,
    }


def test_club_activity_create_uses_the_admin_source_title(api) -> None:
    source = _setup_club_sources(api)

    response = api.client.post(
        f"/api/boards/{source['activity_board']}/posts",
        headers=api.headers["owner"],
        json=_create_payload(source["payer"], str(source["published"])),
    )

    assert response.status_code == 200
    with api.session() as db:
        post = db.get(Post, response.json()["data"]["id"])
        assert post is not None
        assert post.category == "SG_LLM"
        assert post.metadata_json is not None
        assert post.metadata_json["activity_source_post_id"] == str(source["published"])


def test_club_activity_create_rejects_missing_malformed_or_inactive_sources(api) -> None:
    source = _setup_club_sources(api)
    invalid_sources = [
        None,
        "not-a-number",
        str(source["hidden"]),
        str(source["deleted"]),
        str(source["wrong_board"]),
        "999999",
    ]

    for invalid_source in invalid_sources:
        response = api.client.post(
            f"/api/boards/{source['activity_board']}/posts",
            headers=api.headers["owner"],
            json=_create_payload(source["payer"], invalid_source),
        )
        assert response.status_code == 422, invalid_source
        assert response.json()["code"] == "INVALID_ACTIVITY_SOURCE"


def test_club_activity_reads_current_title_and_keeps_retired_history(api) -> None:
    source = _setup_club_sources(api)
    with api.session() as db:
        linked = Post(
            board_id=source["activity_board"],
            author_id=1,
            title="Linked activity",
            content="Linked reflection",
            category="Old club snapshot",
            metadata_json={
                "activity_date": "2026.08.14",
                "participants": "Club payer",
                "participant_dues_payer_ids": [source["payer"]],
                "activity_source_post_id": str(source["published"]),
                "bank_account": "Sogang 123",
            },
        )
        wrong_link = Post(
            board_id=source["activity_board"],
            author_id=1,
            title="Wrong link activity",
            content="Wrong link reflection",
            category="Legacy fallback",
            metadata_json={
                "activity_date": "2026.08.14",
                "participants": "Club payer",
                "participant_dues_payer_ids": [source["payer"]],
                "activity_source_post_id": str(source["wrong_board"]),
                "bank_account": "Sogang 123",
            },
        )
        db.add_all([linked, wrong_link])
        db.flush()
        db.add(PostAttachment(post_id=linked.id, media_id=1, sort_order=0))
        linked_id = linked.id
        wrong_link_id = wrong_link.id

        club_source = db.get(Post, source["published"])
        assert club_source is not None
        club_source.title = "SG AI Lab"
        club_source.deleted_at = datetime.utcnow()
        db.commit()

    list_response = api.client.get(
        f"/api/boards/{source['activity_board']}/posts",
        headers=api.headers["owner"],
    )
    detail_response = api.client.get(f"/api/posts/{linked_id}", headers=api.headers["owner"])

    assert list_response.status_code == 200
    items = {item["id"]: item for item in list_response.json()["data"]}
    assert items[linked_id]["activity_source_title"] == "SG AI Lab"
    assert items[wrong_link_id]["activity_source_title"] is None
    assert detail_response.status_code == 200
    assert detail_response.json()["data"]["activity_source_title"] == "SG AI Lab"

    update_response = api.client.put(
        f"/api/posts/{linked_id}",
        headers=api.headers["owner"],
        json={
            **_create_payload(source["payer"], str(source["published"])),
            "content": "Updated historical reflection",
        },
    )
    assert update_response.status_code == 200
    with api.session() as db:
        linked = db.get(Post, linked_id)
        assert linked is not None
        assert linked.category == "SG AI Lab"

from app.models.board import Board
from app.models.dues_payer import DuesPayer
from app.models.media import PostAttachment
from app.models.post import Post


def _create_activity_certification(api) -> tuple[int, int]:
    with api.session() as db:
        db.add_all(
            [
                DuesPayer(name="Owner payer", major="AI", student_number="A74001"),
                DuesPayer(name="Other payer", major="Security", student_number="A74002"),
            ]
        )
        board = Board(
            name="Club Activity Certification",
            slug="club-activity-edit-test",
            category="participation",
            board_type="activity_certification",
            read_permission="user",
            write_permission="user",
        )
        db.add(board)
        db.flush()
        post = Post(
            board_id=board.id,
            author_id=1,
            title="Original activity",
            content="Original reflection",
            category="Original club",
            metadata_json={
                "activity_date": "2026.07.01",
                "participants": "Owner",
                "participant_user_ids": "1",
                "activity_source_post_id": "3",
                "bank_account": "Sogang Bank 123-456",
            },
        )
        db.add(post)
        db.flush()
        db.add(PostAttachment(post_id=post.id, media_id=1, sort_order=0))
        db.commit()
        return board.id, post.id


def _update_payload() -> dict:
    return {
        "title": "Updated activity",
        "content": "Updated reflection",
        "category": "Updated club",
        "metadata": {
            "activity_date": "2026.08.15",
            "participants": "client supplied names",
            "participant_dues_payer_ids": [1, 2],
            "activity_source_post_id": "3",
        },
        "attachment_ids": [1],
        "is_anonymous": False,
    }


def test_activity_certification_owner_updates_date_and_participants_without_losing_bank_account(api) -> None:
    board_id, post_id = _create_activity_certification(api)

    member_list = api.client.get(f"/api/boards/{board_id}/posts", headers=api.headers["owner"])
    member_detail = api.client.get(f"/api/posts/{post_id}", headers=api.headers["owner"])
    admin_detail = api.client.get(f"/api/posts/{post_id}", headers=api.headers["admin"])
    forbidden = api.client.put(
        f"/api/posts/{post_id}",
        json=_update_payload(),
        headers=api.headers["other"],
    )

    assert member_list.status_code == 200
    assert "bank_account" not in member_list.json()["data"][0]["metadata"]
    assert member_detail.status_code == 200
    assert "bank_account" not in member_detail.json()["data"]["metadata"]
    assert admin_detail.status_code == 200
    assert admin_detail.json()["data"]["metadata"]["bank_account"] == "Sogang Bank 123-456"
    assert forbidden.status_code == 403

    response = api.client.put(
        f"/api/posts/{post_id}",
        json=_update_payload(),
        headers=api.headers["owner"],
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success", "data": {"id": post_id}}
    with api.session() as db:
        post = db.get(Post, post_id)
        assert post.metadata_json == {
            "activity_date": "2026.08.15",
            "participants": "Owner payer, Other payer",
            "participant_dues_payer_ids": [1, 2],
            "activity_source_post_id": "3",
            "bank_account": "Sogang Bank 123-456",
        }
        attachments = db.query(PostAttachment).filter(PostAttachment.post_id == post_id).all()
        assert [attachment.media_id for attachment in attachments] == [1]

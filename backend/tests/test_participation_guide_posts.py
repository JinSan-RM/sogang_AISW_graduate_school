from __future__ import annotations

import pytest
from sqlalchemy import select

from app.models.board import Board
from app.models.media import MediaAsset, PostAttachment
from app.models.post import Post


def _ready_media(*, owner_id: int, filename: str, content_type: str) -> MediaAsset:
    return MediaAsset(
        owner_id=owner_id,
        original_filename=filename,
        stored_filename=filename,
        content_type=content_type,
        file_size=123,
        url=f"/uploads/{filename}",
        status="ready",
    )


def _setup_participation_post(api, *, slug: str = "club-promo") -> dict[str, int]:
    with api.session() as db:
        board = Board(
            name="Club guide" if slug == "club-promo" else "Networking guide",
            slug=slug,
            category="participation",
            board_type="post",
            read_permission="user",
            write_permission="admin",
        )
        db.add(board)
        db.flush()

        old_hero = _ready_media(owner_id=3, filename=f"{slug}-old.png", content_type="image/png")
        gallery = _ready_media(owner_id=3, filename=f"{slug}-gallery.jpg", content_type="image/jpeg")
        replacement = _ready_media(owner_id=3, filename=f"{slug}-new.webp", content_type="image/webp")
        document = _ready_media(owner_id=3, filename=f"{slug}-guide.pdf", content_type="application/pdf")
        db.add_all([old_hero, gallery, replacement, document])
        db.flush()

        post = Post(
            board_id=board.id,
            author_id=3,
            author_nickname_snapshot="Admin",
            title="SG_LLM",
            content=(
                "동아리 소개입니다.\n\n"
                "참여방법\n카카오톡 오픈채팅방으로 참여하세요.\n\n"
                "참여링크 : https://open.kakao.com/o/example\n\n"
                "정기적으로 모임을 진행합니다."
            ),
            metadata_json=None,
        )
        db.add(post)
        db.flush()
        db.add_all(
            [
                PostAttachment(post_id=post.id, media_id=document.id, sort_order=0),
                PostAttachment(post_id=post.id, media_id=old_hero.id, sort_order=1),
                PostAttachment(post_id=post.id, media_id=gallery.id, sort_order=2),
            ]
        )
        db.commit()
        return {
            "board_id": board.id,
            "post_id": post.id,
            "old_hero_id": old_hero.id,
            "gallery_id": gallery.id,
            "replacement_id": replacement.id,
            "document_id": document.id,
        }


@pytest.mark.parametrize("slug", ["club-promo", "networking-programs"])
def test_legacy_participation_detail_exposes_only_the_cta_link(api, slug: str) -> None:
    fixture = _setup_participation_post(api, slug=slug)

    response = api.client.get(f"/api/posts/{fixture['post_id']}", headers=api.headers["owner"])

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["content"] == (
        "동아리 소개입니다.\n\n"
        "참여방법\n카카오톡 오픈채팅방으로 참여하세요.\n\n"
        "정기적으로 모임을 진행합니다."
    )
    assert data["metadata"] == {"application_url": "https://open.kakao.com/o/example"}


def test_new_participation_post_stores_labeled_link_only_as_cta_metadata(api) -> None:
    fixture = _setup_participation_post(api)
    with api.session() as db:
        image = _ready_media(owner_id=3, filename="new-club.png", content_type="image/png")
        db.add(image)
        db.commit()
        image_id = image.id

    response = api.client.post(
        f"/api/boards/{fixture['board_id']}/posts",
        headers=api.headers["admin"],
        json={
            "title": "새 동아리",
            "content": "소개\n\n가입 링크: https://example.com/join\n\n마무리",
            "metadata": {"application_url": "https://example.com/join"},
            "attachment_ids": [image_id],
        },
    )

    assert response.status_code == 200
    post_id = response.json()["data"]["id"]
    with api.session() as db:
        stored = db.get(Post, post_id)
        assert stored is not None
        assert stored.content == "소개\n\n마무리"
        assert stored.metadata_json == {"application_url": "https://example.com/join"}


def test_admin_replaces_participation_hero_without_revalidating_legacy_cta(api) -> None:
    fixture = _setup_participation_post(api)

    response = api.client.put(
        f"/api/posts/{fixture['post_id']}/representative-image",
        headers=api.headers["admin"],
        json={"media_id": fixture["replacement_id"]},
    )

    assert response.status_code == 200
    assert response.json()["data"] == {
        "post_id": fixture["post_id"],
        "media_id": fixture["replacement_id"],
    }
    with api.session() as db:
        stored = db.get(Post, fixture["post_id"])
        assert stored is not None
        assert stored.title == "SG_LLM"
        assert stored.content == (
            "동아리 소개입니다.\n\n"
            "참여방법\n카카오톡 오픈채팅방으로 참여하세요.\n\n"
            "참여링크 : https://open.kakao.com/o/example\n\n"
            "정기적으로 모임을 진행합니다."
        )
        assert stored.metadata_json is None
        attachment_ids = db.scalars(
            select(PostAttachment.media_id)
            .where(PostAttachment.post_id == fixture["post_id"])
            .order_by(PostAttachment.sort_order.asc(), PostAttachment.id.asc())
        ).all()
    assert attachment_ids == [fixture["document_id"], fixture["replacement_id"], fixture["gallery_id"]]

    detail_response = api.client.get(f"/api/posts/{fixture['post_id']}", headers=api.headers["owner"])
    list_response = api.client.get(
        f"/api/boards/{fixture['board_id']}/posts",
        headers=api.headers["owner"],
    )
    assert detail_response.status_code == 200
    assert "참여링크" not in detail_response.json()["data"]["content"]
    assert [item["id"] for item in detail_response.json()["data"]["attachments"]] == [
        fixture["document_id"],
        fixture["replacement_id"],
        fixture["gallery_id"],
    ]
    assert list_response.status_code == 200
    assert list_response.json()["data"][0]["thumbnail_media_id"] == fixture["replacement_id"]


def test_representative_image_endpoint_is_admin_and_participation_only(api) -> None:
    fixture = _setup_participation_post(api)

    member_response = api.client.put(
        f"/api/posts/{fixture['post_id']}/representative-image",
        headers=api.headers["owner"],
        json={"media_id": fixture["replacement_id"]},
    )
    ordinary_response = api.client.put(
        "/api/posts/3/representative-image",
        headers=api.headers["admin"],
        json={"media_id": fixture["replacement_id"]},
    )
    document_response = api.client.put(
        f"/api/posts/{fixture['post_id']}/representative-image",
        headers=api.headers["admin"],
        json={"media_id": fixture["document_id"]},
    )

    assert member_response.status_code == 403
    assert ordinary_response.status_code == 400
    assert document_response.status_code == 400
    assert document_response.json()["code"] == "IMAGE_ONLY"

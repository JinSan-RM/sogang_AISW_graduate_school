import pytest

from app.models.board import Board
from app.models.post import Post
from app.models.user import User


def _create_search_board(api, slug: str, board_type: str) -> int:
    with api.session() as db:
        author = db.get(User, 1)
        author.nickname = "SearchWitness"
        board = Board(
            name="Search test board",
            slug=slug,
            category="participation" if board_type == "activity_certification" else "community",
            board_type=board_type,
            read_permission="user",
            write_permission="user",
        )
        db.add(board)
        db.flush()
        db.add_all([
            Post(board_id=board.id, author_id=1, title="Author-only match", content="Activity reflection"),
            Post(
                board_id=board.id,
                author_id=None,
                author_nickname_snapshot="SearchWitness",
                title="Historical author-only match",
                content="Preserved reflection",
            ),
            Post(board_id=board.id, author_id=2, title="SearchWitness activity", content="Title match"),
            Post(board_id=board.id, author_id=2, title="Body match", content="Attended with SearchWitness"),
            Post(
                board_id=board.id,
                author_id=2,
                title="Participant metadata-only match",
                content="Another reflection",
                metadata_json={"participants": "SearchWitness"},
            ),
        ])
        db.commit()
        return board.id


@pytest.mark.parametrize("slug", ["club-activity", "study-activity", "networking-activity"])
@pytest.mark.parametrize("reader", ["other", "admin"])
def test_activity_search_excludes_author_names_and_participant_metadata(api, slug: str, reader: str) -> None:
    board_id = _create_search_board(api, slug, "activity_certification")

    response = api.client.get(
        f"/api/boards/{board_id}/posts",
        params={"q": "searchwitness"},
        headers=api.headers[reader],
    )

    assert response.status_code == 200
    assert {item["title"] for item in response.json()["data"]} == {
        "SearchWitness activity",
        "Body match",
    }
    assert response.json()["pagination"]["total"] == 2


@pytest.mark.parametrize("reader", ["other", "admin"])
def test_community_search_keeps_author_name_matches(api, reader: str) -> None:
    board_id = _create_search_board(api, "community-search", "post")

    response = api.client.get(
        f"/api/boards/{board_id}/posts",
        params={"q": "searchwitness"},
        headers=api.headers[reader],
    )

    assert response.status_code == 200
    assert {item["title"] for item in response.json()["data"]} == {
        "Author-only match",
        "Historical author-only match",
        "SearchWitness activity",
        "Body match",
    }
    assert response.json()["pagination"]["total"] == 4


@pytest.mark.parametrize("slug", ["club-activity", "networking-activity"])
@pytest.mark.parametrize("reader", ["other", "admin"])
def test_activity_search_matches_all_tagged_posts_across_pages(api, slug: str, reader: str) -> None:
    board_id = _create_search_board(api, slug, "activity_certification")
    with api.session() as db:
        tagged = [
            Post(
                board_id=board_id,
                author_id=1,
                title="사진 산책" if index == 0 else f"Activity {index}",
                content="Weekend reflection",
                category="알바트로스냅(사진)",
            )
            for index in range(4)
        ]
        db.add_all(tagged)
        db.commit()
        expected_ids = {post.id for post in tagged}

    found_ids = []
    for page in (1, 2):
        response = api.client.get(
            f"/api/boards/{board_id}/posts",
            params={"q": "사진", "page": page, "size": 2},
            headers=api.headers[reader],
        )
        assert response.status_code == 200
        assert response.json()["pagination"] == {
            "page": page, "size": 2, "total": 4, "total_pages": 2,
        }
        found_ids.extend(item["id"] for item in response.json()["data"])
    assert len(found_ids) == 4
    assert set(found_ids) == expected_ids


@pytest.mark.parametrize("reader", ["other", "admin"])
def test_club_tag_search_uses_current_source_then_visible_legacy_fallback(api, reader: str) -> None:
    board_id = _create_search_board(api, "club-activity", "activity_certification")
    with api.session() as db:
        source_board = Board(
            name="Club guides", slug="club-promo", category="participation",
            board_type="guide", read_permission="user", write_permission="admin",
        )
        db.add(source_board)
        db.flush()
        source = Post(board_id=source_board.id, author_id=3, title="사진 동아리", content="Guide")
        wrong_source = Post(board_id=2, author_id=1, title="사진 자료", content="Not a club guide")
        db.add_all([source, wrong_source])
        db.flush()
        linked = [
            Post(
                board_id=board_id, author_id=1, title=f"Linked {index}", content="Reflection",
                category="옛동아리명", metadata_json={"activity_source_post_id": source_id},
            )
            for index, source_id in enumerate([source.id, str(source.id), f" 00{source.id} "])
        ]
        legacy = Post(
            board_id=board_id, author_id=1, title="Legacy", content="Reflection",
            category="활동 인증", metadata_json={"legacy_activity_name": "사진 모임"},
        )
        invalid_link = Post(
            board_id=board_id, author_id=1, title="Invalid link", content="Reflection",
            category="사진 과거활동", metadata_json={"activity_source_post_id": "invalid"},
        )
        wrong_link = Post(
            board_id=board_id, author_id=1, title="Wrong link", content="Reflection",
            category="Other group", metadata_json={"activity_source_post_id": str(wrong_source.id)},
        )
        db.add_all([*linked, legacy, invalid_link, wrong_link])
        db.commit()
        expected_ids = {post.id for post in [*linked, legacy, invalid_link]}

    response = api.client.get(
        f"/api/boards/{board_id}/posts", params={"q": "사진"}, headers=api.headers[reader],
    )
    assert response.status_code == 200
    assert {item["id"] for item in response.json()["data"]} == expected_ids
    assert response.json()["pagination"]["total"] == 5

    old_name = api.client.get(
        f"/api/boards/{board_id}/posts", params={"q": "옛동아리명"}, headers=api.headers[reader],
    )
    assert old_name.status_code == 200
    assert old_name.json()["data"] == []


def test_study_search_does_not_match_a_category_that_is_not_displayed(api) -> None:
    board_id = _create_search_board(api, "study-activity", "activity_certification")
    with api.session() as db:
        db.add(Post(
            board_id=board_id, author_id=1, title="Study", content="Reflection", category="InvisibleTag",
        ))
        db.commit()
    response = api.client.get(
        f"/api/boards/{board_id}/posts", params={"q": "InvisibleTag"}, headers=api.headers["other"],
    )
    assert response.status_code == 200
    assert response.json()["data"] == []

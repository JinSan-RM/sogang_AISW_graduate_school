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
def test_activity_search_only_matches_title_and_content(api, slug: str, reader: str) -> None:
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

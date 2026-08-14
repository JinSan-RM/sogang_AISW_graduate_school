from datetime import datetime

import pytest

from app.club_activity_cleanup import (
    CURRENT_CLUB_NAMES,
    apply_club_activity_cleanup_plan,
    build_club_activity_cleanup_plan,
    normalize_club_name,
)
from app.models.board import Board
from app.models.post import Post


def _setup_cleanup_boards(db) -> tuple[Board, Board]:
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
    db.add_all([promo_board, activity_board])
    db.flush()
    return promo_board, activity_board


def _add_current_sources(db, promo_board: Board) -> dict[str, Post]:
    sources = {
        name: Post(
            board_id=promo_board.id,
            author_id=3,
            title=name,
            content=f"{name} official guide",
            status="published",
        )
        for name in CURRENT_CLUB_NAMES
    }
    db.add_all(sources.values())
    db.flush()
    return sources


def _activity(activity_board: Board, title: str, category: str, metadata: dict | None = None) -> Post:
    return Post(
        board_id=activity_board.id,
        author_id=1,
        title=title,
        content="Reflection",
        category=category,
        metadata_json=metadata or {"legacy_activity_name": category},
    )


def test_normalize_club_name_uses_nfkc_and_collapses_whitespace() -> None:
    assert normalize_club_name("  ＳＧ＿ＬＬＭ\t club  ") == "SG_LLM club"


def test_cleanup_plan_only_applies_unambiguous_links_and_is_idempotent(api) -> None:
    with api.session() as db:
        promo_board, activity_board = _setup_cleanup_boards(db)
        sources = _add_current_sources(db, promo_board)
        retired = Post(
            board_id=promo_board.id,
            author_id=3,
            title="옛 공식 동아리",
            content="Retired guide",
            status="published",
            deleted_at=datetime.utcnow(),
        )
        db.add(retired)
        db.flush()
        exact = _activity(activity_board, "Exact", "  SG_LLM  ")
        alias = _activity(activity_board, "Alias", "봄 동아리")
        unmatched = _activity(activity_board, "Unknown", "정체불명")
        historical = _activity(
            activity_board,
            "Historical",
            "예전 스냅샷",
            {"activity_source_post_id": str(retired.id)},
        )
        already_current = _activity(
            activity_board,
            "Current",
            "서뽈링",
            {"activity_source_post_id": str(sources["서뽈링"].id)},
        )
        db.add_all([exact, alias, unmatched, historical, already_current])
        db.flush()

        plan = build_club_activity_cleanup_plan(
            db,
            aliases={"봄 동아리": "서강의 봄"},
            expected_current_names=CURRENT_CLUB_NAMES,
        )

        assert plan.source_issues == ()
        changes = {change.post_id: change for change in plan.changes}
        assert (changes[exact.id].source_post_id, changes[exact.id].category) == (sources["SG_LLM"].id, "SG_LLM")
        assert (changes[alias.id].source_post_id, changes[alias.id].category) == (sources["서강의 봄"].id, "서강의 봄")
        assert (changes[historical.id].source_post_id, changes[historical.id].category) == (retired.id, "옛 공식 동아리")
        assert plan.unchanged_count == 1
        assert [(item.post_id, item.reason) for item in plan.unmatched] == [(unmatched.id, "no matching current club")]
        assert exact.metadata_json == {"legacy_activity_name": "  SG_LLM  "}

        assert apply_club_activity_cleanup_plan(db, plan) == 3
        db.flush()
        assert exact.metadata_json["activity_source_post_id"] == str(sources["SG_LLM"].id)
        assert exact.category == "SG_LLM"
        assert alias.metadata_json["activity_source_post_id"] == str(sources["서강의 봄"].id)
        assert historical.category == "옛 공식 동아리"

        repeated = build_club_activity_cleanup_plan(
            db,
            aliases={"봄 동아리": "서강의 봄"},
            expected_current_names=CURRENT_CLUB_NAMES,
        )
        assert repeated.changes == ()
        assert repeated.unchanged_count == 4
        assert [item.post_id for item in repeated.unmatched] == [unmatched.id]


def test_cleanup_refuses_missing_or_extra_current_clubs(api) -> None:
    with api.session() as db:
        promo_board, activity_board = _setup_cleanup_boards(db)
        for name in CURRENT_CLUB_NAMES[:-1]:
            db.add(Post(board_id=promo_board.id, author_id=3, title=name, content="Official", status="published"))
        db.add(Post(board_id=promo_board.id, author_id=3, title="추가 공개 동아리", content="Extra", status="published"))
        activity = _activity(activity_board, "Needs mapping", "SG_LLM")
        db.add(activity)
        db.flush()

        plan = build_club_activity_cleanup_plan(
            db,
            aliases={},
            expected_current_names=CURRENT_CLUB_NAMES,
        )

        assert "missing current club: FC리턴윈" in plan.source_issues
        assert "unexpected current club: 추가 공개 동아리" in plan.source_issues
        with pytest.raises(ValueError, match="current club source audit failed"):
            apply_club_activity_cleanup_plan(db, plan)
        assert activity.metadata_json == {"legacy_activity_name": "SG_LLM"}


def test_cleanup_refuses_a_noncanonical_current_club_title(api) -> None:
    with api.session() as db:
        promo_board, _ = _setup_cleanup_boards(db)
        for name in CURRENT_CLUB_NAMES:
            stored_name = "ＳＧ＿ＬＬＭ" if name == "SG_LLM" else name
            db.add(Post(board_id=promo_board.id, author_id=3, title=stored_name, content="Official", status="published"))
        db.flush()

        plan = build_club_activity_cleanup_plan(
            db,
            aliases={},
            expected_current_names=CURRENT_CLUB_NAMES,
        )

        assert "non-canonical current club title: ＳＧ＿ＬＬＭ -> SG_LLM" in plan.source_issues

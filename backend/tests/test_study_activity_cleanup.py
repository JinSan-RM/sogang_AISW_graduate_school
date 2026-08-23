from datetime import datetime

from app.models.board import Board
from app.models.post import Post
from app.study_activity_cleanup import (
    LEGACY_STUDY_ACTIVITY_SOURCE_WRITE_IDS,
    LEGACY_STUDY_ACTIVITY_TITLES,
    apply_study_activity_cleanup_plan,
    build_study_activity_cleanup_plan,
    post_content_preview,
)


EXPECTED_CLEANUP_WRITE_IDS = {
    "6347133",
    "6388102",
    "6388462",
    "6541363",
    "6541896",
    "6561447",
    "6562105",
    "6672834",
    "6710959",
    "6726410",
    "6788603",
    "6798677",
    "6880210",
    "9528433",
    "9528436",
    "9528438",
    "9851140",
}


def _board(slug: str, board_type: str = "activity_certification") -> Board:
    return Board(
        name=slug,
        slug=slug,
        category="participation",
        board_type=board_type,
        read_permission="user",
        write_permission="user",
    )


def test_all_roster_titles_have_curated_non_personal_titles() -> None:
    assert set(LEGACY_STUDY_ACTIVITY_TITLES) == EXPECTED_CLEANUP_WRITE_IDS
    assert LEGACY_STUDY_ACTIVITY_TITLES["9851140"] == (
        "[마감][딥러닝기초] 학점방어 스터디원 모집합니다! 📚🔥"
    )
    assert all("010-" not in title for title in LEGACY_STUDY_ACTIVITY_TITLES.values())


def test_only_confirmed_recruitment_sources_are_linked() -> None:
    assert LEGACY_STUDY_ACTIVITY_SOURCE_WRITE_IDS == {
        "5678933": "5633071",
        "6388462": "6337100",
        "6726410": "6651604",
        "9851140": "9740702",
    }


def test_study_preview_uses_study_content_section_without_changing_other_boards() -> None:
    content = """[스터디원 이름/기수/학과]
김가현 74기 인공지능
허명진 68기 인공지능

[스터디 날짜 및 시간]
26.05.30

[스터디 내용]
딥러닝기초 cs231n 6강, 7강 기말고사 준비"""

    assert post_content_preview(content, "study-activity") == (
        "딥러닝기초 cs231n 6강, 7강 기말고사 준비"
    )
    assert post_content_preview(content, "club-activity") == content[:100]
    assert post_content_preview(content, "networking-activity") == content[:100]


def test_study_preview_skips_repeated_study_content_headings() -> None:
    content = """[스터디원 이름/기수/학과]
65기 김서강

[스터디 내용]
[스터디 내용]
LSTM 논문 리뷰 및 발표"""

    assert post_content_preview(content, "study-activity") == "LSTM 논문 리뷰 및 발표"


def test_cleanup_plan_is_study_only_and_idempotent(api) -> None:
    with api.session() as db:
        recruit_board = _board("study-recruit", "post")
        study_board = _board("study-activity")
        club_board = _board("club-activity")
        db.add_all([recruit_board, study_board, club_board])
        db.flush()

        source = Post(
            board_id=recruit_board.id,
            author_id=1,
            title="[마감][딥러닝기초] 학점방어 스터디원 모집합니다! 📚🔥",
            content="모집 본문",
            metadata_json={"legacy_write_id": "9740702"},
        )
        study = Post(
            board_id=study_board.id,
            author_id=1,
            title="김가현 74기, 김수빈 74기",
            content="[스터디 내용]\n딥러닝기초 cs231n 6강, 7강 기말고사 준비",
            metadata_json={
                "legacy_write_id": "9851140",
                "legacy_activity_name": "김가현 74기, 김수빈 74기",
                "legacy_original_title": "김가현 74기, 김수빈 74기",
                "keep": "yes",
            },
        )
        club = Post(
            board_id=club_board.id,
            author_id=1,
            title="동아리 원래 제목",
            content="동아리 본문",
            metadata_json={"legacy_write_id": "9851140"},
        )
        valid_study = Post(
            board_id=study_board.id,
            author_id=1,
            title="220521 자격증 시험 스터디 입니다.",
            content="자격증 스터디",
            metadata_json={"legacy_write_id": "5678933"},
        )
        valid_source = Post(
            board_id=recruit_board.id,
            author_id=1,
            title="5/21일날 자격증 스터디 모집합니다.",
            content="모집 본문",
            metadata_json={"legacy_write_id": "5633071"},
        )
        db.add_all([source, study, club, valid_study, valid_source])
        db.flush()

        plan = build_study_activity_cleanup_plan(db)
        changes = {change.post_id: change for change in plan.changes}
        assert changes[study.id].title == source.title
        assert changes[study.id].source_post_id == source.id
        assert changes[valid_study.id].title == valid_study.title
        assert changes[valid_study.id].source_post_id == valid_source.id
        assert club.id not in changes
        assert plan.unmatched == ()

        assert apply_study_activity_cleanup_plan(db, plan) == 2
        db.flush()
        assert study.title == source.title
        assert study.metadata_json == {
            "legacy_write_id": "9851140",
            "activity_source_post_id": str(source.id),
            "legacy_activity_name": source.title,
            "legacy_original_title": "김가현 74기, 김수빈 74기",
            "keep": "yes",
        }
        assert club.title == "동아리 원래 제목"

        drifted_metadata = dict(study.metadata_json)
        drifted_metadata["legacy_activity_name"] = "김가현 74기, 김수빈 74기"
        study.metadata_json = drifted_metadata
        db.flush()
        metadata_repair = build_study_activity_cleanup_plan(db)
        assert [change.post_id for change in metadata_repair.changes] == [study.id]
        assert apply_study_activity_cleanup_plan(db, metadata_repair) == 1
        db.flush()
        assert study.metadata_json["legacy_activity_name"] == source.title

        repeated = build_study_activity_cleanup_plan(db)
        assert repeated.changes == ()
        assert repeated.unchanged_count == 2


def test_study_board_list_returns_content_section_but_club_list_is_unchanged(api) -> None:
    structured = """[스터디원 이름/기수/학과]
김가현 74기 인공지능

[스터디 날짜 및 시간]
26.05.30

[스터디 내용]
딥러닝기초 cs231n 6강, 7강 기말고사 준비"""
    with api.session() as db:
        study_board = _board("study-activity")
        club_board = _board("club-activity")
        db.add_all([study_board, club_board])
        db.flush()
        db.add_all(
            [
                Post(
                    board_id=study_board.id,
                    author_id=1,
                    title="딥러닝 스터디",
                    content=structured,
                    metadata_json={
                        "legacy_activity_name": "김가현 74기, 김수빈 74기",
                        "legacy_original_title": "김가현 74기, 김수빈 74기",
                    },
                    created_at=datetime(2026, 5, 30, 9, 0, 0),
                ),
                Post(
                    board_id=club_board.id,
                    author_id=1,
                    title="서뽈링",
                    content=structured,
                    created_at=datetime(2026, 5, 30, 9, 0, 0),
                ),
            ]
        )
        db.commit()
        study_board_id = study_board.id
        club_board_id = club_board.id

    study_response = api.client.get(
        f"/api/boards/{study_board_id}/posts", headers=api.headers["owner"]
    )
    club_response = api.client.get(
        f"/api/boards/{club_board_id}/posts", headers=api.headers["owner"]
    )

    assert study_response.status_code == 200
    assert study_response.json()["data"][0]["content_preview"] == (
        "딥러닝기초 cs231n 6강, 7강 기말고사 준비"
    )
    assert "legacy_original_title" not in study_response.json()["data"][0]["metadata"]
    assert club_response.status_code == 200
    assert club_response.json()["data"][0]["content_preview"] == structured[:100]

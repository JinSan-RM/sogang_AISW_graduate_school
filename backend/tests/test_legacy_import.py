from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pytest
from openpyxl import Workbook
from sqlalchemy import func, select

from app.legacy_import import (
    ARTICLE_HEADERS,
    SourceRow,
    import_articles_and_specials,
    load_article_workbook,
    normalize_author,
    target_slug,
    validate_database_target,
)
from app.models.audit import LegacyImportRecord
from app.models.board import Board
from app.models.post import Post


def test_author_normalization_removes_duplicate_cohort_prefixes() -> None:
    assert normalize_author("[70기 70기_이혜진]") == ("이혜진", "70기")
    assert normalize_author("[서강대 72기 한다현]") == ("한다현", "72기")


def test_free_board_sheet_is_only_a_staging_bucket() -> None:
    row = SourceRow(
        source_file="board_articles_ver2.xlsx",
        sheet="자유게시판",
        row_number=1,
        data={"writeId": "1", "boardName": "전공 커뮤니티"},
    )
    assert target_slug(row) == "community-major"
    assert "free-board" not in {target_slug(row)}


def test_import_target_rejects_source_database() -> None:
    with pytest.raises(RuntimeError, match="protected source database"):
        validate_database_target("postgresql+psycopg://postgres:postgres@db:5432/sogang_app")
    assert (
        validate_database_target(
            "postgresql+psycopg://postgres:postgres@db:5432/sogang_app_migration_review_20260802"
        )
        == "sogang_app_migration_review_20260802"
    )


def test_headerless_staging_sheet_and_duplicate_article_are_parsed(tmp_path: Path) -> None:
    path = tmp_path / "board_articles_ver2.xlsx"
    workbook = Workbook()
    staging = workbook.active
    staging.title = "자유게시판"
    first = [None] * len(ARTICLE_HEADERS)
    first[ARTICLE_HEADERS.index("boardName")] = "전공 커뮤니티"
    first[ARTICLE_HEADERS.index("writeId")] = 101
    first[ARTICLE_HEADERS.index("title")] = "첫 글"
    staging.append(first)
    notices = workbook.create_sheet("기타공지")
    notices.append(ARTICLE_HEADERS)
    second = [None] * len(ARTICLE_HEADERS)
    second[ARTICLE_HEADERS.index("boardName")] = "전체공지"
    second[ARTICLE_HEADERS.index("writeId")] = 101
    second[ARTICLE_HEADERS.index("title")] = "중복 글"
    notices.append(second)
    attachments = workbook.create_sheet("첨부파일")
    attachments.append(
        [
            "writeId", "boardId", "attach_type", "sequence", "subject", "fileStorageId",
            "contentType", "attach_id", "link_url", "regiDatetime", "fileSize",
        ]
    )
    attachments.append([101, "board", "image", 0, "photo.png", 9001, "BOARD_ATC_IMAGE", 9001, None, None, 3])
    workbook.save(path)

    articles, parsed_attachments, duplicates = load_article_workbook(path)
    assert [row.source_id for row in articles] == ["101"]
    assert articles[0].sheet == "자유게시판"
    assert len(parsed_attachments) == 1
    assert len(duplicates) == 1


def test_article_import_is_idempotent(api) -> None:
    with api.session() as db:
        db.add(
            Board(
                name="Academic notices",
                slug="academic-notices",
                category="notices",
                board_type="notice",
                read_permission="user",
                write_permission="admin",
            )
        )
        db.commit()
        row = SourceRow(
            source_file="board_articles_ver2.xlsx",
            sheet="학사공지",
            row_number=2,
            data={
                "writeId": "4313612",
                "boardName": "전체공지",
                "title": "이관 테스트",
                "content": "동일한 원본을 다시 실행해도 한 건만 남아야 합니다.",
                "writeUser": "72기 한다현",
                "cohort": "72기",
                "date": datetime(2025, 1, 1, 9, 0, 0),
                "updateDate": datetime(2025, 1, 1, 9, 0, 0),
            },
        )

        _, first_stats, _ = import_articles_and_specials(db, [row], [], apply=True, limit=1)
        db.commit()
        _, second_stats, _ = import_articles_and_specials(db, [row], [], apply=True, limit=1)
        db.commit()

        assert first_stats["created_posts"] == 1
        assert second_stats["unchanged_posts"] == 1
        assert db.scalar(select(func.count(Post.id)).where(Post.title == "이관 테스트")) == 1
        assert db.scalar(select(func.count(LegacyImportRecord.id))) == 1


def test_legacy_import_review_api_is_admin_only(api) -> None:
    with api.session() as db:
        db.add(
            LegacyImportRecord(
                source_file="board_articles_ver2.xlsx",
                source_sheet="자유게시판",
                source_row=1,
                entity_type="article",
                source_id="101",
                source_hash="a" * 64,
                action="review",
                status="unmapped",
                reason="no_approved_board_mapping",
                redacted_details={"title": "검토 글"},
            )
        )
        db.commit()

    assert api.client.get("/api/admin/legacy-import/summary", headers=api.headers["owner"]).status_code == 403
    response = api.client.get("/api/admin/legacy-import/summary", headers=api.headers["admin"])
    assert response.status_code == 200
    assert response.json()["data"] == [
        {"entity_type": "article", "status": "unmapped", "action": "review", "count": 1}
    ]

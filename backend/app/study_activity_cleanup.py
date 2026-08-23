from __future__ import annotations

from dataclasses import dataclass
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.board import Board
from app.models.post import Post


# These 17 workbook rows used participant rosters (including legacy personal
# information) as the title. The replacements were curated from each row's
# study-content section and, where the match is certain, its recruitment post.
LEGACY_STUDY_ACTIVITY_TITLES: dict[str, str] = {
    "6347133": "Computer Vision Paper Implementation 스터디",
    "6388102": "NLP 스터디",
    "6388462": "[데이터사이언스] 코린이의 AI 스터디 모집",
    "6541363": "Fake Image 판별 스터디",
    "6541896": "LSTM 논문 리뷰 스터디",
    "6561447": "Seq2Seq 논문 리뷰 스터디",
    "6562105": "논문 준비 스터디",
    "6672834": "NLP 논문 리뷰 스터디",
    "6710959": "인공지능 이론 학습 스터디",
    "6726410": "[자연어처리] NLP 논문읽기 스터디 모집 결과",
    "6788603": "빅데이터분석기사 자격증 스터디",
    "6798677": "NLP 논문 리뷰 스터디",
    "6880210": "빅데이터분석기사 자격증 스터디",
    "9528433": "논문 리뷰 및 발표 스터디",
    "9528436": "논문 리뷰 및 발표 스터디",
    "9528438": "논문 리뷰 및 토론 스터디",
    "9851140": "[마감][딥러닝기초] 학점방어 스터디원 모집합니다! 📚🔥",
}

# Only exact workbook matches are linked. Rows without a confirmed source keep
# a curated standalone title instead of guessing a recruitment relationship.
LEGACY_STUDY_ACTIVITY_SOURCE_WRITE_IDS: dict[str, str] = {
    "5678933": "5633071",
    "6388462": "6337100",
    "6726410": "6651604",
    "9851140": "9740702",
}

STUDY_CONTENT_HEADING_RE = re.compile(r"(?im)^\s*\[\s*스터디\s*내용\s*\]\s*$")
SECTION_HEADING_RE = re.compile(r"(?m)^\s*\[[^\]\r\n]+\]\s*$")


def curated_study_activity_title(legacy_write_id: str, fallback: str) -> str:
    return LEGACY_STUDY_ACTIVITY_TITLES.get(str(legacy_write_id), fallback)


def post_content_preview(content: str, board_slug: str, maximum: int = 100) -> str:
    if board_slug != "study-activity":
        return content[:maximum]

    heading = STUDY_CONTENT_HEADING_RE.search(content)
    if heading is None:
        return content[:maximum]
    section = content[heading.end():]
    while True:
        repeated_heading = STUDY_CONTENT_HEADING_RE.match(section)
        if repeated_heading is None:
            break
        section = section[repeated_heading.end():]
    next_heading = SECTION_HEADING_RE.search(section)
    if next_heading is not None:
        section = section[:next_heading.start()]
    summary = re.sub(r"\s+", " ", section).strip()
    return (summary or content[:maximum])[:maximum]


@dataclass(frozen=True)
class StudyActivityChange:
    post_id: int
    title: str
    source_post_id: int | None


@dataclass(frozen=True)
class StudyActivityUnmatched:
    post_id: int
    legacy_write_id: str
    reason: str


@dataclass(frozen=True)
class StudyActivityCleanupPlan:
    changes: tuple[StudyActivityChange, ...]
    unchanged_count: int
    unmatched: tuple[StudyActivityUnmatched, ...]
    source_issues: tuple[str, ...]


def _legacy_write_id(post: Post) -> str | None:
    value = (post.metadata_json or {}).get("legacy_write_id")
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def _stored_source_post_id(post: Post) -> int | None:
    value = (post.metadata_json or {}).get("activity_source_post_id")
    if isinstance(value, bool):
        return None
    try:
        parsed = int(str(value).strip())
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def build_study_activity_cleanup_plan(db: Session) -> StudyActivityCleanupPlan:
    study_board = db.scalar(select(Board).where(Board.slug == "study-activity"))
    recruit_board = db.scalar(select(Board).where(Board.slug == "study-recruit"))
    issues: list[str] = []
    if study_board is None:
        issues.append("missing board: study-activity")
        return StudyActivityCleanupPlan((), 0, (), tuple(issues))
    if recruit_board is None:
        issues.append("missing board: study-recruit")

    source_by_legacy_id: dict[str, list[Post]] = {}
    if recruit_board is not None:
        sources = db.scalars(
            select(Post).where(Post.board_id == recruit_board.id).order_by(Post.id.asc())
        ).all()
        for source in sources:
            legacy_id = _legacy_write_id(source)
            if legacy_id:
                source_by_legacy_id.setdefault(legacy_id, []).append(source)

    activities = db.scalars(
        select(Post)
        .where(Post.board_id == study_board.id, Post.deleted_at.is_(None))
        .order_by(Post.id.asc())
    ).all()
    changes: list[StudyActivityChange] = []
    unmatched: list[StudyActivityUnmatched] = []
    unchanged_count = 0

    for activity in activities:
        legacy_id = _legacy_write_id(activity)
        if legacy_id is None:
            continue
        curated_title = LEGACY_STUDY_ACTIVITY_TITLES.get(legacy_id)
        source_legacy_id = LEGACY_STUDY_ACTIVITY_SOURCE_WRITE_IDS.get(legacy_id)
        if curated_title is None and source_legacy_id is None:
            continue

        desired_title = curated_title or activity.title
        source_post_id: int | None = None
        if source_legacy_id is not None:
            sources = source_by_legacy_id.get(source_legacy_id, [])
            if len(sources) == 1:
                source_post_id = sources[0].id
            else:
                reason = "missing recruitment source" if not sources else "ambiguous recruitment source"
                unmatched.append(StudyActivityUnmatched(activity.id, legacy_id, reason))

        title_matches = activity.title == desired_title
        activity_name_matches = (
            (activity.metadata_json or {}).get("legacy_activity_name") == desired_title
        )
        source_matches = source_legacy_id is None or (
            source_post_id is not None and _stored_source_post_id(activity) == source_post_id
        )
        if title_matches and activity_name_matches and source_matches:
            unchanged_count += 1
        elif (
            not source_legacy_id
            or source_post_id is not None
            or not title_matches
            or not activity_name_matches
        ):
            changes.append(StudyActivityChange(activity.id, desired_title, source_post_id))

    return StudyActivityCleanupPlan(
        changes=tuple(changes),
        unchanged_count=unchanged_count,
        unmatched=tuple(unmatched),
        source_issues=tuple(issues),
    )


def apply_study_activity_cleanup_plan(db: Session, plan: StudyActivityCleanupPlan) -> int:
    if any(issue == "missing board: study-activity" for issue in plan.source_issues):
        raise ValueError("study activity board audit failed")
    for change in plan.changes:
        post = db.get(Post, change.post_id)
        if post is None or post.deleted_at is not None:
            raise ValueError(f"study activity post is no longer available: {change.post_id}")
        post.title = change.title
        metadata = dict(post.metadata_json or {})
        metadata["legacy_activity_name"] = change.title
        if change.source_post_id is not None:
            metadata["activity_source_post_id"] = str(change.source_post_id)
        post.metadata_json = metadata
    return len(plan.changes)

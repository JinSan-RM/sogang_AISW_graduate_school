from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.banner import Banner
from app.models.board import Board
from app.models.faq import FAQ
from app.models.user import User
from app.security import hash_password


BOARD_SEED_DATA = [
    {
        "name": "전체 공지",
        "slug": "all-notices",
        "category": "notices",
        "board_type": "notice",
        "description": "원우회와 학교의 주요 공지를 한곳에서 확인합니다.",
        "sort_order": 0,
        "write_permission": "admin",
    },
    {
        "name": "학사 공지",
        "slug": "academic-notices",
        "category": "notices",
        "board_type": "notice",
        "description": "학사 안내와 학교 공지를 확인합니다.",
        "sort_order": 1,
        "write_permission": "admin",
    },
    {
        "name": "행사 공지",
        "slug": "event-notices",
        "category": "notices",
        "board_type": "notice",
        "description": "원우회와 학교 행사 소식을 확인합니다.",
        "sort_order": 2,
        "write_permission": "admin",
    },
    {
        "name": "학사 일정",
        "slug": "academic-calendar",
        "category": "notices",
        "board_type": "calendar",
        "description": "학사 일정과 일정 관련 안내를 확인합니다.",
        "sort_order": 3,
        "write_permission": "admin",
    },
    {
        "name": "웨비나/특강 공지",
        "slug": "webinar-notices",
        "category": "notices",
        "board_type": "notice",
        "description": "웨비나, 특강, 외부 세션 정보를 확인합니다.",
        "sort_order": 4,
        "write_permission": "admin",
    },
    {
        "name": "사진첩",
        "slug": "event-album",
        "category": "community",
        "board_type": "album",
        "description": "원우 모임과 행사 사진 기록을 둘러봅니다.",
        "sort_order": 10,
        "write_permission": "user",
    },
    {
        "name": "강의 후기",
        "slug": "lecture-reviews",
        "category": "resources",
        "board_type": "resource",
        "description": "강의 후기와 수강 경험을 공유합니다.",
        "sort_order": 20,
        "write_permission": "user",
        "allow_anonymous": True,
    },
    {
        "name": "시험 자료실",
        "slug": "exam-archive",
        "category": "resources",
        "board_type": "resource",
        "description": "시험 자료와 학습 자료를 공유합니다.",
        "sort_order": 21,
        "write_permission": "user",
        "allow_anonymous": True,
    },
    {
        "name": "종합시험",
        "slug": "comprehensive-exam",
        "category": "resources",
        "board_type": "resource",
        "description": "종합시험 정보와 준비 자료를 확인합니다.",
        "sort_order": 22,
        "write_permission": "user",
        "allow_anonymous": True,
    },
    {
        "name": "동아리 활동 인증",
        "slug": "club-activity",
        "category": "participation",
        "board_type": "activity_certification",
        "description": "동아리 활동 인증 게시글을 작성하고 확인합니다.",
        "sort_order": 30,
        "write_permission": "user",
    },
    {
        "name": "스터디 활동 인증",
        "slug": "study-activity",
        "category": "participation",
        "board_type": "activity_certification",
        "description": "스터디 활동 인증 게시글을 작성하고 확인합니다.",
        "sort_order": 31,
        "write_permission": "user",
    },
    {
        "name": "네트워킹 활동 인증",
        "slug": "networking-activity",
        "category": "participation",
        "board_type": "activity_certification",
        "description": "멘토링과 네트워킹 활동 기록을 확인합니다.",
        "sort_order": 32,
        "write_permission": "user",
    },
    {
        "name": "원우회 활동내역",
        "slug": "council-activity",
        "category": "council",
        "board_type": "activity_history",
        "description": "원우회 활동과 결과를 확인합니다.",
        "sort_order": 40,
        "write_permission": "admin",
    },
    {
        "name": "회계 장부",
        "slug": "accounting",
        "category": "council",
        "board_type": "external_link",
        "description": "원우회 회계와 예산 집행 자료를 확인합니다.",
        "sort_order": 41,
        "write_permission": "admin",
        "metadata": {
            "external_url": "https://docs.google.com/spreadsheets/d/1EZYg9k0dxLNHPqn9wUpPzfp_jYP3lMi4DrqEyfULgt4/edit?gid=885326518#gid=885326518"
        },
    },
    {
        "name": "건의사항",
        "slug": "suggestions",
        "category": "council",
        "board_type": "suggestion",
        "description": "건의사항을 남기고 공식 답변을 확인합니다.",
        "sort_order": 42,
        "write_permission": "user",
        "allow_anonymous": True,
    },
    {
        "name": "상조회",
        "slug": "mutual-aid",
        "category": "council",
        "board_type": "mutual_aid",
        "description": "경조사 신청을 접수하고 처리 상태를 확인합니다.",
        "sort_order": 43,
        "write_permission": "user",
    },
]

LEGACY_COMMUNITY_BOARD_SEED_DATA = [
    {
        "name": "전공 커뮤니티",
        "slug": "community-major",
        "category": "community",
        "board_type": "post",
        "description": "전공 질문과 커뮤니티 이야기를 나눕니다.",
        "sort_order": 11,
        "write_permission": "user",
        "allow_anonymous": True,
    },
    {
        "name": "논문 자료 공유",
        "slug": "community-paper",
        "category": "community",
        "board_type": "post",
        "description": "논문, 연구 자료, 참고 자료를 공유합니다.",
        "sort_order": 12,
        "write_permission": "user",
        "allow_anonymous": True,
    },
    {
        "name": "세미나 공유",
        "slug": "community-seminar",
        "category": "community",
        "board_type": "post",
        "description": "세미나 정보와 참여 후기를 공유합니다.",
        "sort_order": 13,
        "write_permission": "user",
        "allow_anonymous": True,
    },
    {
        "name": "채용 정보 공유",
        "slug": "community-job",
        "category": "community",
        "board_type": "post",
        "description": "취업, 인턴, 커리어 정보를 나눕니다.",
        "sort_order": 14,
        "write_permission": "user",
        "allow_anonymous": True,
    },
    {
        "name": "동아리 지원 신청",
        "slug": "club-apply",
        "category": "club",
        "board_type": "post",
        "description": "동아리 참여 신청과 모집 글을 확인합니다.",
        "sort_order": 50,
        "write_permission": "user",
    },
    {
        "name": "동아리 홍보",
        "slug": "club-promo",
        "category": "club",
        "board_type": "post",
        "description": "동아리 소개와 홍보 글을 둘러봅니다.",
        "sort_order": 51,
        "write_permission": "admin",
    },
    {
        "name": "스터디 모집",
        "slug": "study-recruit",
        "category": "study",
        "board_type": "post",
        "description": "스터디 그룹 모집 글을 확인합니다.",
        "sort_order": 60,
        "write_permission": "user",
    },
    {
        "name": "스터디 지원 신청",
        "slug": "study-apply",
        "category": "study",
        "board_type": "post",
        "description": "스터디 참여 신청과 관련 글을 확인합니다.",
        "sort_order": 61,
        "write_permission": "user",
    },
    {
        "name": "동문 주소록",
        "slug": "alumni-directory",
        "category": "alumni",
        "board_type": "external_link",
        "description": "리멤버 명함 기반 동문 주소록 안내를 확인합니다.",
        "sort_order": 71,
        "write_permission": "admin",
    },
    {
        "name": "네트워킹 안내",
        "slug": "networking-programs",
        "category": "alumni",
        "board_type": "post",
        "description": "선후배 네트워킹과 멘토링 프로그램 안내를 확인합니다.",
        "sort_order": 72,
        "write_permission": "admin",
    },
    {
        "name": "임원진 소개",
        "slug": "gsa-executives",
        "category": "gsa",
        "board_type": "organization_intro",
        "description": "원우회 임원진 소개와 명단을 확인합니다.",
        "sort_order": 78,
        "write_permission": "admin",
    },
    {
        "name": "기장단 소개",
        "slug": "gsa-cohort-leaders",
        "category": "gsa",
        "board_type": "organization_intro",
        "description": "기수별 기장단 소개와 인사말을 확인합니다.",
        "sort_order": 79,
        "write_permission": "admin",
    },
    {
        "name": "역대 원우회",
        "slug": "gsa-past-councils",
        "category": "gsa",
        "board_type": "organization_intro",
        "description": "역대 원우회 임원진과 활동내역을 확인합니다.",
        "sort_order": 80,
        "write_permission": "admin",
    },
    {
        "name": "건의사항 피드백",
        "slug": "gsa-feedback",
        "category": "gsa",
        "board_type": "post",
        "description": "건의사항 처리 결과와 원우회 피드백을 확인합니다.",
        "sort_order": 81,
        "write_permission": "admin",
        "allow_anonymous": True,
    },
    {
        "name": "자주 묻는 질문",
        "slug": "gsa-faq",
        "category": "gsa",
        "board_type": "faq",
        "description": "원우회 관련 자주 묻는 질문을 확인합니다.",
        "sort_order": 84,
        "write_permission": "admin",
    },
    {
        "name": "로드맵 & 원우회비 혜택",
        "slug": "gsa-roadmap-benefits",
        "category": "gsa",
        "board_type": "guide",
        "description": "원우회 로드맵과 원우회비 혜택 안내를 확인합니다.",
        "sort_order": 85,
        "write_permission": "admin",
    },
]

ACTIVE_BOARD_SEED_DATA = BOARD_SEED_DATA + LEGACY_COMMUNITY_BOARD_SEED_DATA

FAQ_SEED_DATA = [
    {
        "question": "원우회 가입은 어떻게 하나요?",
        "answer": "회원가입 시 자동으로 원우회 회원이 됩니다. 별도 가입 절차는 없어요.",
        "category": "원우회",
        "sort_order": 0,
    },
    {
        "question": "원우회비는 언제 납부하나요?",
        "answer": "매 학기 초 등록금 납부 기간에 함께 안내드려요.",
        "category": "원우회",
        "sort_order": 1,
    },
    {
        "question": "건의사항은 익명으로 작성되나요?",
        "answer": "네, 모든 건의사항은 익명으로 작성되고 처리됩니다.",
        "category": "원우회",
        "sort_order": 2,
    },
]


def seed_initial_data(db: Session) -> None:
    user = db.get(User, 1)
    if user is None:
        user = User(
                id=1,
                username="testuser",
                password_hash=hash_password("password123"),
                nickname="72gi_KimJinsan",
                cohort="72",
                major="AI-SW",
                phone="010-0000-0000",
                company="WithWe",
                job_title="Dev Lead",
                email="test@sogang.ac.kr",
                role="admin",
            )
        db.add(user)
        db.flush()
    elif user.password_hash == "temp_hash":
        user.password_hash = hash_password("password123")
        user.cohort = user.cohort or "72"

    target_slugs = {item["slug"] for item in ACTIVE_BOARD_SEED_DATA}
    existing_boards = db.scalars(select(Board)).all()
    for board in existing_boards:
        if board.slug not in target_slugs:
            board.is_active = False

    for item in ACTIVE_BOARD_SEED_DATA:
        board = db.scalar(select(Board).where(Board.slug == item["slug"]))
        values = {
            "name": item["name"],
            "category": item["category"],
            "board_type": item["board_type"],
            "description": item["description"],
            "sort_order": item["sort_order"],
            "allow_anonymous": item.get("allow_anonymous", False),
            "read_permission": item.get("read_permission", "user"),
            "write_permission": item["write_permission"],
            "is_active": True,
        }
        if board is None:
            db.add(Board(slug=item["slug"], metadata_json=item.get("metadata"), **values))
        else:
            for key, value in values.items():
                setattr(board, key, value)
            if "metadata" in item:
                board.metadata_json = item["metadata"]

    for faq in db.scalars(select(FAQ).where(FAQ.question == "Smoke original?")).all():
        faq.is_active = False

    for item in FAQ_SEED_DATA:
        faq = db.scalar(select(FAQ).where(FAQ.question == item["question"]))
        if faq is None:
            db.add(FAQ(**item, is_active=True))
        else:
            faq.answer = item["answer"]
            faq.category = item["category"]
            faq.sort_order = item["sort_order"]
            faq.is_active = True

    existing_banner = db.scalar(select(Banner.id).where(Banner.placement == "home").limit(1))
    if existing_banner is None:
        db.add(
            Banner(
                placement="home",
                title="AI-SW 커뮤니티",
                subtitle="공지, 일정, 커뮤니티와 원우회 소식을 한곳에서 확인하세요.",
                badge_text="SOGANG AI-SW",
                cta_label="공지 보기",
                cta_href="/(tabs)/boards",
                theme="navy",
                sort_order=0,
                is_active=True,
                created_by=1,
            )
        )

    db.commit()

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.board import Board
from app.models.user import User
from app.security import hash_password


BOARD_SEED_DATA = [
    {
        "name": "Academic Notices",
        "slug": "academic-notices",
        "category": "notices",
        "board_type": "notice",
        "description": "Academic notices and school affairs announcements",
        "sort_order": 1,
        "write_permission": "admin",
    },
    {
        "name": "Event Notices",
        "slug": "event-notices",
        "category": "notices",
        "board_type": "notice",
        "description": "Student council and school event announcements",
        "sort_order": 2,
        "write_permission": "admin",
    },
    {
        "name": "Event Album",
        "slug": "event-album",
        "category": "community",
        "board_type": "album",
        "description": "Photos and records from school and student council events",
        "sort_order": 10,
        "write_permission": "user",
    },
    {
        "name": "Lecture Reviews",
        "slug": "lecture-reviews",
        "category": "resources",
        "board_type": "resource",
        "description": "Lecture reviews and course experience sharing",
        "sort_order": 20,
        "write_permission": "user",
        "allow_anonymous": True,
    },
    {
        "name": "Exam Archive",
        "slug": "exam-archive",
        "category": "resources",
        "board_type": "resource",
        "description": "Exam materials and study resources",
        "sort_order": 21,
        "write_permission": "user",
        "allow_anonymous": True,
    },
    {
        "name": "Comprehensive Exam",
        "slug": "comprehensive-exam",
        "category": "resources",
        "board_type": "resource",
        "description": "Comprehensive exam information and preparation resources",
        "sort_order": 22,
        "write_permission": "user",
        "allow_anonymous": True,
    },
    {
        "name": "Club Activity Certification",
        "slug": "club-activity",
        "category": "participation",
        "board_type": "activity_certification",
        "description": "Club activity certification posts",
        "sort_order": 30,
        "write_permission": "user",
    },
    {
        "name": "Study Activity Certification",
        "slug": "study-activity",
        "category": "participation",
        "board_type": "activity_certification",
        "description": "Study group activity certification posts",
        "sort_order": 31,
        "write_permission": "user",
    },
    {
        "name": "Networking Activity Certification",
        "slug": "networking-activity",
        "category": "participation",
        "board_type": "activity_certification",
        "description": "Mentor networking activity certification posts",
        "sort_order": 32,
        "write_permission": "user",
    },
    {
        "name": "Student Council Activity History",
        "slug": "council-activity",
        "category": "council",
        "board_type": "activity_history",
        "description": "Student council activities and outcomes",
        "sort_order": 40,
        "write_permission": "admin",
    },
    {
        "name": "Accounting Link",
        "slug": "accounting",
        "category": "council",
        "board_type": "external_link",
        "description": "Accounting ledger and financial transparency links",
        "sort_order": 41,
        "write_permission": "admin",
    },
    {
        "name": "Suggestions",
        "slug": "suggestions",
        "category": "council",
        "board_type": "suggestion",
        "description": "Suggestions and official replies",
        "sort_order": 42,
        "write_permission": "user",
        "allow_anonymous": True,
    },
    {
        "name": "Mutual Aid",
        "slug": "mutual-aid",
        "category": "council",
        "board_type": "mutual_aid",
        "description": "Mutual aid notices and support information",
        "sort_order": 43,
        "write_permission": "admin",
    },
]


def seed_initial_data(db: Session) -> None:
    user = db.get(User, 1)
    if user is None:
        db.add(
            User(
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
        )
    elif user.password_hash == "temp_hash":
        user.password_hash = hash_password("password123")
        user.cohort = user.cohort or "72"

    target_slugs = {item["slug"] for item in BOARD_SEED_DATA}
    existing_boards = db.scalars(select(Board)).all()
    for board in existing_boards:
        if board.slug not in target_slugs:
            board.is_active = False

    for item in BOARD_SEED_DATA:
        board = db.scalar(select(Board).where(Board.slug == item["slug"]))
        values = {
            "name": item["name"],
            "category": item["category"],
            "board_type": item["board_type"],
            "description": item["description"],
            "sort_order": item["sort_order"],
            "allow_anonymous": item.get("allow_anonymous", False),
            "read_permission": item.get("read_permission", "guest"),
            "write_permission": item["write_permission"],
            "is_active": True,
        }
        if board is None:
            db.add(Board(slug=item["slug"], **values))
        else:
            for key, value in values.items():
                setattr(board, key, value)

    db.commit()

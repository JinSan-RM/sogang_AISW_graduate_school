from datetime import UTC, datetime

import pytest
from sqlalchemy import select

from app.models.audit import OperationalAuditLog
from app.models.post import Post
from app.models.registration import MajorOption
from app.models.user import User


def test_admin_edits_member_profile_without_changing_identity_or_author_snapshots(api):
    with api.session() as db:
        db.add(MajorOption(name="AI", sort_order=1, is_active=True))
        post = db.get(Post, 3)
        post.author_nickname_snapshot = "Original name"
        post.author_cohort_snapshot = "71"
        db.commit()
    payload = {
        "nickname": "  Member   Name  ", "cohort": "72", "major": "AI",
        "phone": "010-1234-5678", "company": "Campus", "job_title": "Engineer",
        "position": "Member", "enrollment_status": "leave",
    }
    response = api.client.put("/api/users/admin/users/1", headers=api.headers["admin"], json=payload)
    assert response.status_code == 200
    with api.session() as db:
        member = db.get(User, 1)
        assert member.nickname == "Member Name"
        assert member.cohort == "72" and member.major == "AI"
        assert member.phone == payload["phone"] and member.company == "Campus"
        assert member.job_title == "Engineer" and member.position == "Member"
        assert member.email == "owner@sogang.ac.kr" and member.role == "user"
        assert member.enrollment_status == "leave"
        post = db.get(Post, 3)
        assert (post.author_nickname_snapshot, post.author_cohort_snapshot) == ("Original name", "71")
        audit = db.scalar(select(OperationalAuditLog).where(OperationalAuditLog.action == "user.update"))
        assert set(audit.details["changed_fields"]) == set(payload)
        assert payload["phone"] not in str(audit.details)


@pytest.mark.parametrize("payload", [
    {"nickname": "  "}, {"nickname": None}, {"nickname": "x" * 51},
    {"cohort": "x" * 21}, {"phone": "x" * 21}, {"major": "Unknown major"},
    {"role": None}, {"is_active": None}, {"enrollment_status": None},
    {"email": "replacement@sogang.ac.kr"}, {"dues_status": "paid"},
])
def test_admin_rejects_invalid_profile_changes_atomically(api, payload):
    response = api.client.put("/api/users/admin/users/1", headers=api.headers["admin"], json=payload)
    assert response.status_code == 422
    with api.session() as db:
        assert db.get(User, 1).nickname == "Owner"
        assert db.scalar(select(OperationalAuditLog.id)) is None


def test_member_profile_update_is_admin_only_and_self_deactivation_stays_blocked(api):
    for headers in ({}, api.headers["owner"]):
        listed = api.client.get("/api/users/admin/users", headers=headers, params={"sort_by": "nickname"})
        assert listed.status_code in (401, 403)
        response = api.client.put("/api/users/admin/users/2", headers=headers, json={"nickname": "Edited"})
        assert response.status_code in (401, 403)
    response = api.client.put("/api/users/admin/users/3", headers=api.headers["admin"], json={"is_active": False})
    assert response.status_code == 400


def test_member_search_trims_keyword_and_filters_before_pagination(api):
    response = api.client.get("/api/users/admin/users", headers=api.headers["admin"], params={"q": "  Owner  ", "size": 1})
    assert response.status_code == 200
    assert [item["id"] for item in response.json()["data"]] == [1]
    assert response.json()["pagination"]["total"] == 1


def test_blank_optional_fields_clear_and_unchanged_save_does_not_log(api):
    with api.session() as db:
        member = db.get(User, 1)
        member.phone = "123"
        db.commit()
    for payload in ({"phone": "  "}, {"nickname": "Owner"}):
        response = api.client.put("/api/users/admin/users/1", headers=api.headers["admin"], json=payload)
        assert response.status_code == 200
    with api.session() as db:
        assert db.get(User, 1).phone is None
        assert len(db.scalars(select(OperationalAuditLog)).all()) == 1


def test_filtered_member_list_covers_every_page(api):
    with api.session() as db:
        owner = db.get(User, 1)
        db.add_all([User(username=f"paged{index}", email=f"paged{index}@sogang.ac.kr",
                         nickname=f"Paged Member {index}", cohort="73", password_hash=owner.password_hash,
                         is_active=index != 0) for index in range(25)])
        db.commit()
    pages = [api.client.get("/api/users/admin/users", headers=api.headers["admin"],
                            params={"q": " Paged Member ", "is_active": "true", "page": page, "size": 20}).json()
             for page in (1, 2)]
    assert [len(result["data"]) for result in pages] == [20, 4]
    assert all(result["pagination"]["total"] == 24 and result["pagination"]["total_pages"] == 2 for result in pages)
    assert len({member["id"] for result in pages for member in result["data"]}) == 24


@pytest.fixture
def sortable_accounts(api):
    accounts = [
        ("Zulu", " 10 ", "Beta", "leave", True, 3, 4),
        ("Alpha", "2", "Alpha", "graduated", True, 2, None),
        ("Delta", "1", "Delta", "active", True, 4, 5),
        ("Alpha", " 07 기 ", None, "active", True, 4, 3),
        ("Echo", None, "  ", "leave", False, 1, None),
        ("Bravo", "003", "alpha", "active", True, 2, 3),
    ]
    with api.session() as db:
        password_hash = db.get(User, 1).password_hash
        for user_id, (name, cohort, major, enrollment, active, created, last_login) in enumerate(accounts, 1):
            user = db.get(User, user_id)
            if user is None:
                user = User(
                    username=f"sort{user_id}", email=f"sort{user_id}@sogang.ac.kr", password_hash=password_hash,
                )
                db.add(user)
            user.nickname = f"Sort Member {name}"
            user.cohort = cohort
            user.major = major
            user.enrollment_status = enrollment
            user.is_active = active
            user.created_at = datetime(2026, 1, created, tzinfo=UTC)
            user.last_login_at = datetime(2026, 2, last_login, tzinfo=UTC) if last_login else None
            db.flush()
        db.commit()


@pytest.mark.parametrize(("sort_by", "direction", "expected_ids"), [
    ("nickname", None, [2, 4, 6, 3, 5, 1]),
    ("email", "desc", [6, 5, 4, 1, 2, 3]),
    ("cohort", "asc", [3, 2, 6, 4, 1, 5]),
    ("cohort", "desc", [1, 4, 6, 2, 3, 5]),
    ("major", "asc", [2, 6, 1, 3, 4, 5]),
    ("major", "desc", [3, 1, 2, 6, 4, 5]),
    ("enrollment_status", "asc", [3, 4, 6, 1, 5, 2]),
    ("enrollment_status", "desc", [2, 1, 5, 3, 4, 6]),
    ("is_active", "asc", [1, 2, 3, 4, 6, 5]),
    ("is_active", "desc", [5, 1, 2, 3, 4, 6]),
    ("created_at", "asc", [5, 2, 6, 1, 3, 4]),
    ("created_at", "desc", [4, 3, 1, 6, 2, 5]),
    ("last_login_at", "asc", [4, 6, 1, 3, 2, 5]),
    ("last_login_at", "desc", [3, 1, 4, 6, 2, 5]),
])
def test_admin_member_sorts_across_pages(api, sortable_accounts, sort_by, direction, expected_ids):
    params = {"sort_by": sort_by, "q": "Sort Member", "size": 2}
    if direction is not None:
        params["sort_direction"] = direction
    returned_ids = []
    for page in (1, 2, 3):
        response = api.client.get(
            "/api/users/admin/users", headers=api.headers["admin"], params={**params, "page": page},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"] == {"page": page, "size": 2, "total": 6, "total_pages": 3}
        returned_ids.extend(item["id"] for item in data["data"])
    assert returned_ids == expected_ids


def test_admin_member_sort_respects_filters_before_pagination(api, sortable_accounts):
    params = {"q": "Sort Member", "role": "user", "is_active": "true", "sort_by": "nickname", "size": 2}
    for page, expected_ids in ((1, [2, 4]), (2, [6, 1])):
        response = api.client.get(
            "/api/users/admin/users", headers=api.headers["admin"], params={**params, "page": page},
        )
        assert response.status_code == 200
        assert response.json()["pagination"]["total"] == 4
        assert [item["id"] for item in response.json()["data"]] == expected_ids


def test_admin_member_default_order_is_newest_then_latest_id(api, sortable_accounts):
    response = api.client.get("/api/users/admin/users", headers=api.headers["admin"])
    assert response.status_code == 200
    assert [item["id"] for item in response.json()["data"]] == [4, 3, 1, 6, 2, 5]


def test_admin_member_cohort_sort_handles_non_numeric_and_long_legacy_values(api, sortable_accounts):
    with api.session() as db:
        db.get(User, 1).cohort = "기수 미상"
        db.get(User, 2).cohort = " "
        db.get(User, 3).cohort = "99999999999999999998"
        db.get(User, 4).cohort = "99999999999999999999"
        db.commit()
    response = api.client.get(
        "/api/users/admin/users", headers=api.headers["admin"],
        params={"sort_by": "cohort", "sort_direction": "desc"},
    )
    assert response.status_code == 200
    assert [item["id"] for item in response.json()["data"]] == [4, 3, 6, 1, 2, 5]


@pytest.mark.parametrize("params", [{"sort_by": "role"}, {"sort_by": "nickname", "sort_direction": "up"}])
def test_admin_member_rejects_unsupported_sort(api, params):
    response = api.client.get("/api/users/admin/users", headers=api.headers["admin"], params=params)
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_inactive_major_rejects_entire_update_and_legacy_major_can_be_retained(api):
    with api.session() as db:
        db.add(MajorOption(name="Retired", is_active=False))
        db.get(User, 1).major = "Legacy"
        db.commit()
    rejected = api.client.put("/api/users/admin/users/1", headers=api.headers["admin"],
                              json={"nickname": "Changed", "major": "Retired"})
    assert rejected.status_code == 422
    with api.session() as db:
        assert db.get(User, 1).nickname == "Owner"
        assert db.scalar(select(OperationalAuditLog.id)) is None
    accepted = api.client.put("/api/users/admin/users/1", headers=api.headers["admin"],
                              json={"nickname": "Changed", "major": "Legacy"})
    assert accepted.status_code == 200

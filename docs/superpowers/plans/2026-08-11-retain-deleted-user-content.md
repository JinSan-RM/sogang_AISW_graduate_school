# Retain Deleted User Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회원 탈퇴 후에도 작성 당시의 이름·기수 표시와 모든 게시글, 댓글, 상조회 정보 및 연결 첨부파일을 그대로 보존하면서 로그인 가능한 계정과 계정 전용 활동 데이터만 삭제한다.

**Architecture:** `posts`와 `comments`에 작성 당시 이름·기수 스냅샷을 저장하고 모든 작성자 표시 API가 활성 사용자 조인보다 스냅샷을 안전한 대체값으로 사용한다. 계정 삭제 트랜잭션은 모든 콘텐츠의 `author_id`와 연결 첨부 미디어의 `owner_id`만 끊고 콘텐츠·확장정보·첨부파일은 유지하며, 익명 표시와 상조회 증빙의 관리자 전용 접근 정책은 그대로 적용한다.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL, pytest, React Native/Expo, TypeScript, Node test runner with `tsx`

## Global Constraints

- 회원 계정 행, 비밀번호, 이메일, 인증 토큰, 세션, 푸시 토큰, 알림 설정, 검색 기록, 차단 관계, 좋아요, 북마크 및 신고 이력은 기존 계정 삭제 정책대로 제거한다.
- 공개, 비공개, 임시저장, 숨김, 삭제 상태 및 상조회 게시글과 그 댓글은 계정 삭제만을 이유로 삭제하지 않는다.
- `post_suggestions`, `post_mutual_aid`, `post_attachments` 등 보존 게시글의 종속 행과 연결된 미디어 파일·메타데이터·원본 파일명은 유지한다.
- 게시글에 연결되지 않은 미완료 또는 임시 업로드는 콘텐츠가 아니므로 기존처럼 삭제한다.
- 탈퇴 후 `posts.author_id`, `comments.author_id`, 보존 미디어의 `media_assets.owner_id`는 `NULL`로 만들어 삭제된 계정과의 관계를 끊는다.
- 작성자 스냅샷은 작성 당시 `users.nickname`과 `users.cohort`만 저장한다. 이메일, 전화번호, 전공, 회사, 계좌번호는 스냅샷에 포함하지 않는다.
- 익명 글과 강의후기처럼 강제 익명인 글은 비관리자에게 계속 `Anonymous`와 빈 기수로 표시한다. 관리자는 작성자 스냅샷을 볼 수 있다.
- 상조회 증빙 파일과 `proof_url`은 탈퇴 후에도 보존하지만 관리자만 조회·열기·다운로드할 수 있다. 다른 회원의 직접 ID 접근은 `404 NOT_FOUND`를 유지한다.
- 탈퇴 계정은 보존된 글·댓글의 수정·삭제 권한을 다시 얻지 못한다. 동일 이메일 재가입은 새 계정이며 이전 콘텐츠의 소유권을 승계하지 않는다.
- 계정 삭제와 별개인 사용자의 개별 게시물 삭제, 관리자 조치 및 상조회 증빙의 정기 파기 정책은 그대로 유지한다.
- 기존에 이미 탈퇴하여 작성자 정보와 비공개 콘텐츠가 물리 삭제된 데이터는 백업이나 레거시 원본 없이 추측해 복구하지 않는다.
- 모든 변경은 테스트 주도 방식으로 진행하며 각 집중 테스트가 기존 코드에서 예상한 이유로 실패하는 것을 확인한 뒤 구현한다.

---

### Task 1: 작성자 스냅샷 스키마와 마이그레이션 추가

**Files:**
- Create: `backend/alembic/versions/0025_author_content_snapshots.py`
- Create: `backend/tests/test_author_content_snapshots_migration.py`
- Modify: `backend/app/models/post.py`
- Modify: `backend/app/models/comment.py`

**Interfaces:**
- Consumes: 현재 Alembic head `0024_faq_attachments`, `users.nickname`, `users.cohort`, `posts.author_id`, `comments.author_id`
- Produces: `Post.author_nickname_snapshot`, `Post.author_cohort_snapshot`, `Comment.author_nickname_snapshot`, `Comment.author_cohort_snapshot`

- [ ] **Step 1: 마이그레이션 실패 테스트 작성**

`backend/tests/test_author_content_snapshots_migration.py`에서 SQLite 메모리 DB에 최소 `users`, `posts`, `comments` 테이블과 연결된 사용자/콘텐츠를 만든 뒤 마이그레이션 모듈을 로드한다.

```py
def test_author_snapshot_migration_backfills_and_downgrades() -> None:
    migration = _load_migration()
    assert migration.down_revision == "0024_faq_attachments"

    with engine.begin() as connection:
        migration.op = Operations(MigrationContext.configure(connection))
        migration.upgrade()
        post = connection.execute(
            sa.text(
                "SELECT author_nickname_snapshot, author_cohort_snapshot "
                "FROM posts WHERE id = 10"
            )
        ).one()
        comment = connection.execute(
            sa.text(
                "SELECT author_nickname_snapshot, author_cohort_snapshot "
                "FROM comments WHERE id = 20"
            )
        ).one()
        assert tuple(post) == ("홍길동", "72")
        assert tuple(comment) == ("홍길동", "72")

        migration.downgrade()
        post_columns = {column["name"] for column in sa.inspect(connection).get_columns("posts")}
        assert "author_nickname_snapshot" not in post_columns
```

마지막 컬럼 검사는 `column["name"]` 목록으로 비교해 SQLAlchemy inspector 결과 구조를 정확히 사용한다.

- [ ] **Step 2: 실패 상태 확인**

Run from `backend`:

```text
pytest tests/test_author_content_snapshots_migration.py -q
```

Expected: `0025_author_content_snapshots.py`가 없어 테스트가 실패한다.

- [ ] **Step 3: Alembic 마이그레이션 구현**

`upgrade()`에서 네 개의 nullable 컬럼을 추가하고 현재 사용자 연결이 남아 있는 행을 상관 서브쿼리로 역채움한다.

```py
revision = "0025_author_content_snapshots"
down_revision = "0024_faq_attachments"

def upgrade() -> None:
    op.add_column("posts", sa.Column("author_nickname_snapshot", sa.String(50), nullable=True))
    op.add_column("posts", sa.Column("author_cohort_snapshot", sa.String(20), nullable=True))
    op.add_column("comments", sa.Column("author_nickname_snapshot", sa.String(50), nullable=True))
    op.add_column("comments", sa.Column("author_cohort_snapshot", sa.String(20), nullable=True))
    op.execute(sa.text("""
        UPDATE posts
        SET author_nickname_snapshot = (SELECT nickname FROM users WHERE users.id = posts.author_id),
            author_cohort_snapshot = (SELECT cohort FROM users WHERE users.id = posts.author_id)
        WHERE author_id IS NOT NULL
    """))
    op.execute(sa.text("""
        UPDATE comments
        SET author_nickname_snapshot = (SELECT nickname FROM users WHERE users.id = comments.author_id),
            author_cohort_snapshot = (SELECT cohort FROM users WHERE users.id = comments.author_id)
        WHERE author_id IS NOT NULL
    """))
```

`downgrade()`는 comments의 두 컬럼, posts의 두 컬럼 순서로 제거한다.

- [ ] **Step 4: SQLAlchemy 모델 정렬**

```py
# backend/app/models/post.py
author_nickname_snapshot: Mapped[str | None] = mapped_column(String(50))
author_cohort_snapshot: Mapped[str | None] = mapped_column(String(20))

# backend/app/models/comment.py
author_nickname_snapshot: Mapped[str | None] = mapped_column(String(50))
author_cohort_snapshot: Mapped[str | None] = mapped_column(String(20))
```

두 필드는 `author_id` 바로 다음에 배치한다.

- [ ] **Step 5: 마이그레이션 집중 검증**

Run from `backend`:

```text
pytest tests/test_author_content_snapshots_migration.py -q
python -m compileall app alembic
```

Expected: 마이그레이션 테스트가 통과하고 compileall이 exit 0이다.

- [ ] **Step 6: 첫 번째 커밋**

```text
git add backend/alembic/versions/0025_author_content_snapshots.py backend/app/models/post.py backend/app/models/comment.py backend/tests/test_author_content_snapshots_migration.py
git diff --cached --check
git commit -m "feat: add content author snapshots"
```

---

### Task 2: 신규·레거시 콘텐츠에 작성 당시 이름과 기수 저장

**Files:**
- Create: `backend/tests/test_author_content_snapshots.py`
- Modify: `backend/app/routers/posts.py`
- Modify: `backend/app/routers/comments.py`
- Modify: `backend/app/legacy_import.py`
- Modify: `backend/tests/test_legacy_import.py`

**Interfaces:**
- Consumes: Task 1의 네 스냅샷 모델 필드
- Produces: 모든 신규 게시글·댓글과 재실행 가능한 레거시 가져오기 결과에 채워진 작성자 스냅샷

- [ ] **Step 1: 신규 글·댓글 스냅샷 실패 테스트 작성**

API fixture의 owner 사용자 기수를 명시한 후 일반 게시글과 댓글을 생성하고 DB 값을 직접 확인한다.

```py
def test_new_post_and_comment_capture_author_name_and_cohort(api) -> None:
    with api.session() as db:
        owner = db.get(User, 1)
        owner.nickname = "홍길동"
        owner.cohort = "72"
        db.commit()

    created_post = api.client.post(
        "/api/boards/2/posts",
        json={"title": "원문 제목", "content": "원문 본문", "attachment_ids": []},
        headers=api.headers["owner"],
    )
    post_id = created_post.json()["data"]["id"]
    created_comment = api.client.post(
        f"/api/posts/{post_id}/comments",
        json={"content": "원문 댓글"},
        headers=api.headers["owner"],
    )

    with api.session() as db:
        post = db.get(Post, post_id)
        comment = db.get(Comment, created_comment.json()["data"]["id"])
        assert (post.author_nickname_snapshot, post.author_cohort_snapshot) == ("홍길동", "72")
        assert (comment.author_nickname_snapshot, comment.author_cohort_snapshot) == ("홍길동", "72")
```

- [ ] **Step 2: 실패 상태 확인**

Run from `backend`:

```text
pytest tests/test_author_content_snapshots.py::test_new_post_and_comment_capture_author_name_and_cohort -q
```

Expected: create 경로가 스냅샷 값을 쓰지 않아 assertion이 실패한다.

- [ ] **Step 3: API 생성 경로 구현**

```py
post = Post(
    board_id=board_id,
    author_id=current_user.id,
    author_nickname_snapshot=current_user.nickname,
    author_cohort_snapshot=current_user.cohort,
    title=payload.title,
    content="" if board.board_type == "album" else payload.content,
    is_anonymous=is_anonymous,
    is_notice=board.board_type == "notice",
    category=None if board.board_type == "album" else payload.category,
    metadata_json=payload.metadata,
    deadline_at=payload.deadline_at if board.board_type == "notice" else None,
)

comment = Comment(
    post_id=post_id,
    author_id=current_user.id,
    author_nickname_snapshot=current_user.nickname,
    author_cohort_snapshot=current_user.cohort,
    parent_id=payload.parent_id,
    content=payload.content,
)
```

- [ ] **Step 4: 레거시 import의 생성·갱신 경로 구현**

`_post_payload()` 반환값에 아래 값을 포함하고 comment 생성 시에도 동일한 author 값을 기록한다.

```py
"author_nickname_snapshot": author.nickname,
"author_cohort_snapshot": author.cohort,
```

기존 레거시 post/comment를 재처리할 때 snapshot이 비어 있으면 채우되 제목, 본문, 작성일, 반응 수는 기존 재실행 보존 규칙을 유지한다. `backend/tests/test_legacy_import.py`의 재실행 테스트에 snapshot assertion을 추가한다.

- [ ] **Step 5: 집중 테스트 통과 확인**

Run from `backend`:

```text
pytest tests/test_author_content_snapshots.py tests/test_legacy_import.py -q
```

Expected: 신규와 레거시 콘텐츠가 모두 작성자 이름·기수 스냅샷을 저장한다.

- [ ] **Step 6: 두 번째 커밋**

```text
git add backend/app/routers/posts.py backend/app/routers/comments.py backend/app/legacy_import.py backend/tests/test_author_content_snapshots.py backend/tests/test_legacy_import.py
git diff --cached --check
git commit -m "feat: capture content author identity"
```

---

### Task 3: 모든 작성자 표시 API에서 탈퇴자 스냅샷 사용

**Files:**
- Create: `backend/app/author_snapshots.py`
- Modify: `backend/tests/test_author_content_snapshots.py`
- Modify: `backend/app/account_deletion.py`
- Modify: `backend/app/routers/posts.py`
- Modify: `backend/app/routers/comments.py`
- Modify: `backend/app/routers/search.py`
- Modify: `backend/app/routers/users.py`
- Modify: `backend/app/routers/reports.py`

**Interfaces:**
- Consumes: live `User.nickname/cohort`와 Task 1의 snapshot 필드
- Produces: `resolve_author_snapshot(...) -> AuthorSnapshot` 및 기존 API의 `author_nickname`, `author_cohort` 응답

- [ ] **Step 1: 탈퇴자 표시와 익명 우선순위 실패 테스트 작성**

`backend/tests/test_author_content_snapshots.py`에 작성자 연결이 없는 post/comment를 만들고 다음을 검증한다.

```py
def test_orphaned_content_uses_snapshot_across_member_surfaces(api) -> None:
    with api.session() as db:
        post = db.get(Post, 3)
        post.author_id = None
        post.author_nickname_snapshot = "홍길동"
        post.author_cohort_snapshot = "72"
        comment = db.get(Comment, 1)
        comment.author_id = None
        comment.author_nickname_snapshot = "홍길동"
        comment.author_cohort_snapshot = "72"
        db.commit()

    detail = api.client.get("/api/posts/3", headers=api.headers["other"]).json()["data"]
    comments = api.client.get("/api/posts/1/comments", headers=api.headers["other"]).json()["data"]
    assert (detail["author_nickname"], detail["author_cohort"]) == ("홍길동", "72")
    assert (comments[0]["author_nickname"], comments[0]["author_cohort"]) == ("홍길동", "72")
```

같은 파일에 board list, global search, bookmark activity, admin post list, post report target, comment report target을 검증하는 table-driven assertion을 추가한다. 익명 게시글은 비관리자에게 `Anonymous`, 관리자에게 `홍길동/72`가 표시되는 별도 테스트로 보호한다.

- [ ] **Step 2: 실패 상태 확인**

Run from `backend`:

```text
pytest tests/test_author_content_snapshots.py -q
```

Expected: 현재 `Deleted user`와 `author_cohort = null`을 반환하여 실패한다.

- [ ] **Step 3: 공통 snapshot 해석기 구현**

`DELETED_USER_NICKNAME`을 `backend/app/author_snapshots.py`로 이동하고 다음 인터페이스를 제공한다.

```py
from dataclasses import dataclass

DELETED_USER_NICKNAME = "Deleted user"

@dataclass(frozen=True)
class AuthorSnapshot:
    nickname: str
    cohort: str | None

def resolve_author_snapshot(
    *,
    live_nickname: str | None,
    live_cohort: str | None,
    snapshot_nickname: str | None,
    snapshot_cohort: str | None,
) -> AuthorSnapshot:
    if live_nickname is not None:
        return AuthorSnapshot(live_nickname, live_cohort)
    return AuthorSnapshot(snapshot_nickname or DELETED_USER_NICKNAME, snapshot_cohort)
```

`account_deletion.py`와 기존 router의 상수 import를 새 모듈로 변경한다.

- [ ] **Step 4: post list/detail/admin list 응답 변경**

`_post_author_nickname()`과 `_post_author_cohort()`는 `author_id is None`만으로 `Deleted user`를 반환하지 않고 snapshot 해석 결과를 사용한다. 순서는 다음과 같다.

1. 비관리자 익명 표시가 필요한지 검사한다.
2. 익명이면 `Anonymous`, `cohort=None`을 반환한다.
3. 익명이 아니면 live user 또는 snapshot을 반환한다.
4. snapshot도 없는 과거 orphan만 `Deleted user`로 표시한다.

관리자 post list도 동일한 helper를 사용해 조인된 사용자가 없을 때 snapshot으로 대체한다.

- [ ] **Step 5: comment/search/activity/report 응답 변경**

- `comments.py`: 각 `Comment`의 snapshot 필드를 fallback으로 사용한다.
- `search.py`: 표시 fallback을 적용하고 비익명 검색에서는 `Post.author_nickname_snapshot.ilike(keyword)`도 검색 조건에 포함한다.
- `users.py`: bookmark activity의 작성자 표시를 snapshot으로 대체한다.
- `reports.py`: post/comment target의 작성자 표시를 snapshot으로 대체한다.
- 작성자 ID는 탈퇴 콘텐츠에서 계속 `null`로 반환한다.

- [ ] **Step 6: 집중 테스트 통과 확인**

Run from `backend`:

```text
pytest tests/test_author_content_snapshots.py tests/test_post_privacy.py tests/test_account_deletion.py -q
```

Expected: 스냅샷 표시 테스트와 익명/권한 회귀 테스트가 모두 통과한다.

- [ ] **Step 7: 세 번째 커밋**

```text
git add backend/app/author_snapshots.py backend/app/account_deletion.py backend/app/routers/posts.py backend/app/routers/comments.py backend/app/routers/search.py backend/app/routers/users.py backend/app/routers/reports.py backend/tests/test_author_content_snapshots.py
git diff --cached --check
git commit -m "feat: display retained author identity"
```

---

### Task 4: 계정 삭제 시 모든 콘텐츠와 연결 첨부 보존

**Files:**
- Modify: `backend/app/account_deletion.py`
- Modify: `backend/tests/test_account_deletion.py`
- Modify: `backend/tests/test_media_security_and_migrations.py`

**Interfaces:**
- Consumes: snapshot 모델 필드, 기존 계정 삭제 트랜잭션, `PostAttachment`와 `MediaAsset`
- Produces: 계정 행은 삭제되지만 모든 작성 콘텐츠와 연결 미디어가 유지되는 `delete_user_account(...)`

- [ ] **Step 1: 전체 콘텐츠 보존 실패 테스트로 기존 기대값 교체**

`backend/tests/test_account_deletion.py` fixture에 다음 데이터를 포함한다.

- published public post/comment
- draft post/comment
- hidden post/comment
- mutual-aid post, `PostMutualAid`, `metadata.proof_url`, private PDF evidence
- 각 행의 snapshot 이름 `홍길동`, 기수 `72`

계정 삭제 후 다음을 assertion한다.

```py
assert db.get(User, 1) is None
for post_id in (public_post_id, draft_post_id, hidden_post_id, mutual_aid_post_id):
    post = db.get(Post, post_id)
    assert post is not None
    assert post.author_id is None
    assert (post.author_nickname_snapshot, post.author_cohort_snapshot) == ("홍길동", "72")

assert db.get(PostMutualAid, mutual_aid_post_id) is not None
assert db.get(Post, mutual_aid_post_id).metadata_json["proof_url"] == "https://example.com/evidence"
assert private_file.read_bytes() == b"private evidence"
assert db.get(MediaAsset, private_media_id).owner_id is None
assert db.get(MediaAsset, private_media_id).original_filename == "evidence.pdf"
```

모든 원문 title/content/comment content/status/category/metadata가 삭제 전 값과 같은지도 literal 값으로 검증한다.

- [ ] **Step 2: 실패 상태 확인**

Run from `backend`:

```text
pytest tests/test_account_deletion.py::test_authenticated_account_deletion_preserves_all_authored_content -q
```

Expected: 현재 로직이 private/draft/hidden/mutual-aid post, comments, private media를 삭제하여 실패한다.

- [ ] **Step 3: 계정 삭제 대상 분류 변경**

`delete_user_account()`에서 public/private post 분류와 콘텐츠 삭제 분기를 제거하고 다음 집합을 사용한다.

```py
authored_posts = db.scalars(
    select(Post).where(Post.author_id == user.id).with_for_update()
).all()
authored_comments = db.scalars(
    select(Comment).where(Comment.author_id == user.id).with_for_update()
).all()
linked_owned_media_ids = set(db.scalars(
    select(PostAttachment.media_id)
    .join(MediaAsset, MediaAsset.id == PostAttachment.media_id)
    .where(MediaAsset.owner_id == user.id)
).all())
```

각 post/comment의 비어 있는 snapshot을 user의 nickname/cohort로 채운 후 `author_id=None`으로 바꾼다. post, comment, `PostMutualAid`, `PostSuggestion`, `PostAttachment` 행은 삭제하지 않는다.

`AccountDeletionResult`의 내부 집계 필드는 실제 의미에 맞춰 `retained_posts`, `retained_comments`, `retained_attached_media`, `deleted_unattached_media`로 바꾼다. 외부 API는 이 집계를 노출하지 않으므로 기존 `deleted`, `receipt_id`, `completed_at` 응답은 그대로 유지한다.

- [ ] **Step 4: 연결 미디어 보존과 미연결 업로드 정리 구현**

- 작성자가 소유한 media 중 어느 post에든 연결된 것은 `owner_id=None`만 적용하고 원본 파일명과 파일을 유지한다.
- 상조회 private evidence도 동일하게 보존한다.
- 어느 post에도 연결되지 않은 작성자 소유 media만 기존 staged-file rollback 절차로 삭제한다.
- `deleted_media_ids` 계산은 `owned_media - all_linked_owned_media`로 제한한다.
- 계정 삭제 중 filesystem 오류가 발생하면 DB rollback과 staged-file 복구가 계속 동작해야 한다.

- [ ] **Step 5: 탈퇴 후 접근권한 회귀 테스트 추가**

`backend/tests/test_media_security_and_migrations.py`에서 탈퇴 후 private mutual-aid evidence에 대해 다음을 검증한다.

```py
assert api.client.get(access_path, headers=api.headers["other"]).status_code == 404
admin_access = api.client.get(access_path, headers=api.headers["admin"])
assert admin_access.status_code == 200
assert _signed_file_response(api, admin_access).content == PDF_BYTES
```

draft/hidden 콘텐츠는 삭제되지 않았지만 일반 회원에게는 기존 권한 정책대로 노출되지 않고 관리자만 열 수 있어야 한다.

- [ ] **Step 6: 계정 전용 데이터 삭제 회귀 확인**

기존 테스트의 세션, 토큰, 좋아요, 북마크, 신고, 검색기록, 차단, 알림, 푸시 이력 삭제 assertion은 유지한다. API 응답의 `deleted`, `receipt_id`, `completed_at` 구조도 변경하지 않는다.

- [ ] **Step 7: 집중 테스트 통과 확인**

Run from `backend`:

```text
pytest tests/test_account_deletion.py tests/test_media_security_and_migrations.py tests/test_post_privacy.py -q
```

Expected: 모든 콘텐츠 보존, 계정 전용 데이터 삭제, private evidence 관리자 전용 접근 및 rollback 테스트가 모두 통과한다.

- [ ] **Step 8: 네 번째 커밋**

```text
git add backend/app/account_deletion.py backend/tests/test_account_deletion.py backend/tests/test_media_security_and_migrations.py
git diff --cached --check
git commit -m "fix: retain content after account deletion"
```

---

### Task 5: API 계약, 운영계획 및 탈퇴 화면 안내 정렬

**Files:**
- Modify: `PLAN.md`
- Modify: `CODEX.md`
- Modify: `docs/phase2/DB_SCHEMA_DECISIONS.md`
- Modify: `docs/phase2/AUTH_PERMISSION_SPEC.md`
- Modify: `docs/phase2/API_CONTRACT.md`
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- Modify: `frontend/utils/accountDeletion.ts`
- Modify: `frontend/utils/privacyPolicy.ts`
- Modify: `frontend/app/legal/account-deletion.tsx`
- Modify: `frontend/tests/accountDeletion.test.ts`

**Interfaces:**
- Consumes: Tasks 1-4에서 확정된 실제 보존 정책
- Produces: 앱 안내, 개인정보 처리방침, API/DB/권한 계약이 동일하게 설명하는 탈퇴 정책

- [ ] **Step 1: 탈퇴 안내 문구 실패 테스트 작성**

`frontend/tests/accountDeletion.test.ts`에서 다음 의미를 literal 문구로 검증한다.

```ts
assert.match(ACCOUNT_RETENTION_NOTICE, /게시글과 댓글/);
assert.match(ACCOUNT_RETENTION_NOTICE, /이름과 기수/);
assert.match(ACCOUNT_RETENTION_NOTICE, /상조회 증빙자료/);
assert.doesNotMatch(ACCOUNT_DELETION_ITEMS.join(" "), /비공개 게시글.*삭제/);
```

- [ ] **Step 2: 실패 상태 확인**

Run from `frontend`:

```text
npx tsx --test tests/accountDeletion.test.ts
```

Expected: 현재 안내가 비공개 게시글과 증빙 파일 삭제 및 공개 작성자 익명화를 설명하여 실패한다.

- [ ] **Step 3: 프론트 탈퇴 안내와 완료 화면 수정**

`ACCOUNT_DELETION_ITEMS`는 계정 자격정보, 인증/세션, 개인 활동기록이 삭제된다고 설명한다. `ACCOUNT_RETENTION_NOTICE`는 아래 정책을 명시한다.

```ts
export const ACCOUNT_RETENTION_NOTICE =
  "작성한 게시글과 댓글은 공개 여부와 관계없이 작성 당시의 이름과 기수로 유지됩니다. 상조회 신청과 연결 증빙자료도 유지되며 증빙자료는 관리자만 열람할 수 있습니다. 탈퇴 후에는 해당 콘텐츠를 수정하거나 삭제할 수 없습니다.";
```

`frontend/app/legal/account-deletion.tsx` 완료 문구도 계정은 삭제됐지만 콘텐츠와 작성자 표시는 유지된다고 변경한다.

- [ ] **Step 4: 개인정보 처리방침과 계약 문서 수정**

- `PLAN.md`: public/private/mutual-aid 삭제 문구를 모든 작성 콘텐츠 보존과 관계키 해제로 교체한다.
- `DB_SCHEMA_DECISIONS.md`: 네 snapshot 컬럼을 역사적 표시를 위한 허용된 denormalization으로 기록한다.
- `AUTH_PERMISSION_SPEC.md`: 탈퇴자는 snapshot으로 표시되고 모든 상태의 콘텐츠가 남으며, 계정 소유 권한은 사라진다고 명시한다.
- `API_CONTRACT.md`: `DELETE /users/me` 규칙과 post/comment/search/activity 응답의 탈퇴 작성자 이름·기수 동작을 갱신한다.
- `FRONTEND_ROUTE_SPEC.md`: 탈퇴 화면 안내와 보존 콘텐츠 접근 규칙을 갱신한다.
- `privacyPolicy.ts`: 계정 탈퇴 시 게시글·댓글·상조회 신청·연결 첨부가 유지되고 이름·기수가 표시된다는 문구를 명확히 한다. 상조회 증빙의 관리자 전용 열람과 연말 정기 파기 규칙은 유지한다.
- `CODEX.md`: 구현과 검증이 완료된 시점에 완료 항목과 정확한 테스트 수를 기록한다.

- [ ] **Step 5: 문구 테스트와 타입 검사**

Run from `frontend`:

```text
npx tsx --test tests/accountDeletion.test.ts
npm run typecheck
```

Expected: 안내 테스트와 TypeScript 검사가 모두 통과한다.

- [ ] **Step 6: 다섯 번째 커밋**

```text
git add PLAN.md CODEX.md docs/phase2/DB_SCHEMA_DECISIONS.md docs/phase2/AUTH_PERMISSION_SPEC.md docs/phase2/API_CONTRACT.md docs/phase2/FRONTEND_ROUTE_SPEC.md frontend/utils/accountDeletion.ts frontend/utils/privacyPolicy.ts frontend/app/legal/account-deletion.tsx frontend/tests/accountDeletion.test.ts
git diff --cached --check
git commit -m "docs: align retained content policy"
```

---

### Task 6: 기존 데이터 감사, 전체 검증 및 PostgreSQL 마이그레이션 리허설

**Files:**
- Modify: `OPERATIONS.md`
- Modify: `docs/superpowers/plans/2026-08-11-retain-deleted-user-content.md`

**Interfaces:**
- Consumes: Tasks 1-5의 schema, API, 탈퇴 처리 및 문서
- Produces: 기존 orphan 데이터 현황, 복원 가능 범위, 전체 회귀 및 배포 전 migration 증거

- [ ] **Step 1: 기존 snapshot 누락 감사 쿼리 문서화**

`OPERATIONS.md`에 배포 전후 실행할 PostgreSQL 쿼리를 추가한다.

```sql
SELECT 'posts' AS entity, count(*) AS missing_snapshot
FROM posts
WHERE author_id IS NULL AND author_nickname_snapshot IS NULL
UNION ALL
SELECT 'comments' AS entity, count(*) AS missing_snapshot
FROM comments
WHERE author_id IS NULL AND author_nickname_snapshot IS NULL;
```

결과가 0보다 크면 해당 ID 목록을 별도 암호화된 운영 산출물로 내보낸다. `posts.metadata->>'legacy_author'`와 `legacy_author_cohort`가 있는 post는 그 값으로만 복원할 수 있다. 그 외 행과 comments는 탈퇴 전 DB 백업에서 content ID 기준으로 확인되는 경우에만 snapshot을 채우며 이름을 추측하지 않는다.

- [ ] **Step 2: 이미 삭제된 비공개 콘텐츠의 복구 가능성 확인**

현재 DB에서 물리 삭제된 post/comment/media는 snapshot migration으로 복구되지 않는다. QA/운영 백업에서 다음 세 조건을 모두 만족할 때만 별도 복구 작업을 수행한다.

1. 원래 content ID와 board ID를 확인할 수 있다.
2. 원문과 첨부파일 checksum을 확인할 수 있다.
3. 현재 동일 ID와 충돌하지 않는다.

조건을 만족하지 않으면 누락 건수와 이유를 운영 기록에 남기고 신규 탈퇴부터 보존 정책을 적용한다.

- [ ] **Step 3: 전체 backend 검증**

Run from `backend`:

```text
pytest -q
python -m compileall app alembic
alembic heads
alembic current
```

Expected: 모든 pytest가 통과하고 compileall이 exit 0이며 Alembic head가 `0025_author_content_snapshots` 하나다.

- [ ] **Step 4: 전체 frontend 검증**

Run from `frontend`:

```text
npm test
npm run typecheck
```

Expected: 모든 frontend test가 통과하고 TypeScript 검사가 exit 0이다.

- [ ] **Step 5: PostgreSQL migration 리허설**

격리된 QA용 PostgreSQL DB에서 다음 순서로 실행한다.

```text
alembic upgrade 0024_faq_attachments
alembic upgrade 0025_author_content_snapshots
alembic downgrade 0024_faq_attachments
alembic upgrade 0025_author_content_snapshots
```

각 단계에서 post/comment snapshot 컬럼과 backfill 값을 조회하고, 마지막 단계에서 애플리케이션 시작 및 계정 삭제 API smoke test를 실행한다. 운영 DB에는 downgrade를 실행하지 않는다.

- [ ] **Step 6: 최종 diff 검토**

Run from repository root:

```text
git diff --check
git status --short
git diff --stat
```

Expected: 계획된 backend, frontend, docs, migration 파일만 변경됐고 기존 미추적 사용자 문서는 포함되지 않는다.

- [ ] **Step 7: 검증 기록과 계획 상태 커밋**

실제 실행한 테스트 수와 PostgreSQL 리허설 결과를 `CODEX.md`, `PLAN.md`, 이 계획 파일의 해당 체크박스에 기록한 뒤 커밋한다.

```text
git add OPERATIONS.md PLAN.md CODEX.md docs/superpowers/plans/2026-08-11-retain-deleted-user-content.md
git diff --cached --check
git commit -m "test: verify retained account content"
```

---

## 완료 조건

- 탈퇴 직전과 직후의 모든 post/comment 원문, 상태, metadata, extension row, attachment relation 및 첨부 파일 checksum이 동일하다.
- 탈퇴 후 모든 비익명 post/comment가 작성 당시 이름과 기수를 반환한다.
- 익명·강제익명 콘텐츠는 비관리자에게 계속 익명으로 표시된다.
- 상조회 증빙은 보존되며 관리자만 접근할 수 있다.
- 탈퇴 계정의 인증정보와 계정 전용 활동 데이터는 삭제되고 기존 토큰으로 접근할 수 없다.
- 이미 정보가 사라진 orphan 콘텐츠는 백업·레거시 근거 없이 임의 복원되지 않는다.
- Alembic 단일 head, backend 전체 테스트, frontend 전체 테스트·typecheck 및 PostgreSQL upgrade/downgrade rehearsal이 모두 통과한다.

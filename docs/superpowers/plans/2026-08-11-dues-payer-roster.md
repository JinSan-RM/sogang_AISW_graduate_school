# 원우회비 납부자 명부 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회원 계정과 분리된 원우회비 납부자 명부를 관리자가 엑셀로 upsert하고, 지원금 활동 인증의 참가자 입력란이 해당 명부만 검색·검증하도록 변경한다.

**Architecture:** PostgreSQL의 `dues_payers` 테이블과 원우회비 전용 FastAPI 라우터가 명부의 단일 진실 공급원이 된다. 백엔드가 엑셀 전체를 먼저 검증한 뒤 하나의 트랜잭션에서 upsert하고, 활동 인증 metadata의 납부자 ID를 서버에서 이름 스냅샷으로 정규화한다. React Native 관리자 탭은 별도 컴포넌트로 분리하고 공용 활동 인증 화면은 원우회비 검색 API를 사용한다.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL/SQLite tests, openpyxl, React Native, Expo Router, TanStack Query, Axios, TypeScript.

## Global Constraints

- 명부는 회원 계정과 연결하지 않고 기간 구분 없는 하나의 현재 명부만 유지한다.
- 필수 값은 이름, 전공, 학번이며 학번은 `^A\d{5}$` 형식의 고유값이다.
- 기준 `.xlsx`는 첫 시트의 헤더 없는 `이름`, `전공`, `학번` 3개 셀 열로 읽으며 셀 안 공백으로 분리하지 않는다.
- 업로드는 학번 기준 upsert이고, 빈 값·잘못된 학번·파일 내 중복 학번 하나라도 발견되면 전체를 거절한다.
- 검색 결과와 선택 칩은 `/` 없이 `이름 전공 학번` 순서로 공백 표기한다.
- 원본 엑셀이나 명부 개인정보를 시드, 마이그레이션, 로그, Git에 넣지 않는다.
- 전체 삭제는 UI 3단계 확인과 서버의 정확한 `진짜 삭제` 문구 검증을 모두 통과해야 한다.
- 변경 대상 참가자 입력란은 지원금을 받기 위한 활동 인증 생성·수정 화면의 공유 입력란 하나이다.
- 기존 작업 트리의 미완료 변경을 되돌리거나 함께 커밋하지 않는다.

---

### Task 1: 명부 모델과 Alembic 스키마

**Files:**
- Create: `backend/app/models/dues_payer.py`
- Create: `backend/alembic/versions/0026_dues_payers.py`
- Create: `backend/tests/test_dues_payer_migration.py`
- Modify: `backend/app/models/__init__.py`

**Interfaces:**
- Produces: `DuesPayer(id, student_number, name, major, created_at, updated_at)`와 `dues_payers` 테이블.
- Consumes: 현재 미커밋 마이그레이션 `0025_author_content_snapshots`를 down revision으로 사용한다.

- [ ] **Step 1: 존재하지 않는 마이그레이션에 대한 실패 테스트 작성**

```python
MIGRATION_PATH = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "0026_dues_payers.py"

def test_dues_payer_migration_creates_unique_roster_table() -> None:
    assert MIGRATION_PATH.exists()
```

- [ ] **Step 2: 실패 확인**

Run: `cd backend; pytest -q tests/test_dues_payer_migration.py`
Expected: FAIL because `0026_dues_payers.py` does not exist.

- [ ] **Step 3: 모델과 마이그레이션 최소 구현**

```python
class DuesPayer(Base):
    __tablename__ = "dues_payers"
    __table_args__ = (
        Index("ix_dues_payers_name", "name"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    student_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    major: Mapped[str] = mapped_column(String(100), nullable=False)
```

Use the shared application regex for exact cross-database format validation. The database enforces uniqueness and non-null values; the migration creates explicit unique student-number and name indexes and cleanly drops them on downgrade.

- [ ] **Step 4: migration/model assertions 확대 후 통과 확인**

Run: `cd backend; pytest -q tests/test_dues_payer_migration.py`
Expected: PASS with table, unique student-number constraint/index, name index, and downgrade assertions.

- [ ] **Step 5: 이 작업 파일만 커밋**

```powershell
git add -- backend/app/models/dues_payer.py backend/app/models/__init__.py backend/alembic/versions/0026_dues_payers.py backend/tests/test_dues_payer_migration.py
git commit -m "feat: add dues payer roster schema"
```

### Task 2: 원자적 엑셀 upsert와 명부 API

**Files:**
- Create: `backend/app/dues_payer_import.py`
- Create: `backend/app/routers/dues_payers.py`
- Create: `backend/app/schemas/dues_payer.py`
- Create: `backend/tests/test_dues_payers.py`
- Modify: `backend/app/main.py`
- Modify: `backend/tests/conftest.py`

**Interfaces:**
- Produces: `GET /api/dues-payers/search`, `GET /api/dues-payers/admin/payers`, `POST /api/dues-payers/admin/import`, `POST /api/dues-payers/admin/delete-all`.
- Produces: `parse_dues_payer_workbook(content: bytes) -> list[DuesPayerRow]` where each row carries `row_number`, `name`, `major`, `student_number`.
- Consumes: Task 1의 `DuesPayer`.

- [ ] **Step 1: API와 parser의 실패 테스트 작성**

```python
def _workbook_bytes(rows: list[tuple[str | None, str | None, str | None]]) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    for row in rows:
        sheet.append(row)
    output = BytesIO()
    workbook.save(output)
    return output.getvalue()

def test_admin_import_upserts_by_student_number_and_member_searches_name_or_number(api):
    first = api.client.post("/api/dues-payers/admin/import", files={"file": ("dues.xlsx", _workbook_bytes([("홍길동", "인공지능", "A74001")]), XLSX_MIME)}, headers=api.headers["admin"])
    second = api.client.post("/api/dues-payers/admin/import", files={"file": ("dues.xlsx", _workbook_bytes([("홍길동", "데이터사이언스", "A74001")]), XLSX_MIME)}, headers=api.headers["admin"])
    assert first.json()["data"]["created"] == 1
    assert second.json()["data"]["updated"] == 1
    assert api.client.get("/api/dues-payers/search", params={"q": "A74001"}, headers=api.headers["owner"]).json()["data"][0]["major"] == "데이터사이언스"
```

Add separate tests for ordinary-user admin denial, empty values, `A7400X`, duplicate `A74001`, invalid workbook bytes, unchanged count, name search, pagination, wrong delete confirmation, exact delete confirmation, and audit counts without PII.

- [ ] **Step 2: 실패 확인**

Run: `cd backend; pytest -q tests/test_dues_payers.py`
Expected: FAIL with 404 routes / missing parser.

- [ ] **Step 3: parser와 schemas 구현**

```python
STUDENT_NUMBER_PATTERN = re.compile(r"^A\d{5}$")

@dataclass(frozen=True)
class DuesPayerRow:
    row_number: int
    name: str
    major: str
    student_number: str

def parse_dues_payer_workbook(content: bytes) -> list[DuesPayerRow]:
    workbook = load_workbook(BytesIO(content), read_only=True, data_only=True)
    sheet = workbook.worksheets[0]
    # Normalize three cells, skip fully empty rows, reject partial blanks,
    # invalid IDs, fourth-column data, duplicate normalized IDs, and no data.
```

Map validation failures to the exact spec codes and include the 1-based row number in `message`. Read no more than `settings.media_upload_max_bytes`; close both workbook and `UploadFile`.

- [ ] **Step 4: 라우터와 트랜잭션 구현**

```python
existing = {
    item.student_number: item
    for item in db.scalars(select(DuesPayer).where(DuesPayer.student_number.in_(student_numbers)))
}
for row in rows:
    item = existing.get(row.student_number)
    if item is None:
        db.add(DuesPayer(student_number=row.student_number, name=row.name, major=row.major))
    elif (item.name, item.major) != (row.name, row.major):
        item.name, item.major = row.name, row.major
db.commit()
```

Register the router under `/api/dues-payers`, use `get_current_user` for participant search and `require_admin` for mutations/list, add pagination, audit only count fields, and require `DuesPayerDeleteRequest(confirmation="진짜 삭제")` for permanent deletion.

- [ ] **Step 5: 집중 테스트 통과 확인**

Run: `cd backend; pytest -q tests/test_dues_payers.py`
Expected: PASS for upsert/search/rejection/auth/delete/audit behaviors.

- [ ] **Step 6: 이 작업 파일만 커밋**

```powershell
git add -- backend/app/dues_payer_import.py backend/app/routers/dues_payers.py backend/app/schemas/dues_payer.py backend/app/main.py backend/tests/conftest.py backend/tests/test_dues_payers.py
git commit -m "feat: manage dues payer roster"
```

### Task 3: 활동 인증 참가자 서버 검증과 기존 기록 호환

**Files:**
- Modify: `backend/app/routers/posts.py`
- Modify: `backend/tests/test_activity_certification_edit.py`
- Create: `backend/tests/test_activity_certification_dues_payers.py`

**Interfaces:**
- Produces: `_activity_certification_metadata(db, board, incoming, existing=None) -> dict | None`.
- Consumes: metadata key `participant_dues_payer_ids: list[int]`; stores server-generated `participants` name snapshot and removes client-trusted `participant_user_ids` from new records.
- Compatibility: unchanged historical metadata without `participant_dues_payer_ids` remains editable for non-participant fields; changing legacy participants requires full reselection from the current roster.

- [ ] **Step 1: 실패하는 create/update tests 작성**

```python
def test_activity_certification_canonicalizes_current_dues_payers(api):
    # Seed two DuesPayer rows, create an activity post with their IDs and a fake
    # client participants string, then assert stored names came from the roster.
    assert post.metadata_json["participant_dues_payer_ids"] == [payer_one.id, payer_two.id]
    assert post.metadata_json["participants"] == "납부자1, 납부자2"

def test_activity_certification_rejects_missing_dues_payer_id(api):
    assert response.status_code == 422
    assert response.json()["code"] == "INVALID_DUES_PAYER"
```

Also test empty ID lists on new posts, duplicate IDs, roster deletion preserving stored `participants`, unchanged legacy edit preservation, and legacy participant modification without reselection rejection.

- [ ] **Step 2: 실패 확인**

Run: `cd backend; pytest -q tests/test_activity_certification_dues_payers.py tests/test_activity_certification_edit.py`
Expected: FAIL because post metadata still trusts the client and no dues-payer key is validated.

- [ ] **Step 3: create/update 정규화 구현**

```python
def _canonical_activity_metadata(db: Session, board: Board, incoming: dict | None, existing: dict | None = None) -> dict | None:
    if board.board_type != "activity_certification":
        return incoming
    ids = incoming.get("participant_dues_payer_ids") if incoming else None
    # Require an ordered non-empty list of unique positive ints for new/changed
    # participant data, resolve every ID, then overwrite `participants` from DB.
```

Call the helper before assigning `Post.metadata_json` on create and after the hidden bank-account preservation merge on update. Preserve `bank_account`, activity date, source post, and attachments. Do not delete activity snapshot names when a roster is cleared.

- [ ] **Step 4: 집중 테스트 통과 확인**

Run: `cd backend; pytest -q tests/test_activity_certification_dues_payers.py tests/test_activity_certification_edit.py`
Expected: PASS with server canonicalization and legacy compatibility.

- [ ] **Step 5: 이 작업 파일만 커밋**

```powershell
git add -- backend/app/routers/posts.py backend/tests/test_activity_certification_edit.py backend/tests/test_activity_certification_dues_payers.py
git commit -m "feat: validate activity dues payers"
```

### Task 4: 관리자 원우회비 탭과 3단계 삭제 UI

**Files:**
- Create: `frontend/components/admin/DuesPayerSection.tsx`
- Create: `frontend/utils/duesPayers.ts`
- Create: `frontend/tests/duesPayers.test.ts`
- Modify: `frontend/app/admin/index.tsx`
- Modify: `frontend/services/api.ts`
- Modify: `frontend/types/index.ts`

**Interfaces:**
- Produces: `DuesPayerItem`, `DuesPayerImportResult`, `duesPayerApi`, `formatDuesPayer(item)` and `<DuesPayerSection />`.
- Consumes: Task 2 admin API and `expo-document-picker`.

- [ ] **Step 1: UI helper 실패 테스트 작성**

```typescript
test("납부자는 슬래시 없이 이름 전공 학번 순서로 표시한다", () => {
  assert.equal(formatDuesPayer({ id: 1, name: "홍길동", major: "보안 및 블록체인", student_number: "A74001" }), "홍길동 보안 및 블록체인 A74001");
});

test("정확한 최종 문구만 영구 삭제를 허용한다", () => {
  assert.equal(canPermanentlyDeleteDuesPayers("진짜 삭제"), true);
  assert.equal(canPermanentlyDeleteDuesPayers("진짜삭제"), false);
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd frontend; npm test -- tests/duesPayers.test.ts`
Expected: FAIL because the helpers/types do not exist.

- [ ] **Step 3: 타입·API·파일 선택 helper 구현**

```typescript
export type DuesPayerItem = { id: number; name: string; major: string; student_number: string };
export const duesPayerApi = {
  search: (params: { q: string; size?: number }) => api.get<ApiSuccess<DuesPayerItem[]>>("/dues-payers/search", { params }),
  getAdminPayers: (params?: { q?: string; page?: number; size?: number }) => api.get<ApiSuccess<DuesPayerItem[]>>("/dues-payers/admin/payers", { params }),
  importWorkbook: (file: File | NativeFile) => api.post("/dues-payers/admin/import", formData),
  deleteAll: () => api.post("/dues-payers/admin/delete-all", { confirmation: "진짜 삭제" }),
};
```

Use a web file input with `.xlsx` accept and `DocumentPicker.getDocumentAsync` on native; send the selected file directly to the dedicated roster endpoint instead of storing it as a media asset.

- [ ] **Step 4: 별도 관리자 컴포넌트와 탭 연결 구현**

`DuesPayerSection` owns its search query, import state, query invalidation, and deletion state `idle -> warning -> phrase`. The final button remains disabled until `canPermanentlyDeleteDuesPayers(input)` is true. Add `duesPayers` to `AdminSection`/`SECTIONS`, render the component for that section, and remove the old 회비 상태 chips/callback from `UserCard` while retaining 재학 상태.

- [ ] **Step 5: 단위 테스트와 typecheck 확인**

Run: `cd frontend; npm test -- tests/duesPayers.test.ts; npm run typecheck`
Expected: PASS with no TypeScript errors.

- [ ] **Step 6: 이 작업 파일만 커밋**

```powershell
git add -- frontend/components/admin/DuesPayerSection.tsx frontend/utils/duesPayers.ts frontend/tests/duesPayers.test.ts frontend/app/admin/index.tsx frontend/services/api.ts frontend/types/index.ts
git commit -m "feat: add dues payer admin tab"
```

### Task 5: 지원금 활동 인증 참가자 검색 전환

**Files:**
- Modify: `frontend/app/board/post/create.tsx`
- Modify: `frontend/app/(tabs)/participation.tsx`
- Modify: `frontend/utils/activityCertification.ts`
- Modify: `frontend/tests/activityCertification.test.ts`
- Modify: `frontend/services/api.ts`
- Modify: `frontend/types/index.ts`

**Interfaces:**
- Consumes: Task 4 `DuesPayerItem`, `duesPayerApi.search`, `formatDuesPayer`.
- Produces: `ActivityParticipant = { id: number; name: string; major?: string; student_number?: string; legacy?: boolean }` and activity metadata `participant_dues_payer_ids: number[]`; keeps `participants` as a client preview only because Task 3 overwrites it from the DB.

- [ ] **Step 1: 실패하는 metadata와 안내 테스트 작성**

```typescript
test("활동 인증 metadata는 납부자 ID 배열을 저장하고 회원 ID를 제거한다", () => {
  const metadata = buildActivityCertificationMetadata({
    existingMetadata: { participant_user_ids: "1,2" },
    activityDate: "2026.08.11",
    participants: "홍길동",
    bankAccount: "",
    selectedParticipants: [{ id: 10, name: "홍길동", major: "인공지능", student_number: "A74001" }],
    activitySourcePostId: 3,
  });
  assert.deepEqual(metadata.participant_dues_payer_ids, [10]);
  assert.equal("participant_user_ids" in metadata, false);
});
```

Update guidance assertion to require `원우회비 납부자 명부` and name/student-number search wording. Add legacy hydration assertions that old names get negative temporary IDs and cannot be mixed with new payer selections.

- [ ] **Step 2: 실패 확인**

Run: `cd frontend; npm test -- tests/activityCertification.test.ts`
Expected: FAIL because metadata still writes `participant_user_ids` and uses `UserSearchItem`.

- [ ] **Step 3: 공용 활동 인증 입력란 전환 구현**

Replace `userApi.searchUsers` with `duesPayerApi.search`, `UserSearchItem` state with `ActivityParticipant`, the input hint with `이름 또는 학번으로 검색`, and every result/chip label with `formatActivityParticipant`. New metadata carries only positive unique payer IDs. If an edited legacy record still has temporary participants, require the author to remove and reselect all participants before participant changes are saved.

The screen state uses `ActivityParticipant[]`, allowing current `DuesPayerItem` search results and legacy name-only chips to coexist without pretending legacy user IDs are roster IDs. `activityParticipantsFromMetadata` marks old `participants`/`participant_user_ids` values as `legacy: true` with negative temporary IDs; new `participant_dues_payer_ids` hydrate as non-legacy selections.

- [ ] **Step 4: 참여활동 안내 문구 수정**

Replace `원우회비 미납자와 졸업자는 참가자 검색에서 제외됩니다.` with `원우회비 납부자 명부에 등록된 사람만 참가자로 검색할 수 있습니다.`.

- [ ] **Step 5: 집중 테스트와 typecheck 확인**

Run: `cd frontend; npm test -- tests/activityCertification.test.ts tests/duesPayers.test.ts; npm run typecheck`
Expected: PASS with the single support-payment participant picker using dues-payer search.

- [ ] **Step 6: 이 작업 파일만 커밋**

```powershell
git add -- frontend/app/board/post/create.tsx 'frontend/app/(tabs)/participation.tsx' frontend/utils/activityCertification.ts frontend/tests/activityCertification.test.ts frontend/services/api.ts frontend/types/index.ts
git commit -m "feat: select activity dues payers"
```

### Task 6: 계약 문서와 전체 검증

**Files:**
- Modify: `PLAN.md`
- Modify: `CODEX.md`
- Modify: `docs/phase2/DB_SCHEMA_DECISIONS.md`
- Modify: `docs/phase2/API_CONTRACT.md`
- Modify: `docs/phase2/AUTH_PERMISSION_SPEC.md`
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md`

**Interfaces:**
- Documents: Task 1-5의 실제 endpoint, metadata, 권한, 오류 코드, UI 문구.

- [ ] **Step 1: 구현과 계약 대조**

Record `dues_payers`, four API routes, admin/member permissions, atomic upsert validation codes, `participant_dues_payer_ids`, 3-step delete, old `dues_status` deprecation, and the support-payment participant picker in the listed docs. Preserve unrelated existing edits in every dirty document.

- [ ] **Step 2: 백엔드 전체 검증**

Run: `cd backend; pytest -q`
Expected: all tests PASS.

Run: `cd backend; python -m compileall -q app`
Expected: exit code 0.

- [ ] **Step 3: 프런트엔드 전체 검증**

Run: `cd frontend; npm test`
Expected: all tests PASS.

Run: `cd frontend; npm run typecheck`
Expected: exit code 0.

- [ ] **Step 4: migration/runtime smoke check**

Run: `docker compose config`
Expected: exit code 0.

If local Docker is available, run `docker compose run --rm backend alembic upgrade head` against the configured local PostgreSQL and exercise import -> search -> activity create -> delete-all. If Docker is unavailable, record the exact command/error as the Phase 4 exit-gate blocker without claiming the smoke test passed.

- [ ] **Step 5: diff and privacy review**

Run: `git diff --check`
Expected: no whitespace errors.

Run: `git status --short`
Expected: no `.xlsx` or roster data newly tracked; all pre-existing unrelated changes remain intact.

- [ ] **Step 6: 최종 변경만 커밋**

Stage only the feature files that do not include unrelated user changes. Leave overlapping dirty files unstaged when selective staging cannot guarantee preservation.

# Detail Back Navigation and Activity Bank Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the exact pre-detail list state for every post type and allow club/study activity-certification authors to replace a hidden bank account without exposing its stored value.

**Architecture:** Centralize post-detail back decisions in `frontend/utils/appRoutes.ts`: use the real navigation stack whenever it exists, then fall back to the recorded source board or the product parent route. Centralize activity bank-field presentation in `frontend/utils/activityCertification.ts`; creation remains required, while edit is blank, editable, and optional so the existing backend omit-to-preserve contract remains intact.

**Tech Stack:** React Native 0.81, Expo Router 6, TypeScript 5.9, Node test runner, FastAPI, pytest.

## Global Constraints

- Internal navigation must restore the real prior screen with `router.back()` so tabs, filters, search, sorting, and scroll position survive.
- Direct links with no prior screen must fall back to a valid `fromBoardId`, otherwise `boardParentRoute`.
- Existing activity bank-account values must not be shown to ordinary members.
- Activity creation requires a bank account; activity edit treats a blank bank field as “preserve the stored value.”
- A non-empty edited bank account explicitly replaces the stored value.
- No DB schema or Alembic migration changes.
- Preserve the existing normalized API envelopes and author/admin permission checks.

---

### Task 1: Make the shared detail-back decision preserve navigation history

**Files:**
- Modify: `frontend/utils/appRoutes.ts`
- Modify: `frontend/tests/boardNavigation.test.ts`
- Modify: `frontend/app/(tabs)/board/post/[postId].tsx`

**Interfaces:**
- Consumes: `routeBoardId(value: unknown): number | null`, `boardRoute(boardId: number)`, and `boardParentRoute(board)`.
- Produces: `postDetailBackDecision(board, canGoBack, fromBoardId?)` returning either `{ action: "back" }` or `{ action: "replace", route }`; `navigateFromPostDetail(board, fromBoardId, navigator)` executes that decision.
- Produces: one `handlePostBack` integration used by both the header button and Android hardware back handler.

- [ ] **Step 1: Replace the old expectations with failing history-preservation tests**

Add literal behavior cases to `frontend/tests/boardNavigation.test.ts`:

```ts
test("탐색 기록이 있으면 게시판 종류와 무관하게 실제 이전 목록으로 복귀한다", () => {
  for (const board of [
    { slug: "academic-notices", category: "notice", board_type: "notice" },
    { slug: "exam-archive", category: "resources", board_type: "resource" },
    { slug: "study-activity", category: "study", board_type: "activity_certification" },
  ]) {
    assert.deepEqual(postDetailBackDecision(board, true, "13"), { action: "back" });
  }
});

test("탐색 기록이 없으면 출발 게시판 목록으로 복귀한다", () => {
  assert.deepEqual(
    postDetailBackDecision(
      { slug: "study-activity", category: "study", board_type: "activity_certification" },
      false,
      "13",
    ),
    { action: "replace", route: "/board/13" },
  );
});

test("잘못된 출발 게시판은 제품 상위 경로로 대체한다", () => {
  assert.deepEqual(
    postDetailBackDecision(
      { slug: "academic-notices", category: "notice", board_type: "notice" },
      false,
      "invalid",
    ),
    { action: "replace", route: NOTICES_TAB_ROUTE },
  );
});
```

Update the execution test so `navigateFromPostDetail` receives `fromBoardId` before the navigator and records a real `back` call when history exists.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
cd frontend
npx tsx --test tests/boardNavigation.test.ts
```

Expected: FAIL because community/participation currently force `replace`, and the decision/executor signatures do not yet accept `fromBoardId`.

- [ ] **Step 3: Implement the minimal shared decision**

Change `PostDetailBackDecision` so its replacement route accepts both parent routes and board routes:

```ts
type PostDetailFallbackRoute =
  | ReturnType<typeof boardParentRoute>
  | ReturnType<typeof boardRoute>;

export type PostDetailBackDecision =
  | { action: "back" }
  | { action: "replace"; route: PostDetailFallbackRoute };
```

Implement the order explicitly:

```ts
export function postDetailBackDecision(
  board: BoardRouteInfo | null | undefined,
  canGoBack: boolean,
  fromBoardId?: unknown,
): PostDetailBackDecision {
  if (canGoBack) return { action: "back" };
  const sourceBoardId = routeBoardId(fromBoardId);
  if (sourceBoardId) return { action: "replace", route: boardRoute(sourceBoardId) };
  return { action: "replace", route: boardParentRoute(board) };
}
```

Pass `fromBoardId` through `navigateFromPostDetail` and keep the navigator side effects unchanged.

- [ ] **Step 4: Remove the activity-only replace branch from the detail screen**

Replace `handlePostBack` in `frontend/app/(tabs)/board/post/[postId].tsx` with the shared executor call:

```ts
const handlePostBack = useCallback(() => {
  if (!post) return;
  navigateFromPostDetail(board, params.fromBoardId, {
    canGoBack: () => router.canGoBack(),
    back: () => router.back(),
    replace: (route) => router.replace(route as never),
  });
}, [board, params.fromBoardId, post]);
```

Do not add per-board exceptions. This wiring is intentionally trivial; the observable decision is covered by the real utility tests, while browser regression in Task 3 verifies the Expo Router integration.

- [ ] **Step 5: Run the focused test and confirm GREEN**

Run:

```powershell
cd frontend
npx tsx --test tests/boardNavigation.test.ts
npm run typecheck
```

Expected: all board-navigation tests pass and TypeScript exits 0.

- [ ] **Step 6: Commit the shared navigation behavior**

```powershell
git add frontend/utils/appRoutes.ts frontend/tests/boardNavigation.test.ts 'frontend/app/(tabs)/board/post/[postId].tsx'
git commit -m "fix: preserve post list state on back"
```

---

### Task 2: Make activity bank replacement editable without exposing the stored value

**Files:**
- Modify: `frontend/utils/activityCertification.ts`
- Modify: `frontend/tests/activityCertification.test.ts`
- Modify: `frontend/app/(tabs)/board/post/create.tsx`
- Modify: `backend/tests/test_activity_certification_edit.py`

**Interfaces:**
- Produces: `activityBankAccountFieldState(postId: number | null)` returning `{ required: boolean; placeholder: string; guidance: string }`.
- Consumes: `buildActivityCertificationMetadata(...)`, whose blank `bankAccount` omits the key unless already present in admin-visible metadata; the backend preserves a hidden stored key when ordinary-member metadata omits it.

- [ ] **Step 1: Write failing field-state tests**

Add to `frontend/tests/activityCertification.test.ts`:

```ts
test("활동 인증 작성 계좌는 필수이고 수정 계좌는 새 값만 선택 입력한다", () => {
  assert.deepEqual(activityBankAccountFieldState(null), {
    required: true,
    placeholder: "은행 / 계좌번호를 입력하세요",
    guidance: "계좌는 본인 명의로만 등록 가능해요",
  });
  assert.deepEqual(activityBankAccountFieldState(503), {
    required: false,
    placeholder: "새 계좌번호를 입력하면 변경돼요",
    guidance: "기존 계좌는 표시되지 않아요. 변경할 경우 새 계좌를 입력해주세요.",
  });
});

test("수정에서 입력한 새 계좌만 metadata에 포함한다", () => {
  const metadata = buildActivityCertificationMetadata({
    existingMetadata: { participants: "72기 한다현" },
    activityDate: "2026.06.06",
    participants: "72기 한다현",
    bankAccount: "서강은행 999-000",
    selectedParticipants: [{ id: -1, name: "72기 한다현", legacy: true, persisted: true }],
    activitySourcePostId: null,
  });
  assert.equal(metadata.bank_account, "서강은행 999-000");
});
```

The first test must fail because the selector does not exist. The metadata assertion protects the non-empty replacement path with a hand-derived literal.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
cd frontend
npx tsx --test tests/activityCertification.test.ts
```

Expected: FAIL with missing `activityBankAccountFieldState` export.

- [ ] **Step 3: Add the minimal presentation selector**

Add to `frontend/utils/activityCertification.ts`:

```ts
export function activityBankAccountFieldState(postId: number | null) {
  if (postId) {
    return {
      required: false,
      placeholder: "새 계좌번호를 입력하면 변경돼요",
      guidance: "기존 계좌는 표시되지 않아요. 변경할 경우 새 계좌를 입력해주세요.",
    } as const;
  }
  return {
    required: true,
    placeholder: "은행 / 계좌번호를 입력하세요",
    guidance: "계좌는 본인 명의로만 등록 가능해요",
  } as const;
}
```

- [ ] **Step 4: Integrate the selector into the activity form**

In `frontend/app/(tabs)/board/post/create.tsx`:

- import `activityBankAccountFieldState`;
- replace `canEditActivityBankAccount` with `const bankAccountField = activityBankAccountFieldState(postId);`;
- keep the input editable in both create and edit;
- use `bankAccountField.placeholder` and `bankAccountField.guidance`;
- remove disabled styling from the bank input;
- require `values.bankAccount` only when `bankAccountField.required` is true;
- hydrate activity edit `bankAccount` as an empty string so an admin-visible stored value is not prefilled into the field.

The rendered control must have this shape:

```tsx
<FormTextInput
  onChangeText={field.onChange}
  placeholder={bankAccountField.placeholder}
  placeholderTextColor="#A6ACB7"
  style={styles.input}
  value={field.value ?? ""}
/>
```

- [ ] **Step 5: Run the focused frontend tests and typecheck**

```powershell
cd frontend
npx tsx --test tests/activityCertification.test.ts
npm run typecheck
```

Expected: focused tests and typecheck pass.

- [ ] **Step 6: Add a backend characterization test for explicit replacement**

Add to `backend/tests/test_activity_certification_edit.py` without changing backend production code:

```py
def test_activity_certification_owner_replaces_hidden_bank_account(api) -> None:
    _, post_id = _create_activity_certification(api)
    payload = _update_payload()
    payload["metadata"]["bank_account"] = "Replacement Bank 999-000"

    response = api.client.put(
        f"/api/posts/{post_id}",
        json=payload,
        headers=api.headers["owner"],
    )

    assert response.status_code == 200
    with api.session() as db:
        post = db.get(Post, post_id)
        assert post.metadata_json["bank_account"] == "Replacement Bank 999-000"
```

This is a characterization of the already documented backend boundary. It should pass immediately; the frontend field-state test is the required RED test for the production bug.

- [ ] **Step 7: Verify the backend preserve contract and explicit replacement path**

Run:

```powershell
cd backend
python -m pytest tests/test_activity_certification_edit.py tests/test_activity_certification_dues_payers.py -q
```

Expected: owner edit without `bank_account` preserves the stored value; requests containing a non-empty `bank_account` remain accepted by the existing update pipeline.

- [ ] **Step 8: Commit the account-edit behavior**

```powershell
git add frontend/utils/activityCertification.ts frontend/tests/activityCertification.test.ts 'frontend/app/(tabs)/board/post/create.tsx' backend/tests/test_activity_certification_edit.py
git commit -m "fix: allow activity bank account replacement"
```

---

### Task 3: Update contracts and run full regression verification

**Files:**
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- Modify: `CODEX.md`
- Verify: `docs/phase2/API_CONTRACT.md`

**Interfaces:**
- Consumes: the navigation and account-edit behavior completed in Tasks 1–2.
- Produces: durable route and privacy documentation plus final verification evidence.

- [ ] **Step 1: Document the implemented contracts**

Add to `docs/phase2/FRONTEND_ROUTE_SPEC.md`:

- post details use actual stack back when history exists;
- direct details fall back to `fromBoardId` then the product parent;
- activity edit never displays the existing bank account, blank preserves it, and a new value replaces it.

Add completed P0 backlog entries to `CODEX.md` for issues 140 and 143. Do not change the API contract because it already states that member responses hide `bank_account`, omitted edit metadata preserves it, and explicit metadata updates it.

- [ ] **Step 2: Run all automated checks**

```powershell
cd frontend
npm run test
npm run typecheck
npm run lint

cd ../backend
python -m pytest -q
```

Expected: every test passes, TypeScript has zero errors, ESLint has zero errors, and any pre-existing warnings are reported separately.

- [ ] **Step 3: Run local browser regression**

Start the loopback QA stack with `./scripts/qa-compose.ps1 -Action Up`. Verify without editing production data:

1. Set a non-default tab/filter and scroll position in notices, community, club activity, and study activity lists.
2. Open a detail and press `<`; confirm the exact prior state returns.
3. Open a detail directly with no history; confirm the source-board/product-parent fallback.
4. Open club and study activity edit forms; confirm the bank input is blank and editable.
5. In local QA data, confirm blank preserves the stored account and a new value replaces it.

Stop the QA stack with `./scripts/qa-compose.ps1 -Action Down`; do not use `down -v`.

- [ ] **Step 4: Review the branch diff and commit documentation**

```powershell
git diff --check
git status --short
git diff --stat main...
git add docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md
git commit -m "docs: record detail back and bank edit fixes"
```

- [ ] **Step 5: Final verification snapshot**

```powershell
git status -sb
git log --oneline --decorate -8
```

Expected: clean tracked worktree on the feature branch with the tested commits ready for integration.

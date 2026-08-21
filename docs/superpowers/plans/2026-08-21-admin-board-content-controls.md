# Unified Admin Board Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 사이드 메뉴의 게시판 관련 기능을 하나의 `게시판 관리` 흐름으로 통합하고, 모든 그룹과 게시판에서 콘텐츠·운영 설정·게시판별 전용 기능을 관리한다.

**Architecture:** category 기반 그룹 분류와 `board_type`/slug 기반 capability registry를 순수 유틸리티로 두고, 통합 탐색 컴포넌트가 그룹·게시판·관리 탭 선택만 담당한다. 기존 공지, 게시글, 건의사항, 상조회, 원우회 소개, FAQ와 일정 편집기는 선택한 게시판의 콘텐츠 패널로 재배치하고, 공통 게시판 설정은 별도 제어 컴포넌트로 분리한다. 모든 저장은 기존 API와 캐시 키를 재사용한다.

**Tech Stack:** React Native 0.81, React 19, Expo Router 6, TypeScript 5.9, TanStack Query 5, Zod 3, Node test runner (`tsx --test`), ESLint

**Spec:** `docs/superpowers/specs/2026-08-21-admin-board-content-controls-design.md`

## Global Constraints

- 관리자 사이드 메뉴에는 게시판 관련 통합 진입점이 하나만 있어야 한다.
- 공지사항, 커뮤니티·자료, 참여활동과 원우회 모두 그룹 → 게시판 → 관리 탭 구조를 사용해야 한다.
- 기존 관리자 API와 백엔드 관리자 권한 검사를 그대로 사용해야 한다.
- 강의후기는 강제 익명·댓글 불가, 시험족보는 일반 작성자 표시·댓글 허용 정책을 유지해야 한다.
- 기존 게시판의 `slug`, `category`, `board_type`은 읽기 전용 구조 식별자로 취급해야 한다.
- `club-promo`와 `networking-programs` 외에는 대표 이미지 변경 버튼을 표시하지 않아야 한다.
- DB 스키마, Alembic, seed와 수동 DB 작업을 하지 않는다.
- 사용자 앱의 메뉴, 게시판 라우트와 콘텐츠 저장 형식을 변경하지 않는다.
- 현재 작업공간의 미커밋 일정 한국시간 변경과 다른 사용자 파일을 보존하고 커밋 범위를 분리한다.

## File Structure

- Modify `frontend/utils/adminContentManagement.ts`: 그룹 분류, capability, 잠긴 정책, 선택 상태와 대표 이미지 보존 규칙
- Modify `frontend/tests/adminContentManagement.test.ts`: 위 순수 정책의 단위 테스트
- Create `frontend/utils/adminBoardSettings.ts`: 게시판 설정 draft/payload와 외부 링크 metadata 보존
- Create `frontend/tests/adminBoardSettings.test.ts`: 설정 payload와 URL 검증 단위 테스트
- Create `frontend/components/admin/AdminBoardManagementNavigator.tsx`: 그룹·게시판·콘텐츠/운영 설정 탐색 UI
- Create `frontend/components/admin/AdminBoardSettingsPanel.tsx`: 공통 게시판 설정 UI와 잠긴 정책 표시
- Create `frontend/tests/adminBoardManagementUi.test.ts`: 통합 진입점과 필수 접근성/소스 계약 회귀 테스트
- Modify `frontend/app/admin/index.tsx`: 기존 편집기 연결, 쿼리 활성 조건, 대시보드/레거시 진입 변환, 중복 메뉴 제거
- Modify `docs/phase2/FRONTEND_ROUTE_SPEC.md`: 통합 관리자 경로 계약
- Modify `CODEX.md`: QA 180과 통합 관리자 완료/검증 기록

---

### Task 1: 모든 게시판을 표현하는 capability registry

**Files:**
- Modify: `frontend/utils/adminContentManagement.ts`
- Modify: `frontend/tests/adminContentManagement.test.ts`

**Interfaces:**
- Consumes: `Board`, `MediaAsset`, `PostDetail` from `frontend/types/index.ts`
- Produces: `AdminContentScope = "all" | "notices" | "community" | "participation" | "council"`
- Produces: `AdminBoardManagementTab = "content" | "settings"`
- Produces: `AdminBoardContentKind`
- Produces: `AdminBoardLockedPolicy = { key: string; label: string; reason: string; settingKey: AdminBoardSettingKey | null }`
- Produces: `AdminBoardCapability = { kind; contentAvailable; canReplaceRepresentativeImage; lockedPolicies }`
- Produces: `adminBoardsForScope(boards, scope): Board[]`
- Produces: `adminScopeForBoard(board): AdminContentScope`
- Produces: `adminBoardCapability(board?): AdminBoardCapability`
- Produces: `nextAdminBoardSelection(boards, currentBoardId, nextScope): number | null`
- Preserves: `replaceRepresentativeImage` and `representativeImageUpdatePayload`

- [ ] **Step 1: 전체 게시판 그룹 분류 실패 테스트 작성**

`frontend/tests/adminContentManagement.test.ts`의 fixture에 `calendar`, `external_link`, `organization_intro`, `faq`, `guide`를 추가하고 모든 유형이 그룹에 포함되는지 검증한다.

```ts
test("그룹은 표준 게시글이 없는 게시판까지 모두 포함한다", () => {
  assert.deepEqual(
    adminBoardsForScope(boards, "notices").map((board) => board.slug),
    ["all-notices", "academic-calendar"],
  );
  assert.deepEqual(
    adminBoardsForScope(boards, "council").map((board) => board.slug),
    ["accounting", "gsa-executives", "gsa-faq", "gsa-roadmap-benefits"],
  );
});

test("알 수 없는 category는 전체에만 표시한다", () => {
  assert.deepEqual(adminBoardsForScope(boards, "all").map((board) => board.slug), [
    "all-notices",
    "academic-calendar",
    "accounting",
    "gsa-executives",
    "gsa-faq",
    "gsa-roadmap-benefits",
    "future-board",
  ]);
  assert.equal(adminBoardsForScope(boards, "community").some((board) => board.slug === "future-board"), false);
});
```

- [ ] **Step 2: 테스트가 기존 post-type allowlist 때문에 실패하는지 확인**

Run: `cd frontend; npx tsx --test tests/adminContentManagement.test.ts`

Expected: FAIL because non-post `board_type` values are missing and `adminBoardsForScope` is not exported.

- [ ] **Step 3: 그룹 분류를 전체 Board 기반으로 변경**

`frontend/utils/adminContentManagement.ts`에서 post type allowlist를 제거하고 category만 범위 제한에 사용한다.

```ts
const SCOPE_CATEGORIES: Record<Exclude<AdminContentScope, "all">, readonly string[]> = {
  notices: ["notices"],
  community: ["community", "resources"],
  participation: ["participation", "club", "study", "alumni"],
  council: ["council", "gsa"],
};

export function adminBoardsForScope(boards: Board[], scope: AdminContentScope): Board[] {
  const categories = scope === "all" ? null : SCOPE_CATEGORIES[scope];
  return boards
    .filter((board) => categories === null || categories.includes(board.category))
    .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id);
}
```

- [ ] **Step 4: capability 및 잠긴 정책 실패 테스트 작성**

모든 지원 유형과 개인정보 관련 slug를 literal로 검증한다.

```ts
test("게시판 유형은 기존 전용 편집기 capability로 연결된다", () => {
  assert.equal(adminBoardCapability(boardBySlug("academic-calendar")).kind, "calendar");
  assert.equal(adminBoardCapability(boardBySlug("accounting")).kind, "external-link");
  assert.equal(adminBoardCapability(boardBySlug("gsa-executives")).kind, "organization-intro");
  assert.equal(adminBoardCapability(boardBySlug("gsa-faq")).kind, "faq");
  assert.deepEqual(adminBoardCapability(boardBySlug("gsa-roadmap-benefits")), {
    kind: "guide",
    contentAvailable: false,
    canReplaceRepresentativeImage: false,
    lockedPolicies: [],
  });
});

test("커뮤니티 개인정보 정책은 잠긴 상태로 노출된다", () => {
  assert.deepEqual(
    adminBoardCapability(boardBySlug("lecture-reviews")).lockedPolicies.map((policy) => policy.key),
    ["forced-anonymous", "comments-disabled"],
  );
  assert.deepEqual(
    adminBoardCapability(boardBySlug("exam-archive")).lockedPolicies.map((policy) => policy.key),
    ["author-visible", "comments-enabled"],
  );
});

test("category는 모든 화면에서 같은 관리자 scope로 계산한다", () => {
  assert.equal(adminScopeForBoard(boardBySlug("exam-archive")), "community");
  assert.equal(adminScopeForBoard(boardBySlug("networking-programs")), "participation");
  assert.equal(adminScopeForBoard(boardBySlug("gsa-executives")), "council");
});
```

- [ ] **Step 5: 테스트가 기존 제한된 control type 때문에 실패하는지 확인**

Run: `cd frontend; npx tsx --test tests/adminContentManagement.test.ts`

Expected: FAIL because the current control omits calendar, external link, organization intro, FAQ, guide and locked policies.

- [ ] **Step 6: capability registry 최소 구현**

다음 union과 반환 구조를 구현한다. slug 예외는 개인정보/대표 이미지 정책에만 사용하고 일반 편집기 선택은 `board_type`으로 결정한다.

```ts
export type AdminBoardContentKind =
  | "aggregate-posts"
  | "posts"
  | "notice"
  | "album"
  | "resource"
  | "activity-certification"
  | "activity-history"
  | "suggestion"
  | "mutual-aid"
  | "calendar"
  | "external-link"
  | "organization-intro"
  | "faq"
  | "guide";

export type AdminBoardCapability = {
  kind: AdminBoardContentKind;
  contentAvailable: boolean;
  canReplaceRepresentativeImage: boolean;
  lockedPolicies: AdminBoardLockedPolicy[];
};
```

`AdminBoardSettingKey`는 `allow_anonymous | write_permission | read_permission`만 허용한다. `undefined` board는 `aggregate-posts`, `guide`는 `contentAvailable: false`, `club-promo`와 `networking-programs`만 `canReplaceRepresentativeImage: true`를 반환한다. 강의후기·시험족보·건의사항의 익명 정책은 `allow_anonymous`, 동아리·네트워킹 관리자 작성 정책은 `write_permission`을 잠근다. `adminScopeForBoard`는 Task 1의 category mapping을 역으로 사용하고 알 수 없는 category에는 `all`을 반환한다.

- [ ] **Step 7: 선택 상태 전이 테스트와 구현**

```ts
test("전체는 모든 게시판 가상 선택을 유지하고 실제 그룹은 유효한 첫 게시판을 선택한다", () => {
  assert.equal(nextAdminBoardSelection(boards, 99, "all"), null);
  assert.equal(nextAdminBoardSelection(boards, null, "notices"), boardBySlug("all-notices").id);
  assert.equal(
    nextAdminBoardSelection(boards, boardBySlug("exam-archive").id, "community"),
    boardBySlug("exam-archive").id,
  );
});
```

`nextAdminBoardSelection`은 `all`에서 `null`, 현재 ID가 새 그룹에 있으면 현재 ID, 아니면 새 그룹의 첫 ID, 빈 그룹이면 `null`을 반환한다.

- [ ] **Step 8: 기존 대표 이미지 테스트를 포함해 Task 1 통과 확인**

Run: `cd frontend; npx tsx --test tests/adminContentManagement.test.ts`

Expected: PASS, 0 failures.

- [ ] **Step 9: Task 1 커밋**

```bash
git add -- frontend/utils/adminContentManagement.ts frontend/tests/adminContentManagement.test.ts
git commit -m "refactor(frontend): model unified admin board capabilities"
```

### Task 2: 게시판 설정 payload와 외부 링크 보존

**Files:**
- Create: `frontend/utils/adminBoardSettings.ts`
- Create: `frontend/tests/adminBoardSettings.test.ts`

**Interfaces:**
- Consumes: `Board` from `frontend/types/index.ts`
- Produces: `AdminBoardSettingsDraft`
- Produces: `adminBoardSettingsDraft(board): AdminBoardSettingsDraft`
- Produces: `adminBoardSettingsPayload(draft): AdminBoardSettingsPayload`
- Produces: `externalLinkMetadata(board, url): Record<string, unknown>`
- Produces: `validateExternalHttpUrl(url): string | null`

- [ ] **Step 1: 구조 식별자를 제외하는 설정 payload 실패 테스트 작성**

```ts
test("기존 게시판 설정 payload는 slug category board_type metadata를 덮어쓰지 않는다", () => {
  const draft = adminBoardSettingsDraft(board);
  const payload = adminBoardSettingsPayload({ ...draft, name: "새 이름", sortOrder: "17" });

  assert.deepEqual(payload, {
    name: "새 이름",
    description: board.description,
    sort_order: 17,
    allow_anonymous: board.allow_anonymous,
    read_permission: board.read_permission,
    write_permission: board.write_permission,
    is_active: board.is_active,
  });
  assert.equal("slug" in payload, false);
  assert.equal("metadata" in payload, false);
});
```

- [ ] **Step 2: 새 모듈 부재로 실패하는지 확인**

Run: `cd frontend; npx tsx --test tests/adminBoardSettings.test.ts`

Expected: FAIL with `Cannot find module '../utils/adminBoardSettings'`.

- [ ] **Step 3: draft와 payload 최소 구현**

```ts
export type AdminBoardSettingsDraft = {
  name: string;
  description: string;
  sortOrder: string;
  allowAnonymous: boolean;
  readPermission: string;
  writePermission: string;
  isActive: boolean;
};

export function adminBoardSettingsPayload(draft: AdminBoardSettingsDraft) {
  const sortOrder = Number.parseInt(draft.sortOrder, 10);
  if (!draft.name.trim() || !Number.isFinite(sortOrder)) throw new Error("INVALID_BOARD_SETTINGS");
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    sort_order: sortOrder,
    allow_anonymous: draft.allowAnonymous,
    read_permission: draft.readPermission,
    write_permission: draft.writePermission,
    is_active: draft.isActive,
  };
}
```

- [ ] **Step 4: 외부 URL과 metadata 보존 실패 테스트 작성**

```ts
test("외부 링크 변경은 알 수 없는 기존 metadata를 보존한다", () => {
  const legacyBoard = { ...board, metadata: { notion_url: "https://old.example.com", analytics_key: "accounting" } };
  assert.deepEqual(externalLinkMetadata(legacyBoard, "https://example.com/new"), {
    notion_url: "https://example.com/new",
    analytics_key: "accounting",
  });
});

test("외부 링크는 http 또는 https만 허용한다", () => {
  assert.equal(validateExternalHttpUrl("javascript:alert(1)"), "http 또는 https 주소를 입력하세요.");
  assert.equal(validateExternalHttpUrl("https://example.com/path"), null);
});
```

- [ ] **Step 5: URL 정규화와 metadata 최소 구현 후 테스트**

`externalLinkMetadata`는 `notion_url`, `external_url`, `url`, `link` 순서로 기존 문자열 key를 찾아 그 key만 새 값으로 바꾸고, 기존 key가 없으면 `external_url`을 추가한다. 나머지 metadata는 그대로 보존한다. `validateExternalHttpUrl`은 `new URL()`의 protocol이 `http:` 또는 `https:`인지 검사한다.

Run: `cd frontend; npx tsx --test tests/adminBoardSettings.test.ts`

Expected: PASS, 0 failures.

- [ ] **Step 6: Task 2 커밋**

```bash
git add -- frontend/utils/adminBoardSettings.ts frontend/tests/adminBoardSettings.test.ts
git commit -m "feat(frontend): preserve unified board settings payloads"
```

### Task 3: 통합 탐색기와 공통 운영 설정 패널

**Files:**
- Create: `frontend/components/admin/AdminBoardManagementNavigator.tsx`
- Create: `frontend/components/admin/AdminBoardSettingsPanel.tsx`
- Create: `frontend/tests/adminBoardManagementUi.test.ts`
- Modify: `frontend/app/admin/index.tsx`

**Interfaces:**
- Consumes: Task 1의 `AdminContentScope`, `AdminBoardManagementTab`, `adminBoardsForScope`
- Consumes: Task 2의 `AdminBoardSettingsDraft`
- Produces: `AdminBoardManagementNavigatorProps`
- Produces: `AdminBoardSettingsPanelProps`
- Produces: 관리자 상태 `boardManagementScope`, `boardManagementBoardId`, `boardManagementTab`

- [ ] **Step 1: 통합 탐색 UI 소스 계약 실패 테스트 작성**

`frontend/tests/adminBoardManagementUi.test.ts`에 컴포넌트와 관리자 화면 소스를 읽는 회귀 테스트를 추가한다.

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const navigatorSource = readFileSync(
  join(process.cwd(), "components", "admin", "AdminBoardManagementNavigator.tsx"),
  "utf8",
);
const settingsSource = readFileSync(
  join(process.cwd(), "components", "admin", "AdminBoardSettingsPanel.tsx"),
  "utf8",
);
const adminSource = readFileSync(join(process.cwd(), "app", "admin", "index.tsx"), "utf8");

test("통합 탐색기는 그룹 게시판 콘텐츠 운영설정 탭을 제공한다", () => {
  assert.match(navigatorSource, /전체/);
  assert.match(navigatorSource, /커뮤니티·자료/);
  assert.match(navigatorSource, /accessibilityRole="tab"/);
  assert.match(navigatorSource, /콘텐츠/);
  assert.match(navigatorSource, /운영 설정/);
});

test("관리자 화면은 통합 선택 상태를 하나만 소유한다", () => {
  assert.match(adminSource, /boardManagementScope/);
  assert.match(adminSource, /boardManagementBoardId/);
  assert.match(adminSource, /boardManagementTab/);
});

test("운영 설정은 구조 식별자와 잠긴 정책을 읽기 전용으로 표시한다", () => {
  assert.match(settingsSource, /구조 식별자 · 변경 불가/);
  assert.match(settingsSource, /settingKey/);
  assert.match(navigatorSource, /새 게시판 등록/);
});
```

- [ ] **Step 2: 컴포넌트 부재로 실패하는지 확인**

Run: `cd frontend; npx tsx --test tests/adminBoardManagementUi.test.ts`

Expected: FAIL with missing navigator file or missing unified state names.

- [ ] **Step 3: 탐색 컴포넌트 구현**

다음 controlled interface를 사용하고 내부에 별도 선택 상태를 만들지 않는다.

```ts
export type AdminBoardManagementNavigatorProps = {
  boards: Board[];
  scope: AdminContentScope;
  selectedBoardId: number | null;
  selectedTab: AdminBoardManagementTab;
  creatingBoard: boolean;
  onScopeChange: (scope: AdminContentScope) => void;
  onBoardChange: (boardId: number | null) => void;
  onTabChange: (tab: AdminBoardManagementTab) => void;
  onCreateBoard: () => void;
};
```

그룹은 `전체 / 공지사항 / 커뮤니티·자료 / 참여활동 / 원우회` 순서로 렌더링한다. `전체`의 첫 게시판 선택지는 `모든 게시판`, 나머지는 `adminBoardsForScope` 결과를 사용한다. 실제 게시판이 없고 새 게시판 등록 중도 아니면 `운영 설정` 탭을 숨긴다. `새 게시판 등록`은 `onCreateBoard`를 호출하는 고급 설정 action으로 제공한다. 모든 탭 Pressable에 `accessibilityRole="tab"`, `accessibilityState={{ selected }}`를 지정한다.

- [ ] **Step 4: 공통 운영 설정 패널 구현**

다음 controlled interface로 네트워크와 캐시 책임을 부모에 둔다.

```ts
export type AdminBoardSettingsPanelProps = {
  board: Board;
  draft: AdminBoardSettingsDraft;
  lockedPolicies: readonly AdminBoardLockedPolicy[];
  saving: boolean;
  onChange: (draft: AdminBoardSettingsDraft) => void;
  onSave: () => void;
};
```

이름, 설명, 정렬, 읽기/쓰기 권한, 익명 허용, 활성 상태를 입력받는다. `slug`, `category`, `board_type`은 값과 함께 `구조 식별자 · 변경 불가`로 표시한다. 잠긴 정책은 label과 reason을 읽기 전용 카드로 표시한다. `allow_anonymous → allowAnonymous`, `write_permission → writePermission`, `read_permission → readPermission` mapping을 상수로 선언하고 policy의 `settingKey`와 연결된 입력 control은 disabled 처리한다.

- [ ] **Step 5: 관리자 화면에 통합 선택 상태와 설정 저장 연결**

`frontend/app/admin/index.tsx`에 다음 상태와 파생값을 추가한다.

```ts
const [boardManagementScope, setBoardManagementScope] = useState<AdminContentScope>("all");
const [boardManagementBoardId, setBoardManagementBoardId] = useState<number | null>(null);
const [boardManagementTab, setBoardManagementTab] = useState<AdminBoardManagementTab>("content");
const [creatingBoard, setCreatingBoard] = useState(false);
const [boardSettingsDraft, setBoardSettingsDraft] = useState<AdminBoardSettingsDraft | null>(null);

const selectedManagedBoard = boards.find((board) => board.id === boardManagementBoardId);
const selectedBoardCapability = adminBoardCapability(selectedManagedBoard);
```

이 Task에서는 `AdminSection`과 `SECTIONS`에 `boardManagement`를 기존 게시판 관련 section과 함께 임시로 추가해 통합 화면을 열 수 있게 한다. Task 6에서 모든 기존 콘텐츠가 연결된 뒤 legacy 항목을 제거한다.

그룹 변경은 `nextAdminBoardSelection`으로 게시판 ID를 갱신하고 탭을 `content`로 초기화한다. 게시판 변경도 탭을 `content`로 초기화한다. 선택 게시판 변경 시 `adminBoardSettingsDraft`로 draft를 갱신한다.

설정 저장은 `boardApi.updateAdminBoard(selectedManagedBoard.id, adminBoardSettingsPayload(draft))`를 호출하고 성공 후 `admin-boards`와 `boards` 캐시를 무효화한다. 실패하면 draft를 유지하고 `Alert.alert("저장 실패", ...)`를 표시한다.

`새 게시판 등록`은 기존 `emptyBoard`, `boardForm`, `handleSaveBoard`와 board type 선택 UI를 재사용한다. `creatingBoard`를 true로 하고 `boardManagementTab`을 `settings`로 바꾸며, 이 모드에서만 slug/category/board_type 입력을 허용한다. 저장 또는 취소 후 `creatingBoard`를 false로 되돌린다. 통합 작업이 기존 새 게시판 등록 기능을 제거하면 안 된다.

- [ ] **Step 6: 탐색 계약, 설정 테스트와 타입 검사**

Run: `cd frontend; npx tsx --test tests/adminContentManagement.test.ts tests/adminBoardSettings.test.ts tests/adminBoardManagementUi.test.ts`

Expected: PASS, 0 failures.

Run: `cd frontend; npm run typecheck`

Expected: exit 0.

- [ ] **Step 7: Task 3 커밋 범위 분리**

먼저 `git diff -- frontend/app/admin/index.tsx`로 기존 일정 한국시간 변경과 새 관리자 hunks를 구분한다. 새 컴포넌트와 테스트는 경로 지정으로 staging하고, `index.tsx`는 `git add -p -- frontend/app/admin/index.tsx`로 통합 관리자 hunks만 선택한다.

```bash
git add -- frontend/components/admin/AdminBoardManagementNavigator.tsx frontend/components/admin/AdminBoardSettingsPanel.tsx frontend/tests/adminBoardManagementUi.test.ts
git add -p -- frontend/app/admin/index.tsx
git diff --cached --check
git commit -m "feat(frontend): add unified admin board navigator"
```

### Task 4: 게시글·공지·건의·상조회 콘텐츠를 통합 화면에 연결

**Files:**
- Create: `frontend/components/admin/AdminBoardContentPanel.tsx`
- Modify: `frontend/app/admin/index.tsx`
- Modify: `frontend/tests/adminBoardManagementUi.test.ts`

**Interfaces:**
- Consumes: `selectedManagedBoard`, `selectedBoardCapability`, `boardManagementTab`
- Consumes: existing `adminPostsQuery`, `noticePostsQuery`, `suggestionPostsQuery`, `mutualAidPostsQuery`
- Produces: `AdminBoardContentPanelProps = { board; capability; renderers }`
- Produces: capability kind별 단일 콘텐츠 패널과 lazy query enable 조건

- [ ] **Step 1: 기존 전용 메뉴로 이동하지 않는 콘텐츠 계약 실패 테스트 작성**

```ts
test("공지 건의 상조회는 통합 콘텐츠 kind로 렌더링한다", () => {
  assert.match(adminSource, /selectedBoardCapability\.kind === "notice"/);
  assert.match(adminSource, /selectedBoardCapability\.kind === "suggestion"/);
  assert.match(adminSource, /selectedBoardCapability\.kind === "mutual-aid"/);
  assert.doesNotMatch(adminSource, /dedicatedSection/);
});

test("숨겨진 게시판 콘텐츠 쿼리는 실행하지 않는다", () => {
  assert.match(adminSource, /isManagedContentActive/);
  assert.match(adminSource, /section === "dashboard" \|\| isManagedContentActive/);
});

test("콘텐츠 패널은 capability kind에 맞는 renderer 하나만 실행한다", () => {
  const contentPanelSource = readFileSync(
    join(process.cwd(), "components", "admin", "AdminBoardContentPanel.tsx"),
    "utf8",
  );
  assert.match(contentPanelSource, /renderers\[capability\.kind\]/);
});
```

- [ ] **Step 2: 기존 바로가기 구조 때문에 실패하는지 확인**

Run: `cd frontend; npx tsx --test tests/adminBoardManagementUi.test.ts`

Expected: FAIL because the content panel file is absent, `dedicatedSection` links still exist and queries are keyed by legacy `section` values.

- [ ] **Step 3: 단일 콘텐츠 adapter와 활성 조건 추가**

`frontend/components/admin/AdminBoardContentPanel.tsx`는 다음 interface로 현재 kind의 renderer 하나만 호출한다.

```ts
export type AdminBoardContentPanelProps = {
  board?: Board;
  capability: AdminBoardCapability;
  renderers: Partial<Record<AdminBoardContentKind, () => ReactNode>>;
};

export default function AdminBoardContentPanel({ board, capability, renderers }: AdminBoardContentPanelProps) {
  const render = renderers[capability.kind];
  if (render) return <>{render()}</>;
  return <Text>{board ? `${board.name} 콘텐츠를 관리할 수 없습니다.` : "표시할 콘텐츠가 없습니다."}</Text>;
}
```

관리자 화면의 공통 조건은 다음과 같다.

```ts
const isManagedContentActive = section === "boardManagement" && boardManagementTab === "content";
const managedContentKind = selectedBoardCapability.kind;
const showsStandardPosts = isManagedContentActive && [
  "aggregate-posts",
  "posts",
  "resource",
  "album",
  "activity-certification",
].includes(managedContentKind);
```

`adminPostsQuery`는 `section === "dashboard" || showsStandardPosts`일 때 활성화한다. 대시보드에서는 검색과 게시판 filter를 생략하고, 통합 화면에서는 실제 게시판 선택 시 `board_id: selectedManagedBoard.id`, `모든 게시판`이면 board ID 생략을 사용한다. 대표 이미지 handler와 카드 동작은 현재 구현을 그대로 보존한다.

- [ ] **Step 4: 공지 콘텐츠 기존 편집기 연결**

공지 선택 시 `selectedNoticeBoardId`를 `selectedManagedBoard.id`와 동기화한다. 기존 `section === "notices"` JSX 본문을 `renderNoticeContent()`로 감싸고 `managedContentKind === "notice"`에서 렌더링한다. 공지 쿼리는 다음 조건만 사용한다.

```ts
enabled: isAdmin
  && isManagedContentActive
  && managedContentKind === "notice"
  && Boolean(selectedNoticeBoardId)
```

공지 작성, 수정, 고정, 삭제와 `show_in_council_activity` metadata 저장 코드는 변경하지 않는다.

- [ ] **Step 5: 건의사항과 상조회 기존 큐 연결**

기존 `section === "suggestions"` 및 `section === "mutualAid"` JSX 본문을 각각 `renderSuggestionContent()`와 `renderMutualAidContent()`로 감싼다. query enable 조건은 대시보드 통계·대기 건수 또는 선택 kind의 콘텐츠 탭에만 반응하게 한다.

```ts
enabled: isAdmin && (section === "dashboard" || (isManagedContentActive && managedContentKind === "suggestion"))
enabled: isAdmin && (section === "dashboard" || (isManagedContentActive && managedContentKind === "mutual-aid"))
```

기존 필터, 공식 답변, 완료/반려 mutation과 캐시 무효화 키는 유지한다.

- [ ] **Step 6: 활동내역을 연동 공지 목록으로 연결**

`activity-history` 선택 시 `postApi.getAdminPosts({ page: 1, size: 100, board_type: "notice" })`를 콘텐츠 탭에서만 호출하고 `item.metadata?.show_in_council_activity === true`인 공지만 표시한다. 편집 버튼은 해당 공지의 실제 `board_id`를 `selectedNoticeBoardId`에 넣고 `boardManagementScope = "notices"`, `boardManagementBoardId = item.board_id`, `boardManagementTab = "content"`로 바꾼 다음 기존 공지 편집 폼을 연다. 이는 같은 통합 화면 안의 게시판 선택 전환이며 별도 공지 사이드 메뉴 이동이 아니다.

- [ ] **Step 7: focused tests와 타입 검사**

Run: `cd frontend; npx tsx --test tests/adminContentManagement.test.ts tests/adminBoardManagementUi.test.ts tests/postDetailImagePresentation.test.ts`

Expected: PASS, 0 failures.

Run: `cd frontend; npm run typecheck`

Expected: exit 0.

- [ ] **Step 8: Task 4 커밋**

`index.tsx`의 사용자 일정 hunks를 제외하고 새 콘텐츠 연결 hunks만 staging한다.

```bash
git add -- frontend/components/admin/AdminBoardContentPanel.tsx frontend/tests/adminBoardManagementUi.test.ts
git add -p -- frontend/app/admin/index.tsx
git diff --cached --check
git commit -m "refactor(frontend): unify admin post workflows by board"
```

### Task 5: 원우회 소개·일정·FAQ·외부 링크·가이드 콘텐츠 연결

**Files:**
- Modify: `frontend/app/admin/index.tsx`
- Modify: `frontend/tests/adminBoardManagementUi.test.ts`
- Modify: `frontend/tests/adminBoardSettings.test.ts`

**Interfaces:**
- Consumes: capability kinds `organization-intro`, `calendar`, `faq`, `external-link`, `guide`
- Consumes: existing council metadata helpers, `eventApi`, `faqApi`, `boardApi.updateAdminBoard`
- Consumes: Task 2의 `externalLinkMetadata`, `validateExternalHttpUrl`
- Produces: 비게시글 유형별 실제 콘텐츠 패널

- [ ] **Step 1: 비게시글 capability 렌더링 실패 테스트 작성**

```ts
test("비게시글 게시판도 통합 콘텐츠 패널에서 관리한다", () => {
  assert.match(adminSource, /"organization-intro": renderOrganizationIntroContent/);
  assert.match(adminSource, /calendar: renderCalendarContent/);
  assert.match(adminSource, /faq: renderFaqContent/);
  assert.match(adminSource, /"external-link": renderExternalLinkContent/);
  assert.match(adminSource, /guide: renderGuideContent/);
});
```

- [ ] **Step 2: switch 부재로 실패하는지 확인**

Run: `cd frontend; npx tsx --test tests/adminBoardManagementUi.test.ts`

Expected: FAIL because the unified content renderer map does not yet cover all non-post kinds.

- [ ] **Step 3: 원우회 소개 편집기 slug 매핑**

`organization-intro` kind에서 slug를 명시적으로 분기한다.

```ts
switch (selectedManagedBoard?.slug) {
  case "gsa-executives": return renderExecutivesContent();
  case "gsa-cohort-leaders": return renderCohortLeadersContent();
  case "gsa-past-councils": return renderPastCouncilsContent();
  default: return <UnsupportedBoardContent board={selectedManagedBoard} />;
}
```

기존 metadata parsing, 이미지 업로드, 순서 변경과 저장 helper는 바꾸지 않는다. 기존 `section === "executives"`, `cohortLeaders`, `pastCouncils` JSX 본문만 각 render 함수로 옮긴다.

- [ ] **Step 4: 일정과 FAQ 편집기 연결 및 쿼리 지연**

`calendar`는 기존 일정 form/list, `faq`는 기존 FAQ form/list를 렌더링한다. 쿼리 enable 조건을 다음처럼 제한한다.

```ts
enabled: isAdmin && isManagedContentActive && managedContentKind === "calendar"
enabled: isAdmin && isManagedContentActive && managedContentKind === "faq"
```

기존 일정 route param의 `eventId`, FAQ category, 삭제 확인과 캐시 키를 유지한다.

- [ ] **Step 5: 외부 링크 편집기 연결**

`external-link` 콘텐츠에는 현재 URL input과 저장 버튼을 렌더링한다. 선택 게시판이 바뀔 때 `metadata.notion_url`, `metadata.external_url`, `metadata.url`, `metadata.link` 순서로 첫 문자열을 draft에 넣는다. 저장 시 URL을 검증한 뒤 다음 호출만 수행한다.

```ts
await boardApi.updateAdminBoard(selectedManagedBoard.id, {
  metadata: externalLinkMetadata(selectedManagedBoard, externalLinkDraft),
});
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ["admin-boards"] }),
  queryClient.invalidateQueries({ queryKey: ["boards"] }),
]);
```

기존 다른 metadata key를 제거하지 않는다.

- [ ] **Step 6: 가이드의 명시적 비어 있음 상태**

`guide`에는 게시글 목록을 조회하지 않고 다음 안내를 표시한다: `이 가이드는 별도 콘텐츠 저장 형식을 사용하지 않습니다. 이름, 설명, 노출과 권한은 운영 설정에서 관리할 수 있습니다.` 새 metadata key나 사용자가 읽지 않는 저장값을 만들지 않는다.

- [ ] **Step 7: focused tests와 타입 검사**

Run: `cd frontend; npx tsx --test tests/adminBoardSettings.test.ts tests/adminBoardManagementUi.test.ts tests/councilIntroductions.test.ts tests/eventNavigation.test.ts tests/eventCalendar.test.ts`

Expected: PASS, 0 failures.

Run: `cd frontend; npm run typecheck`

Expected: exit 0.

- [ ] **Step 8: Task 5 커밋**

```bash
git add -- frontend/tests/adminBoardManagementUi.test.ts frontend/tests/adminBoardSettings.test.ts
git add -p -- frontend/app/admin/index.tsx
git diff --cached --check
git commit -m "refactor(frontend): embed specialized admin board editors"
```

### Task 6: 사이드 메뉴·대시보드·레거시 진입 통합

**Files:**
- Modify: `frontend/app/admin/index.tsx`
- Modify: `frontend/utils/adminContentManagement.ts`
- Modify: `frontend/tests/adminContentManagement.test.ts`
- Modify: `frontend/tests/adminBoardManagementUi.test.ts`

**Interfaces:**
- Produces: `AdminSection = "dashboard" | "banners" | "boardManagement" | "accounts" | "duesPayers" | "reports" | "registration"`
- Produces: `AdminBoardDestination = { scope: AdminContentScope; boardId: number | null; tab: AdminBoardManagementTab }`
- Produces: `adminBoardDestinationForLegacySection(section, boards): AdminBoardDestination | null`
- Preserves: existing `/admin?section=...` links through destination conversion

- [ ] **Step 1: 단일 사이드 메뉴 및 레거시 목적지 실패 테스트 작성**

첫 번째 테스트는 `frontend/tests/adminBoardManagementUi.test.ts`, 두 번째 테스트는 Board fixture와 `boardBySlug`가 있는 `frontend/tests/adminContentManagement.test.ts`에 추가한다.

```ts
test("게시판 관련 사이드 메뉴는 게시판 관리 하나만 남는다", () => {
  const sectionsSource = adminSource.slice(
    adminSource.indexOf("const SECTIONS"),
    adminSource.indexOf("const ADMIN_SECTION_KEYS"),
  );
  assert.match(adminSource, /key: "boardManagement", label: "게시판 관리"/);
  for (const label of ["공지사항", "게시글", "건의사항", "상조회", "기장단", "역대 원우회", "FAQ", "일정"]) {
    assert.doesNotMatch(sectionsSource, new RegExp(`label: "${label}"`));
  }
});

test("기존 관리자 section 링크는 통합 게시판 목적지로 변환한다", () => {
  assert.deepEqual(adminBoardDestinationForLegacySection("suggestions", boards), {
    scope: "council",
    boardId: boardBySlug("suggestions").id,
    tab: "content",
  });
  assert.deepEqual(adminBoardDestinationForLegacySection("cohortLeaders", boards), {
    scope: "council",
    boardId: boardBySlug("gsa-cohort-leaders").id,
    tab: "content",
  });
});
```

- [ ] **Step 2: 중복 메뉴와 변환 함수 부재로 실패 확인**

Run: `cd frontend; npx tsx --test tests/adminContentManagement.test.ts tests/adminBoardManagementUi.test.ts`

Expected: FAIL because legacy menu entries remain and destination mapping is missing.

- [ ] **Step 3: 레거시 destination helper 구현**

다음 mapping을 순수 함수로 구현한다.

```ts
const LEGACY_SECTION_SLUGS = {
  notices: "all-notices",
  executives: "gsa-executives",
  cohortLeaders: "gsa-cohort-leaders",
  pastCouncils: "gsa-past-councils",
  suggestions: "suggestions",
  mutualAid: "mutual-aid",
  faqs: "gsa-faq",
  events: "academic-calendar",
} as const;
```

`posts`는 `{ scope: "all", boardId: null, tab: "content" }`, `boards`는 전체 정렬의 첫 게시판과 `settings`, slug 기반 항목은 해당 board category에서 계산한 scope와 `content`를 반환한다. 게시판을 찾지 못하면 `all/null/content`로 안전하게 대체한다.

- [ ] **Step 4: 사이드 메뉴를 통합 진입점으로 축소**

`SECTIONS`에서 게시판 관련 legacy 항목을 제거하고 다음 한 항목을 추가한다.

```ts
{ key: "boardManagement", label: "게시판 관리", icon: "grid-outline" }
```

배너, 계정, 원우회비, 신고, 가입 설정은 유지한다. 현재 `ADMIN_SECTION_KEYS`에 있는 값은 그대로 parse하고, 그 밖의 레거시 section query는 게시판 목록이 준비된 뒤 한 번만 helper로 변환한다.

```ts
const handledLegacySection = useRef<string | null>(null);

useEffect(() => {
  const rawSection = firstParam(params.section);
  if (!rawSection || ADMIN_SECTION_KEYS.includes(rawSection as AdminSection) || handledLegacySection.current === rawSection) return;
  const destination = adminBoardDestinationForLegacySection(rawSection, boards);
  if (!destination) return;
  handledLegacySection.current = rawSection;
  setSection("boardManagement");
  setBoardManagementScope(destination.scope);
  setBoardManagementBoardId(destination.boardId);
  setBoardManagementTab(destination.tab);
}, [boards, params.section]);
```

기존 북마크 URL이 빈 화면이 되지 않아야 한다. 일정 수정/복제 handler가 쓰는 `section=events&eventId=...` 이동도 `boardManagement`와 `academic-calendar` 선택으로 바꾸되 `eventId`는 유지한다.

- [ ] **Step 5: 대시보드 빠른 카드를 통합 선택 함수로 변경**

```ts
const openManagedBoard = (slug: string, tab: AdminBoardManagementTab = "content") => {
  const board = boards.find((item) => item.slug === slug);
  setSection("boardManagement");
  setBoardManagementScope(board ? adminScopeForBoard(board) : "all");
  setBoardManagementBoardId(board?.id ?? null);
  setBoardManagementTab(board ? tab : "content");
};
```

공지, 원우회 소개, 기장단, 역대 원우회, 건의사항, 상조회, 동아리, 네트워킹, FAQ와 일정 카드는 기존 section 대신 실제 slug로 `openManagedBoard`를 호출한다.

- [ ] **Step 6: legacy render 조건과 사용하지 않는 상태 정리**

통합 콘텐츠 switch로 이동한 `section === "notices"`, `boards`, `executives`, `cohortLeaders`, `pastCouncils`, `posts`, `suggestions`, `mutualAid`, `faqs`, `events` 최상위 조건과 전용 진입 버튼을 제거한다. 해당 폼 상태와 mutation은 콘텐츠 render 함수가 계속 사용하므로 삭제하지 않는다. 사용하지 않는 `BoardScope`, `BOARD_SCOPE_FILTERS`, `postContentScope`, `dedicatedSection` 관련 코드를 제거한다.

- [ ] **Step 7: focused tests와 타입 검사**

Run: `cd frontend; npx tsx --test tests/adminContentManagement.test.ts tests/adminBoardManagementUi.test.ts tests/adminBoardSettings.test.ts`

Expected: PASS, 0 failures.

Run: `cd frontend; npm run typecheck`

Expected: exit 0.

- [ ] **Step 8: Task 6 커밋**

```bash
git add -- frontend/utils/adminContentManagement.ts frontend/tests/adminContentManagement.test.ts frontend/tests/adminBoardManagementUi.test.ts
git add -p -- frontend/app/admin/index.tsx
git diff --cached --check
git commit -m "refactor(frontend): consolidate admin board navigation"
```

### Task 7: 계약 문서, 전체 회귀 검증과 PR 갱신

**Files:**
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- Modify: `CODEX.md`
- Verify: all implementation files and repository state

**Interfaces:**
- Consumes: Tasks 1-6의 통합 관리자 구현
- Produces: Phase 2 경로 계약, QA 180 완료 기록, 검증 증거

- [ ] **Step 1: 프론트엔드 경로 계약 교체**

`docs/phase2/FRONTEND_ROUTE_SPEC.md`의 기존 관리자 게시글 관리 문단을 다음 계약으로 교체한다.

```text
The admin console exposes one Board Management entry. It groups every board as All, Notices, Community/Resources, Participation, or Council, then selects an actual board and either Content or Settings. Board-type content editors stay in the selected board instead of navigating to separate notice, suggestion, mutual-aid, council-introduction, FAQ, or calendar sections. Existing slugs, categories, board types, privacy policies, content formats, APIs, and server-side admin authorization remain unchanged.
```

대표 이미지 첫 첨부 교체와 기존 필드/첨부 보존 규칙은 유지한다.

- [ ] **Step 2: CODEX 완료 기록 갱신**

QA 180 항목을 통합 `게시판 관리`에서 `참여활동 → 동아리 홍보 → 콘텐츠`로 대표 이미지를 바꿀 수 있다고 기록한다. 공지, 커뮤니티·자료, 참여활동, 원우회 모두 같은 구조를 사용하고 DB migration이 없음을 함께 기록한다.

- [ ] **Step 3: 문서 whitespace 확인 및 커밋**

Run: `git diff --check`

Expected: exit 0.

```bash
git add -- docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md
git commit -m "docs: document unified admin board management"
```

- [ ] **Step 4: frontend 전체 테스트**

Run: `cd frontend; npm test`

Expected: all tests PASS, 0 failures.

- [ ] **Step 5: 타입 검사와 린트**

Run: `cd frontend; npm run typecheck`

Expected: exit 0.

Run: `cd frontend; npm run lint`

Expected: exit 0 and 0 ESLint errors. Existing warnings may remain only if they are unchanged from the branch baseline.

- [ ] **Step 6: 웹 export**

Run: `cd frontend; npm run export:web`

Expected: exit 0 and `frontend/dist` generated successfully.

- [ ] **Step 7: 변경 범위와 사용자 작업 보존 확인**

Run: `git status --short --branch`

Expected: feature commits are clean relative to the branch; the pre-existing `frontend/app/admin/index.tsx` KST hunks, `frontend/tests/dateFormat.test.ts`, `frontend/utils/dateFormat.ts` and unrelated untracked user files remain unstaged and uncommitted.

Run: `git diff --check`

Expected: exit 0.

Run: `git log --oneline --decorate -10`

Expected: each task commit is present on `codex/admin-board-content-controls` and no user-only commit was created.

- [ ] **Step 8: 관리자 수동 회귀 체크**

로컬 web에서 관리자 로그인 후 다음을 확인한다.

1. 사이드 메뉴에 `게시판 관리`만 있고 기존 게시판 관련 중복 메뉴가 없다.
2. 모든 그룹에 실제 게시판 선택 단계가 있고 현재 등록 게시판이 누락되지 않는다.
3. 표준 게시글 검색·작성·수정·고정·삭제가 동작한다.
4. 공지 작성/수정, 건의 답변, 상조회 완료/반려가 통합 화면 안에서 동작한다.
5. 임원진, 기장단, 역대 원우회, 일정과 FAQ 저장이 기존 사용자 화면에 반영된다.
6. 강의후기 익명/댓글 불가와 시험족보 작성자/댓글 정책이 유지된다.
7. 동아리·네트워킹 대표 이미지 변경 후 본문, metadata와 다른 첨부가 유지된다.
8. 외부 링크 저장 시 기존 metadata가 유지되고 `http(s)` 외 URL이 거절된다.

- [ ] **Step 9: PR push 및 CI 확인**

Run: `git push origin codex/admin-board-content-controls`

Expected: remote feature branch advances without updating `main`.

PR #14의 설명을 통합 관리자 구조와 새 검증 결과로 갱신하고 Frontend, Backend, Docker build가 모두 성공하는지 확인한다. CI 실패 시 해당 job 로그를 확인하고 같은 branch에서 수정·재검증한다. CI가 모두 성공하기 전에는 PR을 ready 또는 merge 상태로 바꾸지 않는다.

# Admin Board Content Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 게시글 관리를 그룹·게시판 탭으로 구성하고, 선택한 게시판의 전용 운영 기능과 동아리/네트워킹 대표 이미지 교체를 제공한다.

**Architecture:** 게시판 분류, 전용 제어 설명, 대표 이미지 첨부 교체를 순수 유틸리티로 분리해 Node 단위 테스트로 보호한다. 기존 단일 관리자 화면은 이 정책을 소비해 그룹/게시판 탭과 문맥별 액션을 렌더링하며, 대표 이미지는 기존 상세 조회·미디어 업로드·게시글 수정 API로 교체한다.

**Tech Stack:** React Native 0.81, Expo Router 6, TypeScript 5.9, TanStack Query 5, Node test runner, ESLint

**Spec:** `docs/superpowers/specs/2026-08-21-admin-board-content-controls-design.md`

## Global Constraints

- `게시판` 설정과 기존 공지, 배너, 원우회, 건의사항, 상조회, FAQ, 일정 관리자 기능을 유지한다.
- 기존 `전체 게시글 관리`의 전체 검색과 상태 필터를 유지한다.
- 대표 이미지 변경은 `club-promo`와 `networking-programs` 게시글에만 제공한다.
- 대표 이미지 변경 시 제목, 본문, 카테고리, 익명 여부, 메타데이터, 마감일과 대표 이미지 외 첨부 순서를 보존한다.
- DB 스키마, Alembic, seed와 수동 DB 작업을 하지 않는다.
- 현재 작업공간의 미커밋 일정 한국시간 변경을 보존하고 커밋 범위를 분리한다.

---

### Task 1: 게시판별 관리자 콘텐츠 정책

**Files:**
- Create: `frontend/utils/adminContentManagement.ts`
- Create: `frontend/tests/adminContentManagement.test.ts`

**Interfaces:**
- Consumes: `Board`, `MediaAsset` from `frontend/types/index.ts`
- Produces: `AdminContentScope = "all" | "notices" | "participation" | "community" | "council"`
- Produces: `adminContentBoards(boards: Board[], scope: AdminContentScope): Board[]`
- Produces: `adminBoardContentControl(board?: Board): AdminBoardContentControl`
- Produces: `replaceRepresentativeImage(attachments: MediaAsset[], replacement: MediaAsset): MediaAsset[]`

- [ ] **Step 1: 실패하는 게시판 분류 테스트 작성**

`frontend/tests/adminContentManagement.test.ts`에 표준 게시글 게시판 fixture를 만들고 다음 결과를 literal로 검증한다.

```ts
test("참여활동 탭은 참여·동아리·스터디·동문 게시글 게시판만 보여준다", () => {
  assert.deepEqual(
    adminContentBoards(boards, "participation").map((board) => board.slug),
    ["club-activity", "club-promo", "study-recruit", "networking-programs"],
  );
});

test("표준 게시글이 아닌 관리자 콘텐츠는 게시글 탭에서 제외한다", () => {
  assert.deepEqual(
    adminContentBoards(boards, "council").map((board) => board.slug),
    ["council-activity", "suggestions", "mutual-aid"],
  );
});
```

- [ ] **Step 2: 테스트가 기대한 이유로 실패하는지 확인**

Run: `cd frontend && npx tsx --test tests/adminContentManagement.test.ts`

Expected: FAIL with `Cannot find module '../utils/adminContentManagement'`.

- [ ] **Step 3: 최소 게시판 정책 구현**

`frontend/utils/adminContentManagement.ts`에 표준 게시글 type allowlist와 category 기반 scope 매핑을 구현한다. `sort_order`, 그다음 `id`로 정렬하고 원본 배열을 변경하지 않는다.

```ts
const ADMIN_CONTENT_BOARD_TYPES = new Set([
  "notice", "album", "resource", "activity_certification", "activity_history", "suggestion", "mutual_aid", "post",
]);

const SCOPE_CATEGORIES = {
  notices: ["notices"],
  participation: ["participation", "club", "study", "alumni"],
  community: ["community", "resources"],
  council: ["council", "gsa"],
} as const;
```

- [ ] **Step 4: 게시판 전용 제어 실패 테스트 작성**

공지, 동아리 안내, 네트워킹, 건의사항, 상조회, 앨범과 일반 게시판 fixture를 사용해 `kind`, `createLabel`, `dedicatedSection`, `canReplaceRepresentativeImage`의 literal 결과를 검증한다.

- [ ] **Step 5: 전용 제어 테스트가 기대한 이유로 실패하는지 확인**

Run: `cd frontend && npx tsx --test tests/adminContentManagement.test.ts`

Expected: FAIL because `adminBoardContentControl` does not yet return the approved board-specific values.

- [ ] **Step 6: 최소 전용 제어 구현**

slug와 board type을 사용해 다음 우선순위로 제어를 반환한다: 공지, `club-promo`, `networking-programs`, suggestion, mutual aid, album, activity certification, resource, standard.

- [ ] **Step 7: 대표 이미지 교체 실패 테스트 작성**

이미지 앞 문서가 있는 배열, 이미지가 두 장인 배열, 이미지가 없는 배열을 사용해 첫 이미지 교체와 나머지 상대 순서 보존을 검증한다.

```ts
assert.deepEqual(
  replaceRepresentativeImage([document, oldHero, gallery], newHero).map((item) => item.id),
  [document.id, newHero.id, gallery.id],
);
assert.deepEqual(
  replaceRepresentativeImage([document], newHero).map((item) => item.id),
  [newHero.id, document.id],
);
```

- [ ] **Step 8: 대표 이미지 교체 테스트가 기대한 이유로 실패하는지 확인**

Run: `cd frontend && npx tsx --test tests/adminContentManagement.test.ts`

Expected: FAIL because the old representative image remains or the new image is appended in the wrong position.

- [ ] **Step 9: 최소 교체 로직 구현 후 관련 테스트 통과 확인**

Run: `cd frontend && npx tsx --test tests/adminContentManagement.test.ts`

Expected: PASS, 0 failures.

### Task 2: 관리자 그룹·게시판 탭과 문맥 제어 연결

**Files:**
- Modify: `frontend/app/admin/index.tsx`
- Test: `frontend/tests/adminContentManagement.test.ts`

**Interfaces:**
- Consumes: Task 1의 `adminContentBoards`, `adminBoardContentControl`
- Produces: 관리자 `게시글 관리`의 그룹 탭, 게시판 탭, 선택 게시판 안내와 전용 진입 버튼

- [ ] **Step 1: 선택 상태 전이 실패 테스트 작성**

`frontend/utils/adminContentManagement.ts`에 추가할 `nextAdminContentSelection(boards, currentBoardId, nextScope)`의 기대 결과를 테스트한다. `all`은 `null`, 그룹 전환은 현재 게시판이 그룹에 있으면 유지하고 아니면 첫 게시판 ID, 빈 그룹은 `null`을 반환해야 한다.

- [ ] **Step 2: 상태 전이 테스트가 기대한 이유로 실패하는지 확인**

Run: `cd frontend && npx tsx --test tests/adminContentManagement.test.ts`

Expected: FAIL because `nextAdminContentSelection` does not exist.

- [ ] **Step 3: 최소 상태 전이 구현과 테스트 통과**

Run: `cd frontend && npx tsx --test tests/adminContentManagement.test.ts`

Expected: PASS, 0 failures.

- [ ] **Step 4: 관리자 게시글 UI 연결**

`frontend/app/admin/index.tsx`에서 다음을 적용한다.

- `postContentScope` 상태를 추가한다.
- 게시글용 그룹 탭과 두 번째 게시판 탭에는 `adminContentBoards`만 사용한다.
- 그룹 전환은 `nextAdminContentSelection`으로 `postBoardId`를 함께 갱신한다.
- 선택 게시판의 `AdminBoardContentControl` 설명, 등록 버튼과 기존 전용 섹션 진입 버튼을 렌더링한다.
- `전체` 검색·상태 필터와 모든 기존 `AdminPostCard` 액션을 유지한다.
- 카드에 실제 `Board`를 전달해 게시판 정책을 판단한다.

- [ ] **Step 5: 타입 검사와 정책 테스트 실행**

Run: `cd frontend && npx tsx --test tests/adminContentManagement.test.ts && npm run typecheck`

Expected: 테스트 PASS, 타입 검사 exit 0.

### Task 3: 관리자 대표 이미지 직접 교체

**Files:**
- Modify: `frontend/app/admin/index.tsx`
- Test: `frontend/tests/adminContentManagement.test.ts`

**Interfaces:**
- Consumes: `postApi.getPostDetail`, `pickAndUploadContentImage`, `postApi.updatePost`, `replaceRepresentativeImage`
- Produces: 동아리/네트워킹 관리자 카드의 현재 대표 이미지 미리보기와 `대표 이미지 변경` 액션

- [ ] **Step 1: 게시글 수정 payload 보존 실패 테스트 작성**

`frontend/utils/adminContentManagement.ts`에 추가할 `representativeImageUpdatePayload(detail, replacement)`이 제목, 본문, 카테고리, 익명 여부, 메타데이터, 마감일을 literal fixture와 동일하게 보존하고 attachment ID만 교체하는지 검증한다.

- [ ] **Step 2: 테스트가 기대한 이유로 실패하는지 확인**

Run: `cd frontend && npx tsx --test tests/adminContentManagement.test.ts`

Expected: FAIL because `representativeImageUpdatePayload` does not exist.

- [ ] **Step 3: 최소 payload 생성 구현과 테스트 통과**

Run: `cd frontend && npx tsx --test tests/adminContentManagement.test.ts`

Expected: PASS, 0 failures.

- [ ] **Step 4: 관리자 카드와 저장 핸들러 연결**

`frontend/app/admin/index.tsx`에 현재 교체 중인 post ID 상태와 handler를 추가한다. handler는 상세 조회, 단일 이미지 선택/업로드, 보존 payload 생성, 게시글 수정 순으로 실행하고 성공 시 `admin-posts`, `posts`, `post` 캐시를 무효화한다. `AdminPostCard`는 동아리/네트워킹에만 `MediaImage` 미리보기와 교체 버튼을 렌더링하고 진행 중 중복 실행을 막는다.

- [ ] **Step 5: 관련 테스트와 타입 검사 실행**

Run: `cd frontend && npx tsx --test tests/adminContentManagement.test.ts tests/postDetailImagePresentation.test.ts && npm run typecheck`

Expected: 모든 테스트 PASS, 타입 검사 exit 0.

### Task 4: 계약과 백로그 갱신

**Files:**
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- Modify: `CODEX.md`

**Interfaces:**
- Consumes: Tasks 1-3의 관리자 게시판별 콘텐츠 제어
- Produces: 현재 관리자 UI와 일치하는 Phase 2 계약 및 QA 180 완료 기록

- [ ] **Step 1: 프론트엔드 계약 갱신**

관리자 게시글 관리는 그룹/게시판 탭을 사용하고, 선택 게시판의 기존 전용 운영 화면을 연결하며, `club-promo`와 `networking-programs` 카드에서 첫 이미지 첨부를 대표 이미지로 교체한다는 규칙을 추가한다.

- [ ] **Step 2: CODEX 완료 기록 추가**

QA 180이 관리자 게시글 관리의 게시판별 제어와 대표 이미지 변경으로 해결되었고 DB 변경이 없다는 항목을 추가한다.

- [ ] **Step 3: 문서와 whitespace 검사**

Run: `git diff --check`

Expected: exit 0.

### Task 5: 전체 회귀 검증과 범위 확인

**Files:**
- Verify: `frontend/`
- Verify: repository diff and branch state

**Interfaces:**
- Consumes: Tasks 1-4 전체 변경
- Produces: 기존 관리자 기능과 새 게시판별 제어의 회귀 검증 결과

- [ ] **Step 1: 프론트엔드 전체 테스트 실행**

Run: `cd frontend && npm test`

Expected: PASS, 0 failures.

- [ ] **Step 2: 타입 검사와 린트 실행**

Run: `cd frontend && npm run typecheck && npm run lint`

Expected: exit 0, lint errors 0.

- [ ] **Step 3: 웹 번들 생성 확인**

Run: `cd frontend && npm run export:web`

Expected: exit 0 and a generated `frontend/dist` web bundle.

- [ ] **Step 4: 기존 사용자 변경과 구현 변경 분리 확인**

Run: `git status --short --branch; git diff --check; git diff -- frontend/app/admin/index.tsx frontend/utils/adminContentManagement.ts frontend/tests/adminContentManagement.test.ts docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md`

Expected: 일정 한국시간 변경은 보존되고, 계획되지 않은 사용자 파일은 수정·삭제·스테이징되지 않는다.

- [ ] **Step 5: 구현 파일만 커밋**

Stage only the new admin-content implementation, tests, spec, plan, contract, and CODEX hunks. Do not stage the existing `dateFormat` files or unrelated untracked files. Because `frontend/app/admin/index.tsx` contains preserved user work, verify its complete diff before staging that file.

# Post Edit Field Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 값이 채워진 게시글 수정 화면에서도 제목과 내용 입력칸을 고정 라벨로 즉시 구분하게 한다.

**Architecture:** 공통 게시글 수정 라우트가 이미 가진 `fieldLabel` 스타일을 재사용하고 제목·내용 라벨의 `isStudyRecruit` 조건만 제거한다. 게시판별 추가 필드는 기존 조건을 유지하며, 현재 프로젝트의 디자인 회귀 테스트에서 라벨이 조건문 밖에 있는지 검증한다.

**Tech Stack:** React Native, Expo Router, TypeScript, Node test runner

## Global Constraints

- `제목`과 `내용` 라벨은 게시판 slug 조회 결과와 무관하게 항상 표시한다.
- 앨범처럼 내용 입력칸 자체가 없는 화면에는 `내용` 라벨을 추가하지 않는다.
- 스터디의 모집 상태와 연락수단, 기존 입력값과 저장 payload는 변경하지 않는다.
- 새 의존성을 추가하지 않는다.
- 사용자 작업 중인 다른 파일을 스테이징하거나 수정하지 않는다.

---

### Task 1: Make title and content labels unconditional

**Files:**
- Modify: `frontend/tests/designBugVerification.test.ts:113`
- Modify: `frontend/app/board/post/edit/[postId].tsx:209`
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md:40`

**Interfaces:**
- Consumes: existing `styles.fieldLabel`, title/content `Controller` blocks, and `isAlbum` guard.
- Produces: unconditional `제목` label and content-controller-scoped `내용` label.

- [ ] **Step 1: Write the failing regression test**

Replace the current study-only label assertion with a contract that rejects conditional title/content labels and retains checks for the study-specific fields:

```ts
test("#71 게시글 수정 화면은 제목과 내용 라벨을 게시판 종류와 관계없이 노출한다", () => {
  assert.match(postEditSource, /<Text style=\{styles\.fieldLabel\}>제목<\/Text>\s*<TextInput/);
  assert.match(postEditSource, /<Text style=\{styles\.fieldLabel\}>내용<\/Text>\s*<TextInput/);
  assert.doesNotMatch(postEditSource, /isStudyRecruit \? <Text style=\{styles\.fieldLabel\}>(?:제목|내용)<\/Text>/);

  for (const label of ["모집 상태", "스터디장 연락수단"]) {
    assert.match(postEditSource, new RegExp(`>${label}<`));
  }
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run from `frontend`:

```powershell
.\node_modules\.bin\tsx.cmd --test tests/designBugVerification.test.ts
```

Expected: FAIL because the title and content labels are still wrapped in `isStudyRecruit` conditions.

- [ ] **Step 3: Implement the minimal UI change**

In each existing controller, replace the conditional label with the same unconditional label:

```tsx
<Text style={styles.fieldLabel}>제목</Text>
```

```tsx
<Text style={styles.fieldLabel}>내용</Text>
```

Add the route contract note:

```md
- 게시글 수정 화면은 기존 입력값이 placeholder를 가려도 필드를 구분할 수 있도록 `제목`과 `내용` 라벨을 항상 노출한다.
```

- [ ] **Step 4: Run focused and full verification**

Run from `frontend`:

```powershell
.\node_modules\.bin\tsx.cmd --test tests/designBugVerification.test.ts
npm test
npm run typecheck
npm run lint
npm run export:web
```

Expected: all commands exit `0`; the complete test suite reports no failures and the static web export completes.

- [ ] **Step 5: Review and commit only scoped files**

Run from the repository root:

```powershell
git diff --check -- frontend/tests/designBugVerification.test.ts frontend/app/board/post/edit/[postId].tsx docs/phase2/FRONTEND_ROUTE_SPEC.md
git add -- frontend/tests/designBugVerification.test.ts frontend/app/board/post/edit/[postId].tsx docs/phase2/FRONTEND_ROUTE_SPEC.md
git diff --cached --check
git commit -m "fix(frontend): label post edit fields"
```

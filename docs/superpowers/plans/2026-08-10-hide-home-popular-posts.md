# Hide Home Popular Posts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 화면의 인기 게시글 섹션을 비노출 상태로 유지하면서 관련 코드는 한 블록에 보존하고 게시판의 인기순 정렬은 그대로 둔다.

**Architecture:** `HomeSectionGate`가 비노출 섹션의 자식 컴포넌트를 마운트하지 않도록 한다. 홈 인기글 조회와 렌더링은 `HomePopularPostsSection` 안에 모아, 게이트가 닫힌 동안 React Query 요청도 실행되지 않게 한다.

**Tech Stack:** React 19, React Native 0.81, Expo Router, TanStack React Query, Node test runner

## Global Constraints

- `SHOW_HOME_POPULAR_POSTS`는 `false`로 유지한다.
- `// 이 부분이 홈 인기게시글 코드입니다.` 주석으로 보존 코드 위치를 표시한다.
- 게시판 화면의 `sort: "popular"` 지원은 수정하지 않는다.

---

### Task 1: 홈 인기 게시글 게이트와 비노출 처리

**Files:**
- Create: `frontend/components/HomeSectionGate.tsx`
- Create: `frontend/tests/homeSectionGate.test.ts`
- Modify: `frontend/app/(tabs)/home.tsx`

**Interfaces:**
- Produces: `HomeSectionGate({ visible, children }): ReactNode`
- Produces: 내부 전용 `HomePopularPostsSection({ boardId, compact, boardsError, refetchBoards })`

- [ ] **Step 1: 비노출 게이트의 실패 테스트 작성**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import HomeSectionGate from "../components/HomeSectionGate";

test("닫힌 홈 섹션은 자식 UI를 렌더링하지 않는다", () => {
  const markup = renderToStaticMarkup(
    createElement(HomeSectionGate, { visible: false }, createElement("h2", null, "🔥 인기 게시글")),
  );
  assert.equal(markup, "");
});
```

- [ ] **Step 2: 테스트가 올바른 이유로 실패하는지 확인**

Run: `npx tsx --test tests/homeSectionGate.test.ts`

Expected: `ERR_MODULE_NOT_FOUND`로 `HomeSectionGate` 구현이 아직 없어서 실패한다.

- [ ] **Step 3: 최소 게이트 구현 추가**

```tsx
import type { ReactNode } from "react";

export default function HomeSectionGate({ visible, children }: { visible: boolean; children: ReactNode }) {
  return visible ? children : null;
}
```

- [ ] **Step 4: 홈 인기글 코드를 한 컴포넌트 블록으로 이동하고 게이트 적용**

`frontend/app/(tabs)/home.tsx`에 `SHOW_HOME_POPULAR_POSTS = false`를 추가한다. `HomePopularPostsSection` 내부로 인기글 `useQuery`, 로딩·오류·빈 상태, 카드 렌더링을 이동하고 다음 형태로 홈 본문에 배치한다.

```tsx
<HomeSectionGate visible={SHOW_HOME_POPULAR_POSTS}>
  <HomePopularPostsSection
    boardId={popularBoardId}
    boardsError={boardsError}
    compact={compact}
    refetchBoards={refetchBoards}
  />
</HomeSectionGate>
```

- [ ] **Step 5: 집중 테스트와 타입 검사 실행**

Run: `npx tsx --test tests/homeSectionGate.test.ts`

Expected: PASS

Run: `npm run typecheck`

Expected: exit code 0

- [ ] **Step 6: 웹 홈 화면 검증**

Run: `npm run web`

Expected: 홈에서 `🔥 인기 게시글` 제목과 카드가 보이지 않고 공지사항, 서강생활 일정, 행사 사진첩은 계속 보인다.

- [ ] **Step 7: 변경 파일만 커밋**

```powershell
git add -- 'frontend/components/HomeSectionGate.tsx' 'frontend/tests/homeSectionGate.test.ts' 'frontend/app/(tabs)/home.tsx'
git commit -m "fix(frontend): hide home popular posts section"
```

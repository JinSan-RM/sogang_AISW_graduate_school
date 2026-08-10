# Notice Detail Image Containment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공지사항 상세의 모든 이미지 첨부를 높이 230px의 고정 프레임 안에서 잘림 없이 표시한다.

**Architecture:** 기존 게시글 상세 첨부 렌더링에서 `isNotice`만 분기한다. 공지는 `MediaImage`와 `resizeMode="contain"`을 사용하고, 다른 게시판은 기존 `NaturalAspectMediaImage`를 유지해 영향 범위를 제한한다.

**Tech Stack:** React Native, Expo Router, TypeScript, Node test runner

## Global Constraints

- 공지 이미지 프레임은 본문 너비 전체와 정확히 `230px` 높이를 사용한다.
- 공지 이미지는 `resizeMode="contain"`으로 전체가 보여야 한다.
- 프레임의 남는 영역은 기존 `#F3F4F6` 배경을 유지한다.
- 공지가 아닌 게시판의 원본 비율 이미지 표시와 첨부 클릭 동작은 변경하지 않는다.

---

### Task 1: Notice-only fixed image frame

**Files:**
- Modify: `frontend/tests/designBugVerification.test.ts:61`
- Modify: `frontend/app/board/post/[postId].tsx:738`
- Modify: `frontend/app/board/post/[postId].tsx:1774`
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md:109`

**Interfaces:**
- Consumes: existing `isNotice`, `MediaImage`, `NaturalAspectMediaImage`, and protected media URL handling in the post-detail attachment loop.
- Produces: notice-only `styles.noticeImageAttachment` and `styles.noticeAttachmentImage` rendering.

- [ ] **Step 1: Write the failing regression test**

Replace the generic attachment assertion with checks that the notice branch uses a fixed `contain` image while the fallback keeps the natural-aspect component:

```ts
test("공지 상세 이미지는 고정 프레임 안에 전체 사진을 표시한다", () => {
  assert.match(postDetailSource, /isNotice \? \([\s\S]*<MediaImage media=\{attachment\} resizeMode="contain" style=\{styles\.noticeAttachmentImage\}/);
  assert.match(postDetailSource, /<NaturalAspectMediaImage media=\{attachment\} style=\{styles\.attachmentImage\}/);
  assert.match(postDetailSource, /noticeImageAttachment:[\s\S]*height: 230/);
  assert.match(postDetailSource, /noticeAttachmentImage:[\s\S]*width: "100%"[\s\S]*height: "100%"/);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
.\node_modules\.bin\tsx.cmd --test tests/designBugVerification.test.ts
```

Expected: FAIL because the notice-only renderer and styles do not exist.

- [ ] **Step 3: Implement the minimal notice branch**

Inside the existing image attachment branch, render:

```tsx
{isImage ? (
  isNotice ? (
    <MediaImage media={attachment} resizeMode="contain" style={styles.noticeAttachmentImage} />
  ) : (
    <NaturalAspectMediaImage media={attachment} style={styles.attachmentImage} />
  )
) : null}
```

Add the notice-only container style to the image `Pressable` and define:

```ts
noticeImageAttachment: {
  height: 230,
},
noticeAttachmentImage: {
  width: "100%",
  height: "100%",
},
```

Document the notice-only fixed-frame rule in `FRONTEND_ROUTE_SPEC.md`.

- [ ] **Step 4: Run focused and full verification**

Run:

```powershell
.\node_modules\.bin\tsx.cmd --test tests/designBugVerification.test.ts
npm test
npm run typecheck
npm run lint
npm run export:web
```

Expected: all commands exit `0` and the static web export completes.

- [ ] **Step 5: Review and commit**

Run:

```powershell
git diff --check
git add -- frontend/tests/designBugVerification.test.ts frontend/app/board/post/[postId].tsx docs/phase2/FRONTEND_ROUTE_SPEC.md
git commit -m "fix(frontend): contain notice detail images"
```

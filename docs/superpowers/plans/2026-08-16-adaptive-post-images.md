# Adaptive Post Detail Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공지사항과 참여활동 상세의 가로·세로 이미지가 전체 너비와 원본 비율을 사용해 내부 여백과 잘림 없이 표시되게 한다.

**Architecture:** 순수 함수 `postDetailImagePresentation`이 게시판과 이미지 위치를 받아 `natural`, `fixed-contain`, `fixed-cover` 중 하나를 결정한다. 게시글 상세는 이 정책에 따라 기존 `NaturalAspectMediaImage`를 재사용하고, 갤러리 선택 이미지 ID를 컴포넌트 키로 사용해 이미지 전환마다 비율 상태를 초기화한다.

**Tech Stack:** React Native 0.81, Expo Router 6, TypeScript 5.9, Node test runner, ESLint

## Global Constraints

- 이미지 너비는 해당 상세 화면에서 사용할 수 있는 너비의 `100%`다.
- 이미지 원본 `width / height`를 화면 `aspectRatio`로 사용한다.
- 세로 이미지에 최대 높이를 강제로 적용하지 않는다.
- 이미지 크기를 판독할 수 없을 때만 `16 / 9`를 임시 대체값으로 사용한다.
- 행사 사진첩, 원우회 활동내역, 상조회 증빙, 일반 커뮤니티 첨부의 이미지 정책은 변경하지 않는다.
- 이미지 열기, 보호 URL, 갤러리 화살표와 장수 표시는 유지한다.

---

### Task 1: 게시글 상세의 자연 비율 이미지 렌더링

**Files:**
- Create: `frontend/utils/postDetailImagePresentation.ts`
- Create: `frontend/tests/postDetailImagePresentation.test.ts`
- Modify: `frontend/tests/designBugVerification.test.ts`
- Modify: `frontend/app/board/post/[postId].tsx`

**Interfaces:**
- Consumes: `NaturalAspectMediaImage({ media, fallbackAspectRatio?, style, ...MediaImageProps })`
- Produces: `postDetailImagePresentation(input: PostDetailImagePresentationInput): "natural" | "fixed-contain" | "fixed-cover"`
- Produces: 공지 첨부와 참여활동 대표 이미지에 적용되는 자연 비율 렌더링 및 갤러리 이미지별 상태 초기화

- [ ] **Step 1: 실패하는 회귀 테스트 작성**

`frontend/tests/designBugVerification.test.ts`의 이전 고정 프레임 소스 검사를 제거하고, `frontend/tests/postDetailImagePresentation.test.ts`를 생성한다. 이 테스트는 실제 정책 함수를 가져와 사용자에게 보이는 레이아웃 결정을 검증한다.

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { postDetailImagePresentation } from "../utils/postDetailImagePresentation";

test("공지 첨부와 일반 첨부는 원본 비율을 사용한다", () => {
  assert.equal(postDetailImagePresentation({ placement: "attachment", boardType: "notice" }), "natural");
  assert.equal(postDetailImagePresentation({ placement: "attachment", boardType: "post" }), "natural");
});

test("참여활동 대표 이미지는 원본 비율을 사용한다", () => {
  assert.equal(postDetailImagePresentation({ placement: "hero", boardType: "activity_certification" }), "natural");
  assert.equal(postDetailImagePresentation({ placement: "hero", boardType: "post", boardSlug: "club-promo" }), "natural");
  assert.equal(postDetailImagePresentation({ placement: "hero", boardType: "post", boardSlug: "networking-programs" }), "natural");
});

test("사진첩의 승인된 고정 contain 프레임은 유지한다", () => {
  assert.equal(postDetailImagePresentation({ placement: "hero", boardType: "album" }), "fixed-contain");
});
```

- [ ] **Step 2: 테스트가 기대한 이유로 실패하는지 확인**

Run: `cd frontend && npx tsx --test tests/postDetailImagePresentation.test.ts`

Expected: FAIL with `Cannot find module '../utils/postDetailImagePresentation'` because the presentation policy does not exist yet.

- [ ] **Step 3: 최소 구현 적용**

`frontend/utils/postDetailImagePresentation.ts`를 생성한다.

```ts
export type PostDetailImagePresentation = "natural" | "fixed-contain" | "fixed-cover";

type PostDetailImagePresentationInput = {
  placement: "hero" | "attachment";
  boardType?: string | null;
  boardSlug?: string | null;
  isCouncilActivityEntry?: boolean;
};

export function postDetailImagePresentation({
  placement,
  boardType,
  boardSlug,
  isCouncilActivityEntry = false,
}: PostDetailImagePresentationInput): PostDetailImagePresentation {
  if (placement === "attachment") return "natural";
  if (boardType === "album") return "fixed-contain";
  if (
    boardType === "activity_certification"
    || boardSlug === "club-promo"
    || boardSlug === "networking-programs"
    || isCouncilActivityEntry
  ) {
    return "natural";
  }
  return "fixed-cover";
}
```

`frontend/app/board/post/[postId].tsx`에서 이 정책을 호출하고 자연 비율 대상과 렌더링을 다음 형태로 변경한다.

```tsx
const heroImagePresentation = postDetailImagePresentation({
  placement: "hero",
  boardType: board?.board_type,
  boardSlug: board?.slug,
  isCouncilActivityEntry,
});
const attachmentImagePresentation = postDetailImagePresentation({
  placement: "attachment",
  boardType: board?.board_type,
  boardSlug: board?.slug,
});
const hasNaturalHero = heroImagePresentation === "natural";

<View style={[hasNaturalHero ? styles.visualHeroNatural : styles.visualHero, isPhotoAlbum ? styles.visualHeroAlbum : null]}>
  {heroAttachment ? (
    hasNaturalHero ? (
      <NaturalAspectMediaImage
        key={heroAttachment.id}
        media={heroAttachment}
        style={styles.visualHeroNaturalImage}
      />
    ) : (
      <MediaImage
        media={heroAttachment}
        resizeMode={heroImagePresentation === "fixed-contain" ? "contain" : "cover"}
        style={styles.visualHeroImage}
      />
    )
  ) : (
    <LinearGradient
      colors={board?.board_type === "album" ? ALBUM_FALLBACK_GRADIENTS[normalizedGalleryIndex % ALBUM_FALLBACK_GRADIENTS.length] : ["#2761FF", "#86C8FF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.visualHeroFallback, hasNaturalHero ? styles.visualHeroFallbackNatural : null]}
    />
  )}
</View>
```

공지 및 일반 첨부 이미지 분기를 자연 비율 렌더러 하나로 합친다.

```tsx
style={isImage ? styles.imageAttachment : styles.fileAttachment}

{isImage && attachmentImagePresentation === "natural" ? (
  <NaturalAspectMediaImage media={attachment} style={styles.attachmentImage} />
) : null}
```

`noticeImageAttachment`와 `noticeAttachmentImage` 스타일은 제거한다. 사진첩의 고정 `visualHeroAlbum`과 `contain`, 기존 fallback, 화살표 및 카운터는 유지한다.

- [ ] **Step 4: 회귀 테스트 통과 확인**

Run: `cd frontend && npx tsx --test tests/postDetailImagePresentation.test.ts`

Expected: PASS, 0 failures.

- [ ] **Step 5: 관련 단위 테스트 통과 확인**

Run: `cd frontend && npx tsx --test tests/imageDimensions.test.ts tests/postDetailImagePresentation.test.ts tests/designBugVerification.test.ts`

Expected: PASS, 0 failures.

- [ ] **Step 6: 구현 커밋**

```bash
git add frontend/utils/postDetailImagePresentation.ts frontend/tests/postDetailImagePresentation.test.ts frontend/tests/designBugVerification.test.ts frontend/app/board/post/[postId].tsx
git commit -m "fix(frontend): adapt post images to natural aspect ratios"
```

### Task 2: 프론트엔드 계약 문서 갱신

**Files:**
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- Modify: `docs/superpowers/specs/2026-08-10-notice-image-contain-design.md`

**Interfaces:**
- Consumes: Task 1에서 구현한 자연 비율 공지·참여활동 상세 이미지 정책
- Produces: 현재 동작과 일치하는 프론트엔드 계약 및 이전 설계의 대체 상태

- [ ] **Step 1: 프론트엔드 계약의 이전 고정 프레임 문구 확인**

Run: `rg -n "Notice-detail image attachments|230px|contain sizing" docs/phase2/FRONTEND_ROUTE_SPEC.md docs/superpowers/specs/2026-08-10-notice-image-contain-design.md`

Expected: 두 문서에서 이전 `230px`/`contain` 정책이 검색된다.

- [ ] **Step 2: 계약 문구 갱신**

`docs/phase2/FRONTEND_ROUTE_SPEC.md`의 공지 이미지 표시 규칙을 다음 내용으로 교체한다.

```markdown
- Notice-detail and participation-detail images use the available full width and each image's natural aspect ratio so landscape and portrait images remain fully visible without internal letterboxing or cropping; other post-detail image policies remain unchanged.
```

`docs/superpowers/specs/2026-08-10-notice-image-contain-design.md` 제목 아래에 다음 대체 안내를 추가한다.

```markdown
> Superseded on 2026-08-16 by `2026-08-16-adaptive-post-images-design.md`. The fixed `230px` notice frame below is retained only as historical context.
```

- [ ] **Step 3: 모순과 자리표시자 검사**

Run: `rg -n "TBD|TODO|FIXME" docs/phase2/FRONTEND_ROUTE_SPEC.md docs/superpowers/specs/2026-08-10-notice-image-contain-design.md docs/superpowers/specs/2026-08-16-adaptive-post-images-design.md; git diff --check`

Expected: 새 자리표시자와 whitespace 오류가 없다. `rg`는 기존 문서에 해당 문자열이 없으면 exit 1이어도 정상이다.

- [ ] **Step 4: 문서 커밋**

```bash
git add docs/phase2/FRONTEND_ROUTE_SPEC.md docs/superpowers/specs/2026-08-10-notice-image-contain-design.md
git commit -m "docs: align post image presentation contract"
```

### Task 3: 전체 검증, 화면 캡처와 푸시

**Files:**
- Verify: `frontend/`
- Create outside repository: `C:/Users/yug67/.codex/visualizations/2026/08/16/01a008c3-9814-7f33-960c-27daa212001c/adaptive-images-*.png`

**Interfaces:**
- Consumes: Task 1의 UI 구현과 Task 2의 계약 문서
- Produces: 자동 검증 결과, 가로·세로 화면 캡처, 원격 기능 브랜치

- [ ] **Step 1: 전체 프론트엔드 테스트 실행**

Run: `cd frontend && npm test`

Expected: PASS, 0 failures.

- [ ] **Step 2: 타입 검사와 린트 실행**

Run: `cd frontend && npm run typecheck && npm run lint`

Expected: 두 명령 모두 exit 0.

- [ ] **Step 3: 웹 번들 생성 확인**

Run: `cd frontend && npm run export:web`

Expected: exit 0이며 `frontend/dist`에 웹 번들이 생성된다.

- [ ] **Step 4: 로컬 웹에서 가로·세로 이미지 확인**

기존 인증 및 API 설정을 사용해 Expo 웹을 실행하고, 공지사항과 참여활동 상세에서 가로 사진과 세로 사진을 연다. 각 이미지의 표시 너비와 높이 비율이 원본 비율과 일치하는지 브라우저 DOM 수치와 화면으로 확인한다.

Expected: 이미지 내부의 좌우·상하 빈 여백이 없고 원본 내용이 잘리지 않는다.

- [ ] **Step 5: 변경 화면 캡처 저장**

가로형과 세로형 적용 화면을 각각 PNG로 저장한다.

```text
C:/Users/yug67/.codex/visualizations/2026/08/16/01a008c3-9814-7f33-960c-27daa212001c/adaptive-images-landscape.png
C:/Users/yug67/.codex/visualizations/2026/08/16/01a008c3-9814-7f33-960c-27daa212001c/adaptive-images-portrait.png
```

- [ ] **Step 6: 최종 변경 범위 확인**

Run: `git status --short --branch; git diff --check; git log -3 --oneline`

Expected: 사용자 소유 미추적 파일 외에 계획되지 않은 변경이 없고 새 구현·문서 커밋이 보인다.

- [ ] **Step 7: 기능 브랜치 푸시**

Run: `git push -u origin codex/adaptive-post-images`

Expected: 원격 추적 브랜치가 설정되고 push가 성공한다.

# Adaptive Post Detail Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공지사항과 참여활동 상세의 가로·세로 이미지를 원본 비율로 표시하되, 계산 높이가 `500px`를 넘는 사진에는 제한된 미리보기와 인앱 전체보기를 제공한다.

**Architecture:** 순수 함수 `postDetailImagePresentation`이 게시판과 이미지 위치의 기본 프레임 정책을 결정하고, `naturalImagePreviewLayout`이 컨테이너 너비와 원본 크기로 `500px` 초과 여부를 계산한다. 상세 전용 `ExpandableNaturalAspectMediaImage`가 일반 자연 비율 표시, 접힌 미리보기, 인앱 전체화면을 한 경계로 캡슐화한다.

**Tech Stack:** React Native 0.81, Expo Router 6, TypeScript 5.9, Node test runner, ESLint

## Global Constraints

- 이미지 너비는 해당 상세 화면에서 사용할 수 있는 너비의 `100%`다.
- 이미지 원본 `width / height`를 화면 `aspectRatio`로 사용한다.
- 계산된 자연 높이가 `500px` 이하면 전체 이미지를 표시하고, 초과하면 미리보기 높이를 `500px`로 제한한다.
- 제한된 미리보기에는 `사진 전체보기` 버튼을 표시하고, 인앱 전체화면에서는 현재 이미지를 원본 비율과 세로 스크롤로 모두 표시한다.
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

### Task 4: 500px 긴 이미지 미리보기와 인앱 전체보기

**Files:**
- Create: `frontend/utils/naturalImagePreview.ts`
- Create: `frontend/tests/naturalImagePreview.test.ts`
- Create: `frontend/components/ExpandableNaturalAspectMediaImage.tsx`
- Modify: `frontend/app/board/post/[postId].tsx`

**Interfaces:**
- Consumes: `imageDimensionsFromLoadEvent(event): ImageDimensions | undefined`
- Consumes: `MediaImage({ media, ...ImageProps })`
- Produces: `POST_DETAIL_IMAGE_PREVIEW_MAX_HEIGHT = 500`
- Produces: `naturalImagePreviewLayout(input): { aspectRatio: number; naturalHeight: number; previewHeight: number; isExpandable: boolean } | undefined`
- Produces: `ExpandableNaturalAspectMediaImage` with `media`, `fallbackAspectRatio`, `maxPreviewHeight`, `style`, and inherited `MediaImage` props

- [ ] **Step 1: 긴 이미지 경계의 실패 테스트 작성**

`frontend/tests/naturalImagePreview.test.ts`를 다음 내용으로 생성한다.

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  POST_DETAIL_IMAGE_PREVIEW_MAX_HEIGHT,
  naturalImagePreviewLayout,
} from "../utils/naturalImagePreview";

test("계산 높이가 500px 이하인 이미지는 전체 높이를 사용한다", () => {
  assert.equal(POST_DETAIL_IMAGE_PREVIEW_MAX_HEIGHT, 500);
  assert.deepEqual(
    naturalImagePreviewLayout({ containerWidth: 300, imageWidth: 600, imageHeight: 1000 }),
    { aspectRatio: 0.6, naturalHeight: 500, previewHeight: 500, isExpandable: false },
  );
});

test("계산 높이가 500px를 넘으면 미리보기 높이를 제한한다", () => {
  assert.deepEqual(
    naturalImagePreviewLayout({ containerWidth: 390, imageWidth: 1500, imageHeight: 2121 }),
    { aspectRatio: 1500 / 2121, naturalHeight: 390 * 2121 / 1500, previewHeight: 500, isExpandable: true },
  );
});

test("유효하지 않은 크기는 접힌 미리보기를 만들지 않는다", () => {
  assert.equal(naturalImagePreviewLayout({ containerWidth: 0, imageWidth: 1500, imageHeight: 2121 }), undefined);
  assert.equal(naturalImagePreviewLayout({ containerWidth: 390, imageWidth: 0, imageHeight: 2121 }), undefined);
});
```

- [ ] **Step 2: 테스트가 기대한 이유로 실패하는지 확인**

Run: `cd frontend && npx tsx --test tests/naturalImagePreview.test.ts`

Expected: FAIL with `Cannot find module '../utils/naturalImagePreview'` because the height policy does not exist yet.

- [ ] **Step 3: 순수 높이 정책 구현**

`frontend/utils/naturalImagePreview.ts`를 생성한다.

```ts
export const POST_DETAIL_IMAGE_PREVIEW_MAX_HEIGHT = 500;

type NaturalImagePreviewInput = {
  containerWidth: number;
  imageWidth: number;
  imageHeight: number;
  maxPreviewHeight?: number;
};

export function naturalImagePreviewLayout({
  containerWidth,
  imageWidth,
  imageHeight,
  maxPreviewHeight = POST_DETAIL_IMAGE_PREVIEW_MAX_HEIGHT,
}: NaturalImagePreviewInput) {
  if (![containerWidth, imageWidth, imageHeight, maxPreviewHeight].every((value) => Number.isFinite(value) && value > 0)) {
    return undefined;
  }
  const aspectRatio = imageWidth / imageHeight;
  const naturalHeight = containerWidth / aspectRatio;
  const isExpandable = naturalHeight > maxPreviewHeight;
  return {
    aspectRatio,
    naturalHeight,
    previewHeight: isExpandable ? maxPreviewHeight : naturalHeight,
    isExpandable,
  };
}
```

- [ ] **Step 4: 정책 테스트 통과 확인**

Run: `cd frontend && npx tsx --test tests/naturalImagePreview.test.ts`

Expected: PASS, 3 tests and 0 failures.

- [ ] **Step 5: 확장 이미지 컴포넌트 구현**

`frontend/components/ExpandableNaturalAspectMediaImage.tsx`는 다음 동작을 구현한다.

```tsx
const layout = dimensions && containerWidth > 0
  ? naturalImagePreviewLayout({
      containerWidth,
      imageWidth: dimensions.width,
      imageHeight: dimensions.height,
      maxPreviewHeight,
    })
  : undefined;
const aspectRatio = layout?.aspectRatio ?? fallbackAspectRatio;
const isExpandable = layout?.isExpandable ?? false;
```

컴포넌트의 미리보기 루트는 `onLayout`으로 실제 너비를 저장한다. 이미지는 너비 `100%`와 `aspectRatio`를 사용하고, `isExpandable`이면 루트 높이를 `maxPreviewHeight`로 고정하고 `overflow: "hidden"`을 적용한다. 하단 `LinearGradient` 안의 `사진 전체보기` `Pressable`은 이벤트 전파를 중단하고 전체화면 `Modal`을 연다. 모달은 검은 배경, `사진 전체보기` 제목, 닫기 버튼, 세로 `ScrollView`, 현재 `MediaImage`의 원본 비율 이미지를 렌더링한다. `Modal.onRequestClose`도 같은 닫기 함수를 사용한다.

- [ ] **Step 6: 공지와 참여활동 상세에만 연결**

`frontend/app/board/post/[postId].tsx`에서 다음 범위만 `ExpandableNaturalAspectMediaImage`를 사용한다.

```tsx
const hasExpandableHero = isActivityCertification || isAdminParticipationGuide;

{hasNaturalHero ? (
  hasExpandableHero ? (
    <ExpandableNaturalAspectMediaImage key={heroAttachment.id} media={heroAttachment} />
  ) : (
    <NaturalAspectMediaImage key={heroAttachment.id} media={heroAttachment} />
  )
) : (
  <MediaImage ... />
)}
```

첨부 이미지에서는 `isNotice`일 때만 확장 컴포넌트를 사용하고, 일반 커뮤니티 첨부는 기존 `NaturalAspectMediaImage`를 유지한다. `frontend/app/board/[boardId].tsx`와 `frontend/components/PostCard.tsx`는 수정하지 않는다.

- [ ] **Step 7: 관련 테스트와 타입 검사 실행**

Run: `cd frontend && npx tsx --test tests/naturalImagePreview.test.ts tests/postDetailImagePresentation.test.ts tests/imageDimensions.test.ts && npm run typecheck`

Expected: 모든 테스트 PASS, 타입 검사 exit 0.

- [ ] **Step 8: 구현 커밋**

```bash
git add frontend/utils/naturalImagePreview.ts frontend/tests/naturalImagePreview.test.ts frontend/components/ExpandableNaturalAspectMediaImage.tsx frontend/app/board/post/[postId].tsx
git commit -m "feat(frontend): add long image full view"
```

### Task 5: 계약 갱신, 화면 검증과 기존 PR 업데이트

**Files:**
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- Modify: `docs/superpowers/plans/2026-08-16-adaptive-post-images.md`
- Verify: `frontend/`
- Create outside repository: `C:/Users/yug67/.codex/visualizations/2026/08/16/01a008c3-9814-7f33-960c-27daa212001c/adaptive-post-preview/long-image-*.png`

**Interfaces:**
- Consumes: Task 4의 `500px` 미리보기와 전체화면 컴포넌트
- Produces: 현재 UI와 일치하는 프론트엔드 계약, 변경 화면 캡처, 갱신된 `codex/adaptive-post-images` 원격 브랜치와 PR #12

- [ ] **Step 1: 프론트엔드 계약 갱신**

`docs/phase2/FRONTEND_ROUTE_SPEC.md`의 이미지 규칙을 다음 내용으로 교체한다.

```markdown
- Notice-detail and participation-detail images use the available full width and each image's natural aspect ratio. Images whose calculated height exceeds 500px use a 500px preview with a `사진 전체보기` control that opens the complete current image in an in-app scrollable full-screen viewer; other post-detail and all list-thumbnail image policies remain unchanged.
```

- [ ] **Step 2: 전체 검증 실행**

Run: `cd frontend && npm test && npm run typecheck && npm run lint && npm run export:web`

Expected: tests and typecheck/export exit 0; lint has 0 errors and only the repository's existing unused-import warnings.

- [ ] **Step 3: 실제 화면 캡처**

세로 이미지가 `500px` 미리보기와 `사진 전체보기` 버튼을 표시하는 상세 화면, 버튼 클릭 후 전체 이미지 화면을 각각 캡처한다. 가로 이미지와 목록 썸네일이 기존 표현을 유지하는 것도 확인한다.

- [ ] **Step 4: 문서와 캡처 검증 후 커밋**

Run: `git diff --check; git status --short --branch`

```bash
git add docs/phase2/FRONTEND_ROUTE_SPEC.md docs/superpowers/plans/2026-08-16-adaptive-post-images.md
git commit -m "docs: align long image preview contract"
```

- [ ] **Step 5: 기존 원격 브랜치와 PR 갱신**

Run: `git push origin codex/adaptive-post-images`

Expected: 원격 `codex/adaptive-post-images` HEAD가 로컬 HEAD와 같고 기존 초안 PR #12에 새 커밋이 추가된다.

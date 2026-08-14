# Study Activity Detail Tag Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 스터디 활동 인증 상세에서만 작은 태그를 숨기고 실제 게시글 제목을 검은 제목으로 표시한다.

**Architecture:** 게시판별 헤더 표시 규칙을 화면 컴포넌트에서 분리한 순수 프레젠테이션 함수로 표현한다. 상세 화면은 이 함수가 반환한 `tagText`와 `titleText`만 렌더링하며, 활동 목록·작성 API·다른 게시판은 변경하지 않는다.

**Tech Stack:** React Native, Expo Router, TypeScript, Node test runner

## Global Constraints

- `study-activity` 상세만 태그가 없어야 한다.
- 동아리·네트워킹 활동 인증 상세 태그는 유지한다.
- 스터디의 검은 제목은 `post.title`을 사용한다.
- UI 스타일, 목록 카드, API, 데이터 모델은 변경하지 않는다.

### Task 1: 활동 인증 상세 헤더 정책 테스트 추가

**Files:**
- Create: `frontend/tests/activityDetailPresentation.test.ts`
- Create: `frontend/utils/activityDetailPresentation.ts`

1. 스터디는 `tagText: null`, `titleText: post.title`을 반환해야 한다는 테스트를 작성한다.
2. 제목이 비어 있는 레거시 스터디 글은 기존 라벨을 제목 대체값으로 사용해야 한다는 테스트를 작성한다.
3. 동아리와 네트워킹은 기존 라벨을 태그로 유지하고 별도 제목을 반환하지 않아야 한다는 테스트를 작성한다.
4. 구현 전 테스트를 실행해 모듈 부재로 실패하는 것을 확인한다.
5. 최소한의 순수 함수를 구현하고 집중 테스트 통과를 확인한다.

### Task 2: 게시글 상세 화면에 정책 연결

**Files:**
- Modify: `frontend/app/board/post/[postId].tsx`

1. 활동 인증 게시판에만 헤더 정책 함수를 호출한다.
2. `titleText`가 있으면 기존 검은 제목 스타일로 렌더링한다.
3. `tagText`가 있으면 기존 태그 스타일로 렌더링한다.
4. 활동 인증이 아닌 게시판과 원우회 활동내역 분기는 기존 동작을 유지한다.

### Task 3: 회귀 검증 및 커밋

**Files:**
- Modify: `docs/superpowers/specs/2026-08-10-study-activity-detail-label-design.md`
- Create: `docs/superpowers/plans/2026-08-14-study-activity-detail-tag.md`

1. 집중 테스트를 실행한다.
2. 프론트엔드 전체 테스트를 실행한다.
3. TypeScript 타입 검사와 ESLint를 실행한다.
4. `git diff --check`와 변경 범위를 확인한다.
5. 실제 화면에서 스터디 태그 부재와 제목 노출을 확인한다.
6. 검증 결과와 함께 커밋한다.

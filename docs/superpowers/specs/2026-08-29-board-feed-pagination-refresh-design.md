# Board Feed Pagination and Pull-to-Refresh Design

## Status

Proposed on 2026-08-29. The user approved keeping the current Back, cross-tab, and explicit bottom-tab reset behavior unchanged. This document is awaiting final review before implementation.

## Goal

사용자 게시판 목록이 필요한 데이터만 20개씩 불러오고, 목록 하단에서 다음 페이지를 이어 불러오며, 현재 게시판과 필터를 유지한 채 당겨서 최신 첫 페이지를 새로고침하게 한다.

이 작업은 목록 데이터 조회만 변경한다. 뒤로가기, 다른 탭 이동, 하단 탭 재선택과 상세 화면 복귀 규칙은 현재 구현을 그대로 유지한다.

## Current behavior

- 단일 게시판은 `GET /boards/{board_id}/posts?page=&size=`와 `useInfiniteQuery`를 사용해 20개씩 불러온다.
- 공지사항 루트는 공지 게시판마다 첫 20개를 동시에 조회하고 합치며 다음 페이지를 제공하지 않는다.
- 자료공유 `전체`는 네 게시판의 첫 20개를 동시에 조회하고 합치며 다음 페이지를 제공하지 않는다.
- 원우회 활동내역은 자체 게시판 첫 페이지와 각 공지 게시판 첫 페이지를 합치며 다음 페이지를 제공하지 않는다.
- 홈 최신 공지는 두 건을 표시하기 위해 모든 공지 게시판의 모든 페이지를 조회한다.
- 공유 게시판 화면은 현재 선택과 무관하게 자료공유 네 게시판의 첫 페이지 쿼리를 활성화하므로 불필요한 백그라운드 요청이 발생한다.

## Scope

### Included

- 사용자 게시판 목록의 최초 20개 조회와 다음 20개 무한 스크롤
- 공지사항 전체·필터 목록의 서버 집계 페이지네이션
- 자료공유 `전체`의 서버 집계 페이지네이션
- 원우회 활동내역의 서버 집계 페이지네이션
- 홈 최신 공지를 집계 피드 첫 두 건만 조회하도록 변경
- 현재 게시판·필터·정렬·검색어를 유지하는 pull-to-refresh
- 다음 페이지 중복 요청 방지, 게시글 ID 중복 제거와 페이지 오류 재시도
- 인기순·조회순의 결정적 정렬을 위한 게시글 ID 보조 정렬
- 선택하지 않은 자료공유 집계 쿼리 비활성화
- API 계약, 관련 구현 문서와 자동화 테스트 갱신

### Not included

- 뒤로가기, Android hardware Back, 브라우저 Back 또는 `returnTo` 변경
- 다른 탭으로 이동했다 돌아오는 동작 변경
- 하단 탭 재선택 시 적용되는 기존 기본 화면·필터·스크롤 초기화 변경
- 필터나 스크롤 상태를 별도 Zustand 저장소 또는 영구 저장소에 보관
- 상세 수정·삭제·작성 완료 후 복귀 경로 수정
- 관리자 목록, 전역 검색, 알림, 내 활동 목록 변경
- 댓글, FAQ, 일정, 원우회 소개 메타데이터 페이지네이션
- 전체 API의 커서 페이지네이션 전환

## Backend aggregate feed

새 사용자용 `GET /posts/feed` 엔드포인트를 추가한다.

Query parameters:

- `scope`: `notices`, `resources`, `council_activity`
- `page`: 기본 `1`, 최소 `1`
- `size`: 기본 `20`, 최소 `1`, 최대 `100`
- `q`: 선택 검색어
- `notice_category`: 공지에서만 `academic`, `event`, `other`
- `sort`: `latest`, `popular`, `views`
- `pin_priority`: 기본 `true`; 홈의 순수 최신순 미리보기만 `false`

응답은 기존 공통 페이지 응답을 유지한다.

```json
{
  "status": "success",
  "data": [],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 0,
    "total_pages": 0
  }
}
```

Scope rules:

- `notices`: 활성 공지형 게시판을 대상으로 하며 학사 일정처럼 게시글 공지가 아닌 캘린더 게시판은 제외한다. `notice_category`는 기존 공지 화면의 학사·행사·기타 분류와 같은 결과를 만들어야 한다.
- `resources`: 활성 `resources` 게시판의 읽을 수 있는 게시글을 하나의 전역 목록으로 정렬한다.
- `council_activity`: 원우회 활동내역 게시판의 기존 게시글과 `metadata.show_in_council_activity = true`인 공지를 하나의 목록으로 합친다.

모든 scope는 현재 사용자 읽기 권한, 공개 상태, soft delete, 익명 정책과 차단 작성자 필터를 기존 단일 게시판 API와 동일하게 적용한다. 필터를 적용한 뒤 전체 건수를 계산하고 한 번의 전역 정렬 후 페이지를 자른다.

Sort rules:

- `latest`: `is_pinned DESC, created_at DESC, id DESC`
- `popular`: `is_pinned DESC, like_count DESC, comment_count DESC, created_at DESC, id DESC`
- `views`: `is_pinned DESC, view_count DESC, created_at DESC, id DESC`

`pin_priority=false`이면 각 정렬의 선두 `is_pinned DESC`만 제외하고 나머지 정렬과 ID 보조 정렬은 유지한다. 현재 규모에서는 기존 `page/size` offset 계약을 유지한다. 클라이언트는 페이지 사이의 게시글 ID를 중복 제거한다. 커서 전환은 실제 데이터 증가나 동시 갱신 문제가 확인될 때 별도 작업으로 진행한다.

## Frontend query behavior

공통 `useInfinitePostFeed` 계층이 단일 게시판과 집계 피드를 같은 페이지 모델로 노출한다. 서버 데이터와 불러온 페이지는 React Query만 소유하며 컴포넌트 상태에 게시글 배열을 복제하지 않는다.

Query identity에는 다음 값을 모두 포함한다.

- 단일 게시판 ID 또는 aggregate scope
- 적용 필터
- 확정 검색어
- 정렬 방식

동작 규칙:

1. 최초 진입은 20개만 요청한다.
2. `onEndReached`는 다음 페이지가 있고 다른 다음 페이지 요청이 실행 중이 아닐 때 한 번만 실행한다.
3. 수신한 페이지는 게시글 ID로 중복 제거한 뒤 기존 페이지 뒤에 표시한다.
4. 필터, 정렬, 검색어 또는 게시판이 변경되면 새 query identity로 첫 페이지를 조회한다. 기존 화면 규칙대로 목록은 최상단에서 시작한다.
5. 첫 페이지 실패는 기존 전체 오류·재시도 상태를 사용한다.
6. 다음 페이지 실패는 기존 목록을 유지하고 footer에 재시도 동작을 표시한다.
7. 집계 쿼리는 해당 집계 화면이 실제로 선택됐을 때만 활성화한다.

화면별 적용:

- 공지사항: `ScrollView` 기반 고정 묶음을 `FlatList` 기반 `scope=notices` 무한 목록으로 변경한다.
- 커뮤니티 사진첩과 개별 자료 게시판: 기존 단일 게시판 무한 목록을 유지한다.
- 자료공유 `전체`: `scope=resources` 무한 목록을 사용한다.
- 참여활동 안내·활동 인증: 기존 단일 게시판 무한 목록을 유지한다.
- 건의사항·상조회: 기존 단일 게시판 무한 목록을 유지한다.
- 원우회 활동내역: `scope=council_activity` 무한 목록을 사용한다.
- 홈 최신 공지: `scope=notices&page=1&size=2&sort=latest&pin_priority=false`만 요청한다.

## Pull-to-refresh

당겨서 새로고침은 현재 게시판, 공지 분류, 자료 필터, 정렬과 확정 검색어를 변경하지 않는다.

1. 현재 query identity의 첫 페이지를 요청한다.
2. 성공하기 전에는 기존 누적 목록을 그대로 표시한다.
3. 성공하면 캐시를 새 첫 페이지 하나로 교체하고 다음 페이지 번호를 다시 `2`로 만든다.
4. 실패하면 기존 누적 목록과 스크롤을 유지하고 재시도 가능한 오류 안내만 표시한다.
5. 새로고침 중 `onEndReached`는 추가 요청을 시작하지 않는다.

React Query infinite refetch가 이미 불러온 모든 페이지를 다시 요청하지 않도록 첫 페이지 새로고침을 공통 helper로 분리한다.

## Navigation compatibility

이 작업은 현재 라우트와 탭 reset store를 수정하지 않는다.

- 목록에서 상세로 이동하는 기존 `returnTo` 값을 유지한다.
- 상세에서 일반 뒤로가기는 현재 방식으로 실행한다.
- 다른 탭으로 이동했다 돌아오면 현재 navigator가 보존하는 상태를 그대로 사용한다.
- 사용자가 하단 탭을 직접 다시 누르면 현재 `resetRevision` 규칙대로 기본 게시판·필터·스크롤 최상단으로 초기화한다.
- 페이지네이션 query key와 pull-to-refresh가 위 동작을 간접적으로 초기화하거나 다른 라우트로 이동시키지 않는다.

## Error and race handling

- 빠른 스크롤로 `onEndReached`가 여러 번 호출되어도 동일 페이지 요청은 하나만 실행한다.
- 필터 변경 중 이전 요청이 완료돼도 다른 query identity 결과와 섞지 않는다.
- 페이지 응답의 `pagination.page`가 요청 페이지보다 뒤로 진행하지 않으면 추가 로딩을 중단한다.
- 빈 페이지가 오면 잘못된 `total_pages` 값과 관계없이 추가 로딩을 중단한다.
- 페이지 사이에 같은 게시글이 나타나면 ID 기준 첫 항목만 유지한다.
- pull-to-refresh 실패는 기존 데이터 삭제나 전체 로딩 화면 전환을 일으키지 않는다.

## Testing

### Backend

- scope별 포함·제외 게시판과 공지 분류
- 사용자 권한, 비공개 상태, soft delete와 차단 작성자 제외
- 첫 페이지와 다음 페이지 경계 및 pagination envelope
- latest, popular, views의 ID tie-breaker
- 원우회 활동내역 공지 metadata 필터
- 잘못된 scope, page, size와 필터 조합 검증

### Frontend

- 최초 요청은 20개만 호출
- 하단 도달 시 다음 페이지 한 번 호출 및 결과 누적
- 동일 게시글 ID 중복 제거
- 다음 페이지 실패 후 기존 목록 유지와 재시도
- pull-to-refresh가 현재 필터·정렬·검색어를 보존
- pull 성공 시 첫 페이지로 교체, 실패 시 기존 누적 페이지 유지
- 자료공유 `전체`가 아닐 때 집계 쿼리 비활성화
- 홈 공지가 모든 페이지가 아니라 집계 첫 두 건만 요청

### Navigation regression

기존 `boardNavigation`, `tabRootReset`, `pullToRefresh` 테스트를 그대로 통과시킨다. 다음 시나리오는 라우트 변경 없이 확인한다.

- 상세에서 뒤로가기
- 다른 탭으로 이동 후 복귀
- 하단 탭 재선택 시 기존 기본값과 최상단 초기화

### Full verification

- 백엔드 전체 테스트와 compile check
- 프런트엔드 전체 테스트, typecheck와 lint
- `git diff --check`

## Acceptance criteria

- 초기 게시판 목록 요청은 최대 20개이며 다음 데이터는 하단 도달 시에만 요청한다.
- 공지사항, 자료공유 `전체`, 원우회 활동내역은 정확한 전역 정렬과 필터를 유지하며 끝까지 불러올 수 있다.
- 홈 최신 공지를 위해 전체 공지 데이터를 전량 조회하지 않는다.
- 당겨서 새로고침은 현재 선택과 기존 목록을 성공 전까지 유지한다.
- 단일 게시판과 집계 게시판 모두 첫 페이지, 다음 페이지와 새로고침 오류를 구분한다.
- 뒤로가기, 다른 탭 이동과 하단 탭 재선택 동작은 변경되지 않는다.

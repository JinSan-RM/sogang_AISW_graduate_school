# Club Activity Source Badge Design

## Goal

참여활동의 동아리 활동인증 목록에서 파란 태그에 일반 문구인 `동아리 활동 인증` 대신 연결된 동아리 모집 글의 제목을 표시한다. 연결이 누락되거나 잘못된 기존 데이터도 안전하게 표시한다.

## Approved behavior

- 적용 범위는 `club-activity` 게시판의 활동인증 카드 태그다.
- 정상적으로 연결된 글은 `metadata.activity_source_post_id`가 가리키는 활성 동아리 모집 글의 현재 제목을 태그에 표시한다.
- 동아리 모집 글을 활동 대상으로 선택할 때 모집 글 제목은 기존처럼 활동인증 글의 `post.category`에 자동 저장하고, 모집 글 ID는 `metadata.activity_source_post_id`에 저장한다.
- 사용자가 category를 별도 자유 입력하지 않는다.
- 연결 ID가 없거나, 잘못되었거나, 연결된 모집 글이 삭제된 경우에는 다음 우선순위를 사용한다.
  1. `post.category`의 구체적인 값
  2. `metadata.legacy_activity_name`의 구체적인 값
  3. `동아리 활동 인증`
- `동아리 활동 인증`, `활동 인증`, `안내`처럼 동아리 이름이 아닌 일반 문구는 구체적인 fallback 값으로 사용하지 않는다.
- 스터디와 네트워킹 활동인증 태그의 기존 동작은 변경하지 않는다.

## Architecture

### API enrichment

동아리 활동인증 목록 API는 현재 페이지의 `activity_source_post_id`들을 모아 한 번의 추가 조회로 연결된 `club-promo` 게시글 제목을 구한다. 삭제되지 않은 올바른 동아리 모집 글만 인정하고, 각 목록 항목에 선택 필드 `activity_source_title`을 내려준다.

이 방식은 카드마다 상세 API를 호출하는 N+1 요청을 피하고, 모집 글 제목이 수정되면 다음 목록 조회부터 현재 제목을 보여준다. 연결이 잘못된 다른 게시판 글은 제목으로 사용하지 않는다.

### Frontend label resolution

프론트엔드는 동아리 활동인증 카드에만 전용 라벨 결정 함수를 사용한다. 라벨 우선순위는 API의 `activity_source_title`, 구체적인 `post.category`, 구체적인 `metadata.legacy_activity_name`, 기본 문구 순이다. 다른 활동인증 카드는 기존 `post.category || "활동 인증"` 동작을 유지한다.

### Data creation

작성 화면의 기존 이중 저장을 유지한다. 사용자가 `소속 그룹` 선택 시 모집 글 제목을 `post.category`에, 모집 글 ID를 `metadata.activity_source_post_id`에 자동 기록한다. 이번 변경은 자유 입력 필드를 추가하거나 기존 저장 형식을 바꾸지 않는다.

## Error and legacy handling

- 연결 ID가 숫자가 아니거나 양수가 아니면 연결 없음으로 처리한다.
- 연결 글이 삭제되었거나 `club-promo` 게시판 글이 아니면 `activity_source_title`을 제공하지 않는다.
- 구형 이관 글의 category가 일반 문구라면 `legacy_activity_name`을 확인한다.
- 모든 후보가 비어 있거나 일반 문구이면 `동아리 활동 인증`을 표시한다.
- 목록 자체의 성공/실패 상태와 페이지네이션 동작은 변경하지 않는다.

## Alternatives considered

1. **목록 API에서 연결 제목을 일괄 해석 — 선택.** 현재 제목, 연결 유효성, 요청 수를 모두 안정적으로 관리한다.
2. 프론트엔드에서 동아리 모집 목록을 별도 조회해 ID를 매칭. 구현은 가능하지만 모집 글 페이지 수에 따라 일부 제목을 찾지 못할 수 있고 목록 진입 요청이 늘어난다.
3. `post.category`만 표시. 가장 단순하지만 모집 글 제목 수정이 반영되지 않고 연결 ID를 표시 기준으로 사용하지 못한다.

## Verification

- 백엔드 테스트에서 올바른 `club-promo` 연결만 `activity_source_title`로 반환하는지 확인한다.
- 삭제된 글, 다른 게시판 글, 잘못된 ID는 제목을 반환하지 않는지 확인한다.
- 프론트엔드 테스트에서 연결 제목, category fallback, legacy fallback, 최종 기본값의 우선순위를 확인한다.
- 스터디·네트워킹 활동인증 라벨이 기존 동작을 유지하는지 확인한다.
- 백엔드 관련 테스트와 전체 프론트엔드 테스트, 타입 검사, 린트, 웹 export를 실행한다.

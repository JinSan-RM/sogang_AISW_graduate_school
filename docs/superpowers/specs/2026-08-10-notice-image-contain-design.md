# Notice Detail Image Containment Design

> Superseded on 2026-08-16 by `2026-08-16-adaptive-post-images-design.md`. The fixed `230px` notice frame below is retained only as historical context.

## Goal

공지사항 상세 글의 이미지 첨부가 원본 비율에 따라 화면을 과도하게 늘리거나 잘리지 않도록, 일정한 크기의 이미지 영역 안에서 사진 전체를 보여준다.

## Approved behavior

- 적용 범위는 `board_type === "notice"`인 게시글 상세의 이미지 첨부로 한정한다.
- 각 공지 이미지는 상세 본문 너비를 채우는 `230px` 높이의 고정 프레임에 표시한다.
- 이미지는 `resizeMode="contain"`을 사용해 세로·가로 비율과 관계없이 전체가 보여야 한다.
- 이미지 비율 때문에 남는 프레임 영역은 기존 첨부 배경색인 연한 회색으로 표시한다.
- 이미지 자체를 누르면 기존과 동일하게 보호된 미디어 URL을 열 수 있어야 한다.
- 이미지가 여러 장이면 각 이미지를 같은 크기의 프레임으로 순서대로 표시한다.
- 상조회, 활동인증, 원우회 활동내역 등 다른 게시판의 원본 비율 표시는 변경하지 않는다.

## Implementation boundary

게시글 상세 화면에서 공지 여부에 따라 이미지 렌더러와 스타일을 분기한다. 공지 이미지는 기존 `MediaImage`에 `resizeMode="contain"`과 공지 전용 고정 프레임 스타일을 적용하고, 공지가 아닌 첨부 이미지는 기존 `NaturalAspectMediaImage`를 유지한다. 공용 이미지 컴포넌트의 기본 동작은 변경하지 않는다.

## Alternatives considered

1. **공지 전용 분기 — 선택.** 영향 범위가 가장 작고 기존 게시판 이미지 표현을 보존한다.
2. 공용 컴포넌트에 고정 높이 옵션 추가. 재사용 가능성은 있지만 현재 호출 지점이 하나라 불필요한 API가 생긴다.
3. 모든 상세 첨부 이미지를 고정 프레임으로 변경. 일관성은 생기지만 상조회와 활동인증의 승인된 원본 비율 동작을 회귀시킨다.

## Verification

- 정적 회귀 테스트에서 공지 전용 `contain` 렌더링과 `230px` 프레임을 확인한다.
- 같은 테스트에서 공지가 아닌 첨부는 계속 `NaturalAspectMediaImage`를 사용하는지 확인한다.
- 프론트엔드 전체 테스트, 타입체크, 린트와 웹 export를 실행한다.

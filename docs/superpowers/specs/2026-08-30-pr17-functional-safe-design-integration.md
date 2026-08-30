# PR #17 Functional-Safe Design Integration

## Status

2026-08-30 사용자와 합의한 통합 방향을 문서화한다. 이 문서는 최종 명세 검토 전 상태이며, 검토 승인 뒤 별도 구현 계획을 작성하고 코드를 변경한다.

## Goal

PR #17의 두 커밋이 의도한 일정·알림·공지·참여활동 디자인을 최신 `main` 위에 반영하되, 현재 기능·API 호환성·DB 스키마·기존 데이터를 그대로 보존한다.

- 기능과 데이터 기준: `main`의 `9f151de30286d346c5f6a70ab4a64375c9ac2f7b`
- 일정 디자인 기준: `067e4d989470a05756ad5897481794cdb07d9187`
- 알림·공지·참여활동 디자인 기준: `07da71a5559cf59fb91248d7cbf3c9ac6a41ef80`
- 제품·계약 기준: `PLAN.md`, `CODEX.md`, `docs/phase2/` 계약과 기존 승인 명세

충돌 시 우선순위는 데이터 보존과 기존 기능, API 계약, 디자인 순서다. PR의 시각적 결과는 가능한 그대로 사용하되, 기능을 숨기거나 제거하는 부분은 명시적 예외로 남긴다.

## Verified baseline

통합 전 별도 작업공간에서 다음을 확인했다.

- PR head 단독: 프런트엔드 테스트 367/367, 백엔드 테스트 325 passed/1 skipped, 타입체크, Expo Doctor 17/17, 웹·iOS·Android export 통과, 린트 오류 0건.
- 최신 `main`과 PR을 PR 쪽 우선으로 자동 병합: 프런트엔드 365/366으로 참여활동 대표 이미지 계약 테스트 1건 실패. 백엔드 테스트와 타입체크는 통과.
- PostgreSQL에서 PR의 `0027_event_category_cleanup`을 실행하면 `exam`, `council`, `external` 값이 모두 `other`로 영구 변경되고 downgrade로 복구되지 않음.
- 현재 DB 모델과 체크 제약, Pydantic 요청 스키마, seed는 여섯 카테고리 `academic`, `event`, `exam`, `council`, `external`, `other`를 사용함.

따라서 PR이 단독으로 빌드된다는 사실은 최신 `main`과의 기능 호환성이나 데이터 안전성을 보장하지 않는다. 두 커밋은 통째로 merge/cherry-pick하지 않고 필요한 시각 변경만 선별 이식한다.

## Scope

### Included

- 일정 화면의 학사일정·행사일정·기타일정 3종 표시와 PR 색상
- 관리자 일정 등록의 3개 선택지와 레거시 일정 편집 호환성
- PR의 알림 카드, 공지 목록, 참여활동 목록·상세·작성 화면 시각 변경
- PR의 벡터 아이콘과 Pretendard 웹 렌더링 보정
- 최신 `main`의 검색, 이미지 비율·전체보기, 갤러리, 댓글, 첨부, 내비게이션, 관리자 CRUD 보존
- 자동화 테스트, API 회귀 테스트, 빌드·export, 실제 화면 캡처 비교

### Excluded

- Alembic revision 추가 또는 기존 revision 수정
- DB 스키마, 제약, 이벤트 row, seed 데이터 변경
- 백엔드 이벤트 요청 스키마를 3종으로 축소하는 변경
- `docker-compose.override.yml`의 `NOTIFY_SELF=true` 상시 적용
- 패키지 업그레이드, 앱 구조 변경, PR과 무관한 기능 추가
- 현재 코드와 기존 이미지 명세 사이의 `500px`/`600px` 임계값 불일치 수정. 이 차이는 별도 이슈로 기록하고 이번 통합에서 현재 런타임 값을 변경하지 않는다.

## Data and API invariants

다음 파일에는 PR로 인한 변경이 없어야 한다.

- `backend/alembic/versions/`
- `backend/app/models/event.py`
- `backend/app/schemas/event.py`
- `backend/seed_test_data.sql`

`EventCreate`와 `EventUpdate`는 기존 여섯 값을 계속 허용한다. 기존 row의 category 값은 조회·수정·삭제 과정에서 자동 치환되지 않는다. 일정 제목, 본문, 장소 또는 시간만 수정했을 때 원래 category가 요청에 그대로 포함되어 422 없이 저장되어야 한다.

`GET /events`와 `GET /events/{id}`는 저장된 원본 category를 그대로 반환한다. 표시용 3종 변환은 프런트엔드 presentation 계층에서만 수행한다.

## Event category compatibility design

프런트엔드에 일정 표시 전용 공통 유틸리티를 둔다. 화면별 상수와 `?? rawCategory` fallback은 제거한다.

| 저장된 원본 값 | 화면 표시 그룹 | 사용자 라벨 | 기본 색상 그룹 |
| --- | --- | --- | --- |
| `academic` | `academic` | 학사일정 | PR 학사 색상 |
| `exam` | `academic` | 학사일정 | PR 학사 색상 |
| `event` | `event` | 행사일정 | PR 행사 색상 |
| `council` | `event` | 행사일정 | PR 행사 색상 |
| `external` | `event` | 행사일정 | PR 행사 색상 |
| `other` | `other` | 기타일정 | `#EDE8F6` / `#4A2B7A` |
| 알 수 없거나 빈 값 | `other` | 기타일정 | `#EDE8F6` / `#4A2B7A` |

이 유틸리티는 일정 목록, 캘린더 선택 목록, 날짜별 목록, 상세, 관리자 일정 카드와 관리자 폼에 모두 사용한다. 어떤 화면도 영문 category 코드를 라벨 fallback으로 노출하지 않는다.

새 일정 등록에서는 `academic`, `event`, `other` 세 값만 선택할 수 있고 저장도 해당 canonical 값으로 한다.

기존 일정 편집은 다음 상태를 분리한다.

1. API에서 받은 원본 category를 별도로 보관한다.
2. 선택된 칩은 원본 값을 3종 표시 그룹으로 변환해 활성화한다.
3. 사용자가 category 칩을 누르지 않은 채 다른 필드만 저장하면 원본 category를 payload에 사용한다.
4. 사용자가 category 칩을 명시적으로 누르면 그때부터 선택한 3종 canonical 값을 payload에 사용한다.
5. 이미 활성인 칩을 다시 누르는 것도 명시적 변경으로 취급한다. 예를 들어 원본 `exam`에서 활성화된 학사일정 칩을 누르면 이후 저장 값은 `academic`이다.
6. 편집 취소, 다른 일정 선택, 저장 완료 시 원본 category와 명시적 변경 상태를 함께 초기화한다.

현재 일정 사용자 화면은 범위 전체를 조회한 뒤 렌더링하므로 API category 필터 동작은 변경하지 않는다. 이후 3종 필터가 추가되면 기존 원본 그룹을 누락하지 않도록 별도 API 계약을 먼저 작성한다.

## Visual integration matrix

| Surface | PR visual intent to port | Function that must remain |
| --- | --- | --- |
| 일정 목록·캘린더·날짜별·상세 | 3종 한글 라벨과 PR 태그 색상 | 여섯 원본 값 조회, 날짜 범위·다일 일정, 상세 이동과 뒤로가기 |
| 관리자 일정 | 3개 category 칩과 동일한 한글 라벨 | 일정 폼 전체, 목록, 등록·수정·삭제, 레거시 category 무변경 저장 |
| 공지 목록 | PR의 앱바 주석 정리와 기존 시각 미세 조정 | 검색 진입, 4개 필터, 새로고침과 전체 공지 집계 |
| 게시판 참여활동 목록 | 마지막 카드의 하단 구분선 제거 등 PR 카드 마감 | 검색 아이콘과 검색 결과, 무한 스크롤, 필터, 작성 진입 |
| 참여활동 작성 | 활동 인증 앱바 구분선 제거, 참가자 영역 간격과 카피의 디자인 정렬 | 이름과 학번 모두로 검색 가능, 본인 추가, 첨부·날짜·계좌 데이터와 완료 경로 |
| 참여활동 상세 | 태그·제목 뒤 대표 이미지 배치, PR 여백·radius·placeholder·섹션 순서 | 자연 비율, 긴 참여 안내 이미지 전체보기, 활동 인증 갤러리, 댓글·첨부·상태 기능 |
| 공지 상세 | PR의 본문·첨부·공식 답변 스타일, 파일명 line-height | 현재 자연 비율과 긴 이미지 펼치기/전체보기 동작; 400px cover-only 잘림은 적용하지 않음 |
| 알림 토스트 | 흰 카드, 0.5 테두리, radius 14, 그림자, `NoticeToastIcon`, PR 타이포 | 알림 종류별 의미, 닫기, 알림 목적지 이동, 읽음 처리, 안전영역 |
| 전역 글꼴 | 웹 antialiasing과 Pretendard faux-bold 방지 | 네이티브·웹 텍스트 입력과 접근성, 기존 weight 의미 |
| 원우회 공식 답변 | PR의 파란 말풍선 벡터 아이콘과 타이포 | 답변 데이터와 관리자 동작; 중복 raster asset은 추가하지 않음 |

## Post-detail conflict resolution

`frontend/app/(tabs)/board/post/[postId].tsx`는 자동으로 한쪽을 선택하지 않고 혼합 해소한다.

- PR의 `visualHeroSection` 추출과 참여 안내에서 태그·제목 뒤 대표 이미지를 배치하는 순서를 사용한다.
- 스크롤 시작부에는 참여 안내가 아닐 때만 `visualHeroSection`을 렌더링한다.
- 참여 안내 본문 위치에서는 같은 `visualHeroSection`을 한 번만 렌더링한다.
- `hasExpandableHero`는 최신 `main`과 동일하게 `isAdminParticipationGuide`다.
- 활동 인증은 `NaturalAspectMediaImage`를 사용하고 긴 이미지 접기를 적용하지 않는다.
- 참여 안내는 `ParticipationHeroImage`의 4:3/4:5 고정 `cover`로 교체하지 않고 `ExpandableNaturalAspectMediaImage`를 유지한다.
- `styles.visualHeroAlbum`은 사진첩에만 적용한다. 활동 인증에 고정 사진첩 프레임을 적용하지 않는다.
- 사진첩 화살표·썸네일·카운터, 원우회 활동내역 이미지 정책은 최신 `main`과 동일하게 유지한다.
- PR의 placeholder, 여백, radius와 섹션 순서는 위 이미지 렌더러를 바꾸지 않는 범위에서 이식한다.

이 해소는 대표 이미지 중복 렌더링, 참여 안내 이미지 잘림, 활동 인증 이미지 접힘을 동시에 막는다.

## Notification behavior

PR의 카드는 공지 알림에만 사용한다. `notification_type === "notice"`를 확인하지 않고 모든 알림에 공지 아이콘과 문구를 적용하지 않는다.

- 공지 알림: PR 카드 스타일과 `NoticeToastIcon` 사용.
- 댓글·좋아요·일정·관리자 답변·신고·원우회 알림: 기존 의미를 유지하는 일반 알림 표현 사용. 목적지 계산 로직은 변경하지 않는다.
- 카드 전체 누르기는 기존 `openVisibleNotification`을 통해 읽음 처리 후 목적지로 이동한다.
- 모든 카드에는 카드 열기와 분리된 명시적 닫기 컨트롤을 제공한다. 닫기는 읽음 처리나 내비게이션을 일으키지 않는다.
- 위치는 `useSafeAreaInsets()`의 top inset 아래로 계산한다. 고정 `top: 8`만 사용하지 않는다.
- 한 줄 말줄임은 카드 높이를 보존하되 스크린리더에는 전체 메시지를 제공한다.
- 로컬 수동 검증 시 `NOTIFY_SELF`가 필요하면 일회성 실행 환경변수로만 사용하고 compose 파일에는 커밋하지 않는다.

## Search and participant invariants

참여활동, 활동 인증, 스터디 모집 화면의 검색은 `PLAN.md`/`CODEX.md`의 P0 기능이므로 PR이 Figma를 이유로 숨긴 분기를 적용하지 않는다. 기존 오른쪽 검색 아이콘과 검색 모드는 유지한다.

활동 인증 참가자 검색은 이름과 학번을 모두 지원한다. placeholder와 접근성 라벨은 이 기능을 정확히 설명해야 하며, PR의 `이름으로 검색`처럼 기능 범위를 축소해 보이는 문구는 사용하지 않는다.

## Fonts and assets

`frontend/utils/fonts.ts`의 웹 antialiasing과 faux-bold 방지는 PR 구현을 기준으로 이식하되 다음을 검증한다.

- 명시적 `fontFamily`를 덮어쓰지 않는다.
- Text와 TextInput의 React Native style array를 DOM에 그대로 넘기지 않는다.
- 400/500/600/700/800/900이 해당 Pretendard face로 매핑되고 브라우저가 인조 굵기를 중복 적용하지 않는다.
- 입력, placeholder, 버튼, 앱바, 카드 본문의 레이아웃과 상호작용이 변하지 않는다.

PR에서 추가한 `CouncilReplyIcon`, `ImagePlaceholderIcon`, `NoticeToastIcon`은 벡터를 사용한다. 같은 용도의 `frontend/assets/images/council-reply.png`는 추가하지 않아 중복 asset과 플랫폼별 raster 차이를 피한다.

## Integration strategy

작업 브랜치는 최신 `main`에서 시작한다. PR 전체를 merge하거나 `Accept incoming change`로 해소하지 않고 다음 순서로 작은 변경을 적용한다.

1. 통합 전 기능·빌드 기준선과 변경 금지 DB 파일 hash를 기록한다.
2. 일정 presentation 유틸리티와 레거시 편집 회귀 테스트를 먼저 추가한다.
3. 일정 4개 사용자 화면과 관리자 폼에 공통 표시 규칙을 연결한다.
4. 알림 카드에 종류·닫기·safe-area 회귀 테스트를 추가한 뒤 PR 스타일을 이식한다.
5. 게시판 검색과 참가자 검색 회귀 테스트를 고정한 뒤 목록·작성 디자인을 이식한다.
6. 이미지 정책 회귀 테스트를 고정하고 post-detail 충돌을 혼합 해소한다.
7. 공지 목록, 아이콘, 글꼴의 나머지 디자인 변경을 이식한다.
8. 전체 자동 검증과 동일 fixture 기반 화면 캡처 비교를 수행한다.

각 단계에서 기능 테스트가 실패하면 디자인 이식을 확대하지 않고 해당 단계에서 해소한다.

## Test design

### Backend and data

- 여섯 category 각각으로 일정 생성·수정 요청이 기존과 같이 성공한다.
- `exam`, `council`, `external` 일정의 제목만 수정했을 때 200이고 category가 변하지 않는다.
- 일정 조회 응답이 저장된 원본 category를 그대로 반환한다.
- 기존 이벤트 범위, 권한, 알림 테스트가 모두 통과한다.
- 통합 diff에서 Alembic, event model/schema, seed 변경이 0건인지 확인한다.
- Alembic head는 최신 `main`과 동일한 `0026_dues_payers`를 유지한다.

### Frontend unit and regression

- 여섯 원본 값과 unknown/empty가 정해진 3종 라벨·톤으로 변환된다.
- 어떤 일정 화면에도 raw code fallback이 없다.
- 레거시 일정 편집 진입 시 정확한 칩이 선택된다.
- category 미선택 저장은 원본 값을 전송하고, 명시적 선택 뒤에는 canonical 값을 전송한다.
- 참여활동 화면에 검색 진입점과 검색 모드가 남아 있다.
- 참가자 검색 안내가 이름과 학번을 모두 명시한다.
- 공지 알림만 공지 카드 아이콘을 사용하며, 다른 종류도 올바른 목적지로 이동한다.
- 토스트 닫기는 읽음 처리·이동 없이 카드를 닫고 safe-area 위치를 사용한다.
- 참여 안내는 expandable natural image, 활동 인증은 uncollapsed natural image, 사진첩은 기존 고정 프레임을 사용한다.
- 공지의 긴 이미지 전체보기/펼치기 동작과 갤러리 이동이 남아 있다.
- 대표 이미지는 각 화면에서 한 번만 렌더링된다.

### Full repository verification

- 백엔드 전체 pytest와 compile/import check
- 프런트엔드 전체 테스트, TypeScript typecheck, lint
- Expo Doctor 17/17
- Expo web, iOS, Android export
- `git diff --check`
- 변경 금지 DB 파일에 diff가 없는지 별도 검사

### Visual verification

Figma 파일이 아니라 두 PR 커밋 자체가 이번 작업의 시각 기준이다. 같은 API fixture와 viewport를 사용해 PR head와 통합 브랜치의 다음 화면을 캡처한다.

- 일정 목록, 캘린더 선택일, 날짜별 목록, 일정 상세, 관리자 일정 폼
- 공지 목록과 가로·일반 세로·긴 세로 이미지가 있는 공지 상세
- 동아리 안내, 활동 인증, 스터디 모집의 목록·상세·작성
- 공지 알림 토스트와 공지가 아닌 알림 토스트
- 원우회 공식 답변 블록

라벨, 색상, spacing, radius, divider, shadow, icon, font weight를 PR 코드와 대조한다. 검색 아이콘, 참가자 검색 문구, 이미지 전체보기, 알림 닫기는 기능 보존을 위한 승인된 시각 예외로 체크리스트에 별도 표시한다.

웹은 캡처 비교까지 수행한다. iOS와 Android는 export 성공과 대표 화면 수동 확인을 기록하며, 실제 기기가 없는 경우 물리 기기 QA 미실행을 명확히 남긴다.

## Acceptance criteria

- DB 스키마, migration, seed와 기존 일정 category 데이터가 변경되지 않는다.
- 모든 일정 화면에 학사일정·행사일정·기타일정만 한글로 표시되고 영문 코드가 노출되지 않는다.
- 여섯 종류의 기존 일정은 편집 화면에서 선택된 3종 칩을 보이며, category를 건드리지 않은 수정 요청이 422 없이 성공하고 원본 값을 보존한다.
- 새 일정은 3종만 생성한다.
- 참여활동 검색, 이름·학번 참가자 검색, 이미지 전체보기, 갤러리, 댓글, 첨부, 관리자 CRUD와 내비게이션이 최신 `main`과 동일하게 동작한다.
- PR의 일정 태그, 알림 카드, 공지·참여활동 레이아웃, divider, radius, icon과 font 수정이 승인된 기능 예외를 제외하고 동일하다.
- 전체 자동 검증을 통과하고, 시각 비교 결과와 미실행 플랫폼 QA가 구분되어 기록된다.

## Rollback and failure safety

통합은 DB를 변경하지 않으므로 롤백은 코드 커밋 revert만으로 끝나야 한다. 데이터 복원 SQL이나 Alembic downgrade가 필요해지는 변경은 이 명세를 위반한 것으로 간주한다.

자동 검증이 통과해도 시각 캡처에서 PR과 차이가 발견되면 기능 예외인지 구현 누락인지 분류한다. 기능 예외가 아니면 병합 전에 수정하고 다시 전체 검증한다.

## Known pre-existing discrepancy

승인된 adaptive image 명세는 긴 대표 이미지 기준을 `500px`로 설명하지만 최신 `main`의 공통 preview 상수는 `600px`다. 이번 작업은 PR 때문에 생기는 회귀만 차단하고 현재 기능을 그대로 보존하므로 이 값을 바꾸지 않는다. 별도 작업에서 명세와 런타임 중 무엇을 기준으로 할지 결정해야 한다.

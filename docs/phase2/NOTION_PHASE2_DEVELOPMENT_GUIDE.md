# Phase 2 개발 착수 문서

> 2026-07-27 launch override: 이 문서는 초기 Notion discovery 결과를 보존한다. 실제 구현에는 `PLAN.md`, `API_CONTRACT.md`, `AUTH_PERMISSION_SPEC.md`, `FRONTEND_ROUTE_SPEC.md`가 우선한다. 콘텐츠는 member-only이고, 승인된 모바일 IA는 5탭이며, 상조회 신청은 신청자/관리자만 조회할 수 있고, 미디어는 공개 `/uploads` 경로로 제공하지 않는다.

Source: Notion `어플 개발(New)` > `커뮤니티 앱 고도화 일정표`
Target: 서강 AI-SW 대학원 커뮤니티 앱 리뉴얼
Purpose: Phase 2 설계 내용을 실제 개발 착수 가능한 수준으로 보완한다.

---

## 1. 문서 목적

이 문서는 기존 노션 Phase 2 문서의 부족한 부분을 보완하기 위한 개발 착수용 문서다.

기존 노션 문서는 IA, DB, API, 아키텍처의 방향성은 잘 잡혀 있지만, 실제 개발자가 바로 구현하기에는 다음 정보가 부족했다.

- API 요청/응답 규격
- 인증/권한 정책
- DB 스키마 최종 결정
- 프론트 라우트와 화면 매핑
- 구현 우선순위
- Phase 2 완료 기준

따라서 이 문서는 Phase 3 개발에 들어가기 전, Phase 2 산출물을 개발 가능한 계약 문서로 정리하는 것을 목표로 한다.

---

## 2. 현재 코드 상태 요약

현재 repo는 이미 기본적인 Phase 1 구조를 갖고 있다.

### Backend

- FastAPI
- SQLAlchemy 2.0
- Alembic
- PostgreSQL
- 게시판, 게시글, 댓글, 좋아요, 북마크 기본 API 존재

현재 구현된 주요 API:

- `GET /api/boards`
- `GET /api/boards/{board_id}`
- `GET /api/boards/{board_id}/posts`
- `GET /api/posts/{post_id}`
- `POST /api/boards/{board_id}/posts`
- `PUT /api/posts/{post_id}`
- `DELETE /api/posts/{post_id}`
- `POST /api/posts/{post_id}/like`
- `POST /api/posts/{post_id}/bookmark`
- `GET /api/posts/{post_id}/comments`
- `POST /api/posts/{post_id}/comments`
- `PUT /api/comments/{comment_id}`
- `DELETE /api/comments/{comment_id}`
- `GET /api/users/me`
- `PUT /api/users/me`

### Frontend

- React Native
- Expo Router
- React Query
- Zustand
- Axios API client
- 기본 탭, 게시판 목록, 게시글 상세, 글쓰기 화면 존재

### 해결된 Phase 2 기반 작업

- 인증/권한 기반이 구현되었다.
- 이전의 고정 사용자 방식은 제거되었다.
- 관리자/일반 사용자/비로그인 권한 구분이 backend dependency로 분리되었다.
- 노션 IA 기준 seed data가 backend seed에 반영되었다.
- Phase 2 DB 설계가 SQLAlchemy 모델/Alembic migration에 반영되었다.

---

## 3. Phase 2에서 반드시 확정해야 할 결정

### 3.1 사용자 정보

결정:

- 공개 표시명은 `nickname`을 사용한다.
- 회원가입 필수값으로 `cohort`를 추가한다.
- `student_id`는 Phase 2에서 필수값으로 두지 않는다.
- 로그인 ID는 `email` 기준으로 한다.

이유:

- 현재 코드가 이미 `nickname`을 사용하고 있다.
- 노션 회원가입 흐름은 이름/기수/연락처 중심이다.
- 학번을 필수로 강제하면 가입 장벽이 높아질 수 있다.

### 3.2 게시글 작성자명

결정:

- `posts.author_name`은 Phase 2에서 추가하지 않는다.
- 작성자 표시는 `users.nickname`을 join해서 표시한다.

이유:

- 현재 코드 구조와 맞다.
- 작성 당시 이름을 영구 보존해야 하는 요구가 아직 없다.

### 3.3 게시판 구조

결정:

- `boards`를 IA seed의 기준으로 사용한다.
- `boards`에 `board_type`, `read_permission`, `write_permission`, `allow_anonymous`를 추가한다.

필요 필드:

- `board_type`
- `allow_anonymous`
- `read_permission`
- `write_permission`
- `metadata`

### 3.4 인증 방식

결정:

- JWT access token + DB 저장 refresh token을 사용한다.
- refresh token은 원문 저장하지 않고 hash로 저장한다.
- logout 시 refresh token을 revoke한다.
- access token 만료 시 refresh token으로 재발급한다.

권장 만료 시간:

- access token: 15분
- refresh token: 30일
- 이메일 인증 코드: 10분
- 비밀번호 재설정 token: 30분

---

## 4. 권한 정책

### 역할

| Role | 설명 |
| --- | --- |
| guest | 비로그인 사용자 |
| user | 인증된 일반 사용자 |
| admin | 원우회/운영 관리자 |

### 기능별 권한

> Historical assumption retained for traceability: the `guest` content-read cells below were superseded on 2026-07-05. Current content APIs and routes require an authenticated member; use `AUTH_PERMISSION_SPEC.md`.

| 기능 | guest | user | admin |
| --- | --- | --- | --- |
| 게시판 목록 조회 | 가능 | 가능 | 가능 |
| 게시글 상세 조회 | 가능 | 가능 | 가능 |
| 일반 게시글 작성 | 불가 | 가능 | 가능 |
| 공지 작성 | 불가 | 불가 | 가능 |
| 게시글 수정/삭제 | 불가 | 본인 글만 | 전체 가능 |
| 댓글 작성 | 불가 | 가능 | 가능 |
| 댓글 수정/삭제 | 불가 | 본인 댓글만 | 전체 가능 |
| 좋아요/북마크 | 불가 | 가능 | 가능 |
| 건의사항 작성 | 불가 | 가능 | 가능 |
| 건의사항 공식 답변 | 불가 | 불가 | 가능 |
| FAQ/일정/안내 관리 | 불가 | 불가 | 가능 |
| 프로필 수정 | 불가 | 본인만 | 본인만 |

### 익명 글쓰기

익명 글쓰기 규칙:

- `boards.allow_anonymous = true`인 게시판에서만 허용한다.
- DB에는 실제 `author_id`를 저장한다.
- 일반 사용자에게는 `author_nickname = "Anonymous"`로 내려준다.
- 관리자에게 실제 작성자를 보여줄지는 운영 정책으로 별도 결정한다.

### 댓글 depth

노션 요구사항 기준 댓글은 2-depth까지만 허용한다.

- root comment: `parent_id = null`
- reply: `parent_id`가 root comment를 가리킴
- reply의 reply는 `BAD_REQUEST`로 거절

---

## 5. 목표 IA와 seed data

### 목표 상위 메뉴

- Notices
- Sogang Life Schedule
- Community
- Participation
- Student Council
- Settings

### Phase 2 board seed

| Category | Slug | Name | Type | Write Permission |
| --- | --- | --- | --- | --- |
| notices | academic-notices | Academic Notices | notice | admin |
| notices | event-notices | Event Notices | notice | admin |
| community | event-album | Event Album | album | user |
| resources | lecture-reviews | Lecture Reviews | resource | user |
| resources | exam-archive | Exam Archive | resource | user |
| resources | comprehensive-exam | Comprehensive Exam | resource | user |
| participation | club-activity | Club Activity Certification | activity_certification | user |
| participation | study-activity | Study Activity Certification | activity_certification | user |
| participation | networking-activity | Networking Activity Certification | activity_certification | user |
| council | council-activity | Student Council Activity History | activity_history | admin |
| council | accounting | Accounting Link | external_link | admin |
| council | suggestions | Suggestions | suggestion | user |
| council | mutual-aid | Mutual Aid | mutual_aid | admin |

> Superseded implementation detail: mutual-aid submission is now member-writable (`user`), while reads are requester/admin scoped and processing is admin-only. See `DB_SCHEMA_DECISIONS.md` and `AUTH_PERMISSION_SPEC.md`.

FAQ, Calendar, Guide, Organization Intro는 게시판으로 억지로 넣지 않고 별도 API/테이블로 분리한다.

---

## 6. API 설계 보완 기준

API는 기존 `{status, data}` 응답 형식을 유지한다.

### 공통 성공 응답

```json
{
  "status": "success",
  "data": {}
}
```

### 공통 에러 응답

```json
{
  "status": "error",
  "message": "Human-readable message.",
  "code": "MACHINE_READABLE_CODE"
}
```

### 필수 API 그룹

#### Auth

- `POST /api/auth/login`
- `POST /api/auth/register/request-verification`
- `POST /api/auth/register/verify-email`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`

#### Users

- `GET /api/users/me`
- `PUT /api/users/me`
- `PUT /api/users/me/password`
- `DELETE /api/users/me`
- `GET /api/users/me/activity`

#### Boards / Posts

- `GET /api/boards`
- `GET /api/boards/{board_id}`
- `GET /api/boards/{board_id}/posts`
- `GET /api/posts/{post_id}`
- `POST /api/boards/{board_id}/posts`
- `PUT /api/posts/{post_id}`
- `DELETE /api/posts/{post_id}`
- `PUT /api/posts/{post_id}/pin`
- `POST /api/posts/{post_id}/like`
- `POST /api/posts/{post_id}/bookmark`

#### Comments

- `GET /api/posts/{post_id}/comments`
- `POST /api/posts/{post_id}/comments`
- `PUT /api/comments/{comment_id}`
- `DELETE /api/comments/{comment_id}`

#### Search

- `GET /api/search`
- `GET /api/search/recent`

#### Media

- `POST /api/media/uploads`
- `GET /api/media/{media_id}`

#### Events

- `GET /api/events`
- `POST /api/events`
- `PUT /api/events/{event_id}`
- `DELETE /api/events/{event_id}`

#### FAQ / Guide

- `GET /api/faqs`
- `POST /api/faqs`
- `PUT /api/faqs/{faq_id}`
- `DELETE /api/faqs/{faq_id}`
- `GET /api/guides`
- `GET /api/guides/{guide_id}`
- `POST /api/guides`
- `PUT /api/guides/{guide_id}`
- `DELETE /api/guides/{guide_id}`

#### Notifications

- `GET /api/notifications`
- `PUT /api/notifications/{notification_id}/read`
- `GET /api/notifications/settings/me`
- `PUT /api/notifications/settings/me`

---

## 7. DB 구현 순서

### Step 1. 기존 테이블 확장

`users`:

- `cohort`
- `last_login_at`

`boards`:

- `board_type`
- `allow_anonymous`
- `read_permission`
- `write_permission`
- `metadata`

`posts`:

- `is_anonymous`
- `status`
- `category`
- `metadata`
- `deleted_at`

### Step 2. 인증 테이블 추가

- `refresh_tokens`
- `email_verification_tokens`
- `password_reset_tokens`

### Step 3. 미디어 테이블 추가

- `media_assets`
- `post_attachments`

### Step 4. 도메인 테이블 추가

- `events`
- `faqs`
- `post_lecture_reviews`
- `post_suggestions`
- `notification_settings`
- `notifications`
- `search_histories`

### Step 5. seed data 교체

현재 seed에는 구버전 메뉴가 섞여 있으므로, 목표 IA 기준 board seed로 교체한다.

---

## 8. Frontend 라우트 설계

> Historical route map retained for traceability: `guest` on Home, Boards, Community, Board/Post, Calendar, Event, FAQ, and Search was superseded on 2026-07-05. Use `FRONTEND_ROUTE_SPEC.md` for the implemented member-only route contract.

### Auth

| Screen | Route | Auth |
| --- | --- | --- |
| Login | `/auth/login` | guest |
| Register | `/auth/register` | guest |
| Password Reset | `/auth/password-reset` | guest |

### Main

| Screen | Route | Auth |
| --- | --- | --- |
| Home | `/(tabs)/home` | guest |
| Boards | `/(tabs)/boards` | guest |
| Community | `/(tabs)/community` | guest |
| Settings | `/(tabs)/settings` | user |

### Board / Post

| Screen | Route | Auth |
| --- | --- | --- |
| Board List | `/board/[boardId]` | guest |
| Post Detail | `/board/post/[postId]` | guest |
| Post Create | `/board/post/create?boardId=` | user/admin |
| Post Edit | `/board/post/edit/[postId]` | owner/admin |

### Extra

| Screen | Route | Auth |
| --- | --- | --- |
| Calendar | `/events/calendar` | guest |
| Event List | `/events` | guest |
| FAQ | `/faq` | guest |
| Search | `/search` | guest |
| Profile | `/settings/profile` | user |
| Notifications | `/settings/notifications` | user |
| Account | `/settings/account` | user |
| My Activity | `/settings/activity` | user |

---

## 9. 구현 우선순위

### 1순위: DB와 seed 정리

목표:

- Phase 2 DB 결정사항을 모델과 migration에 반영한다.
- 구버전 board seed를 목표 IA 기준으로 교체한다.

완료 기준:

- 빈 DB에서 Alembic migration이 성공한다.
- 앱 시작 시 목표 board seed가 들어간다.
- 기존 게시판/게시글 API가 깨지지 않는다.

### 2순위: 인증/권한 구현

목표:

- 고정 사용자 방식 제거
- JWT/refresh token 기반 로그인 구현
- admin/user/guest 권한 적용

완료 기준:

- 초기 가정은 guest 읽기 허용이었으나 2026-07-05 override로 폐기됐다. 현재 guest는 인증·법률·지원·계정 삭제 경로만 사용할 수 있고 콘텐츠 요청은 거부된다.
- user는 허용된 게시판에 글/댓글을 쓸 수 있다.
- admin은 공지/FAQ/일정/관리 기능을 사용할 수 있다.
- 권한 없는 요청은 401 또는 403을 반환한다.

### 3순위: P0 API 완성

목표:

- 게시글 검색/필터
- pin
- 익명 옵션
- 댓글 2-depth 제한
- 좋아요/북마크 안정화

완료 기준:

- API 계약 문서와 실제 응답이 일치한다.
- pagination, error envelope, permission behavior가 일관된다.

### 4순위: 프론트 인증과 라우트 가드

목표:

- 로그인 상태 저장
- access token 자동 첨부
- 401 발생 시 refresh
- 비로그인 write 시 login 이동

완료 기준:

- 로그인/회원가입/비밀번호 재설정 화면이 API와 연결된다.
- logout이 정상 동작한다.
- 권한별 버튼 노출이 맞다.

### 5순위: IA 기반 화면 정리

목표:

- 홈 quick menu
- target IA 기반 board group
- 검색/필터 UI
- 설정 하위 화면

완료 기준:

- 노션 IA와 앱 메뉴가 일치한다.
- 주요 P0 flow가 화면에서 끊기지 않는다.

### 6순위: 미디어, 일정, FAQ, 알림

목표:

- 첨부파일/이미지 업로드
- 캘린더
- FAQ
- 알림 설정/알림 목록

완료 기준:

- 게시글 첨부파일 업로드/조회 가능
- 일정 조회 가능
- FAQ 조회 가능
- 알림 설정이 사용자별로 저장된다.

---

## 10. 개발 티켓 초안

### Backend

- BE-001: Alembic migration for Phase 2 schema
- BE-002: Update SQLAlchemy models
- BE-003: Replace board seed data with target IA
- BE-004: Implement password hashing
- BE-005: Implement login and JWT access token
- BE-006: Implement refresh token rotation
- BE-007: Implement logout
- BE-008: Implement email verification for signup
- BE-009: Implement password reset
- BE-010: Add auth dependencies and remove fixed user
- BE-011: Add board permission enforcement
- BE-012: Add post search/filter/highlighting
- BE-013: Add admin pin endpoint
- BE-014: Enforce comment max depth 2
- BE-015: Add media upload foundation
- BE-016: Add events API
- BE-017: Add FAQ API
- BE-018: Add notification settings and notifications

### Frontend

- FE-001: Auth store
- FE-002: Axios auth interceptor and refresh handling
- FE-003: Login screen API integration
- FE-004: Register flow API integration
- FE-005: Password reset flow
- FE-006: Route guards
- FE-007: Update tabs and hubs to target IA
- FE-008: Board list search/filter/sort UI
- FE-009: Permission-aware create/edit/delete buttons
- FE-010: Post detail attachment/comment/reaction polish
- FE-011: Settings profile/account/notification screens
- FE-012: Global search screen
- FE-013: Calendar screen
- FE-014: FAQ screen

### QA / Docs

- QA-001: Auth API test cases
- QA-002: Permission matrix test cases
- QA-003: Board/post/comment regression tests
- QA-004: Phase 2 review checklist
- DOC-001: Update README quick start
- DOC-002: Document environment variables

---

## 11. Phase 2 완료 체크리스트

### 기획/설계

- [ ] IA가 앱 route와 seed data에 반영됨
- [ ] API 계약서가 실제 구현과 일치함
- [ ] DB schema가 SQLAlchemy/Alembic과 일치함
- [ ] 인증/권한 정책이 backend에서 강제됨
- [ ] 디자인 핵심 화면이 Figma에서 확정됨

### Backend

- [ ] 고정 user id 제거
- [ ] 로그인/회원가입/이메일 인증 구현
- [ ] refresh/logout 구현
- [ ] 권한별 API 접근 제어 구현
- [ ] 검색/필터 구현
- [ ] 댓글 2-depth 제한 구현
- [ ] media/event/FAQ/notification 기반 구현

### Frontend

- [ ] auth store 구현
- [ ] token refresh 처리
- [ ] route guard 구현
- [ ] target IA 메뉴 반영
- [ ] board list/detail/create flow 정상
- [ ] 검색/필터 UI 구현
- [ ] settings 하위 화면 구현

### QA

- [ ] guest/user/admin 권한 테스트
- [ ] 게시글 CRUD 테스트
- [ ] 댓글/답글 테스트
- [ ] 좋아요/북마크 테스트
- [ ] 검색/필터 테스트
- [ ] 인증 만료/refresh 테스트

---

## 12. Phase 3 진입 조건

다음 조건을 만족하면 Phase 3 개발 Sprint로 넘어간다.

- P0 기능의 API/DB/권한 설계가 구현되어 있다.
- 인증이 실제 사용자 기준으로 동작한다.
- target IA가 앱 메뉴와 seed data에 반영되어 있다.
- 남은 P1/P2 기능은 backlog로 분리되어 있다.
- Phase 2 리뷰에서 치명적인 설계 미비가 없다.

---

## 13. 관련 로컬 문서

세부 문서는 아래 파일을 기준으로 한다.

- `PLAN.md`
- `AGENTS.md`
- `CODEX.md`
- `docs/phase2/API_CONTRACT.md`
- `docs/phase2/DB_SCHEMA_DECISIONS.md`
- `docs/phase2/AUTH_PERMISSION_SPEC.md`
- `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- `docs/phase2/IMPLEMENTATION_SEQUENCE.md`
- `docs/phase2/PHASE2_REVIEW_CHECKLIST.md`

# Android 뒤로가기·홈 왕복 감사 — 2026-09-12

후속 수정과 새 APK 재검증은 [NAVIGATION_FIXES_2026-09-12.md](NAVIGATION_FIXES_2026-09-12.md)에 기록한다. 아래 내용은 수정 전 기준선이다.

WP5/WP9 P0 사용성 검증. 사용자 요청: 앱의 뒤로가기와 홈 왕복에서 어색하거나 잘못된 동작 확인. **감사만 진행하며 앱 동작은 수정하지 않는다.**

35개 라우트를 목록화하고 32개는 APK에서 최소 한 상태를 실행했다. 관리자 2개와 상조회 완료 1개는 소스만 확인했다. **주요 개선 항목 7건**, XML에 기록한 판정 124개 중 113개 통과/11개 기대와 다름(7건의 반복·분기 재현), 기존 소스 단위 테스트 107개 통과. ‘미실행 0’은 해당 124개 판정에 한정하며 인증 후 단계 등 모든 조합을 실행했다는 뜻이 아니다.

## 검증 기준과 버전

- 실행: Pixel 7 에뮬레이터, Android 16, `kr.ac.sogang.aisw.campus`, 0.1.0 / versionCode 4, 9월 11일 APK. 로그인된 회원 화면.
- 비교 소스: `cb692f87cfebc4bd05560028c1850f9efccc392c`. 설치 APK와 현재 소스의 차이는 `outputs/qa/navigation-audit-2026-09-12/source-inventory.json`에 기록했다.
- APK는 9월 12일 갤러리 터치·댓글 키보드·원우회 제목 커밋 이전이다. 이 감사에서 이전 APK 동작을 최신 APK 검증이라고 표현하지 않는다.
- 상단 뒤로, Android 뒤로, 하단 홈/탭 재선택, Android 홈 후 앱 복귀를 구분한다. 앱 홈은 탭 이동이며 Android 홈은 백그라운드 전환이다.
- 하단 탭 재선택 시 해당 탭 첫 화면으로 초기화하는 것은 현재 제품 동작이다. 이를 상태 유실 결함으로 집계하지 않는다.
- 게시물·댓글·신고·탈퇴·설정 변경은 제출하지 않는다. 입력 및 팝업은 취소하여 탐색만 검증한다.
- 증거 폴더: `outputs/qa/navigation-audit-2026-09-12/`. 기본 캡처에 동일 이름의 원본 PNG, Android UI XML, 요약 JSON이 있다. 비회원 환경에서 UIAutomator가 불안정한 이후 `*-visual`, `G12/G13`, `LT/LP/LS/LD` 캡처는 PNG를 직접 시각 확인했다. `actions.jsonl`에는 순서·좌표·레이블·시각을 기록했다.
- 모든 가능한 데이터/OS/권한/타이밍의 조합을 전수 검증했다는 의미가 아니다. 35개 라우트와 주요 상태 조합의 실제 실행/소스 확인/미실행을 구분한다.

## 재현된 결함

### NAV-01 / P2 — FAQ Android 뒤로가기가 원우회를 건너뛴다

1. 하단 원우회 → 자주 묻는 질문.
2. Android 뒤로가기.
3. 실제: 홈. 기대: 원우회 메뉴.
4. 동일 경로의 상단 뒤로가기는 원우회 메뉴로 정상 복귀한다.

증거: `C07-hardware-entry`, `C07-hardware-back`, `C07-header-back`; `council-results.json`.

현재 소스에도 남음: `frontend/app/(tabs)/faq.tsx`의 헤더만 Council로 replace한다. FAQ 전용 Android Back 처리가 없고 탭의 `backBehavior="initialRoute"`가 Home으로 보낸다. 수정 방향: 헤더와 Android Back에 동일한 원우회 복귀 함수를 연결한다.

### NAV-02 / P2 — 게시판 내부 검색에서 Android 뒤로가기가 검색을 닫지 않고 홈으로 간다

1. 커뮤니티 → 검색 → 입력란 포커스/입력.
2. Android 뒤로 한 번: 키보드 닫힘.
3. Android 뒤로 다시: 홈으로 이동.
4. 상단 ‘검색 닫기’는 원래 게시판 목록에 남는다.

증거: `S02-inline-search`, `S03-search-keyboard`, `S04-search-query`, `S07-search-hide-ime`, `S08-search-hardware-back`. 자료공유의 상단 닫기 비교: `S11-resource-search`, `S12-resource-search-close`. 참여활동 → 동아리 활동 인증 → 검색에서도 첫 Back은 키보드, 둘째 Back은 Home으로 동일 재현했다(`P22`–`P24`).

현재 소스에도 남음: `board/[boardId].tsx`의 Android Back은 `isTabRoot`에서 처리하지 않으며 `showSearch` 닫기 우선순위도 없다. 수정 방향: 키보드 이후 검색 닫기를 먼저 처리하고, 검색이 닫힌 루트에서만 Home으로 이동한다.

### NAV-03 / P2 — 공지 검색에서 뒤로가기가 공지 목록 대신 홈으로 간다

1. 하단 공지사항 → 검색.
2. Android 뒤로: 홈. 상단 뒤로가기가 실제 눌린 경우에도 홈.
3. 기대: 검색을 시작한 공지사항 목록.

증거: `S18-notice-search`, `S19-notice-search-hardware-back`, `S21-notice-search`, `S23-notice-header-right-edge`, `S24-notice-header-settled`.

현재 소스에도 남음: `search.tsx`가 `canGoBack()`만으로 `router.back()`을 선택한다. 탭 히스토리가 공지 목록 복귀를 보장하지 않는다. 수정 방향: 공지 검색의 origin을 명시적으로 공지 목록으로 처리한다.

별도 구버전 관찰: `S22`에서 버튼 중앙 x=40은 눌리지 않았고 같은 버튼 내부 x=57에서 눌렸다. APK의 왼쪽 24dp drawer 터치막에 해당한다. 현재 `cf1be8c`는 이 터치막을 제거했으므로 **미수정 신규 결함으로 중복 집계하지 않는다**. 최신 APK의 공지 검색 뒤로 버튼에도 재검증이 필요하다.

### NAV-04 / P2 — 홈 왕복 후 일정 Android 뒤로가기에 과거 방문 날짜가 나온다

1. 홈 달력 → 9월 1일 → 상단 뒤로 → 홈.
2. 홈 달력 → 9월 2일 → Android 뒤로.
3. 실제: 9월 1일 일정. 기대: 방금 들어온 홈 달력.
4. 상단 뒤로는 Home으로 정상 이동한다.

증거: `E02-day1`, `E03-day1-header-home`, `E04-day2`, `E05-day2-hardware-back`, `E06-day2-back-settled`.

현재 소스에도 남음: `events/day/[date].tsx`의 헤더만 `eventDayBackDecision(returnTo, canGoBack)`을 사용한다. Android Back은 보존된 events 스택을 pop한다. 수정 방향: 날짜/일정 상세의 Android Back도 진입 origin을 사용하는 동일한 함수로 통일하고, 반복 진입 때 오래된 스택이 복귀 경로로 노출되지 않는지 검증한다.

### NAV-05 / P2 — 자료공유 정렬 메뉴에서 Back이 메뉴를 닫지 않고 홈으로 이동한다

1. 커뮤니티 → 자료공유 → 정렬 변경. 최신순/인기순 메뉴가 펼쳐진다.
2. Android 뒤로.
3. 실제: Home. 기대: 정렬 메뉴만 닫고 자료공유 목록 유지.

증거: `R03-sort-menu`, `R04-sort-back`, 안정화 후 `R05-sort-back-settled`.

현재 소스에도 남음: `board/[boardId].tsx`의 `sortMenuOpen`은 옵션 선택 시에만 닫히며 Android Back 우선 처리가 없다. NAV-02와 함께 검색/정렬의 닫기 우선순위를 정의해야 한다.

### NAV-06 / P2 사용성 — 불러오기 실패 화면에 상단 뒤로가기가 없다

존재하지 않는 게시글/일정 ID `999999`를 앱 딥링크로 열고 요청이 실패할 때까지 기다렸다. 게시글 상세, 일정 상세, 게시글 수정 모두 오류 문구와 ‘다시 시도’만 있고 상단 뒤로/닫기 버튼이 없다(`X07-post-error`, `X09-event-error`, `X11-edit-error`). 하단 탭과 Android Back으로 탈출은 가능하므로 완전한 막힘으로 분류하지 않는다.

현재 소스 `board/post/[postId].tsx`, `board/post/edit/[postId].tsx`, `events/[eventId].tsx`는 loading/error 분기에서 헤더를 포함하지 않고 조기 반환한다. 화면 헤더와 origin 복귀를 오류/로딩 상태에서도 제공하는 편이 일관적이다. 실험은 실제 글을 삭제하지 않고 존재하지 않는 ID를 사용했다.

### NAV-07 / P2 — 알림에서 연 일정의 Android Back이 알림 목록을 건너뛴다

1. 홈 → 알림 → ‘신규 동아리 모집 마감 일정이 오늘이에요’.
2. 일정 상세에서 Android 뒤로.
3. 실제: Home. 기대: 알림 목록.

증거: `L06-notifications`, `NN01-notification-event`, `NN02-event-settled`, `NN03-event-hardware-back`, `NN04-return-settled`. 같은 항목을 다시 열어 상단 뒤로를 누르면 알림 목록으로 정상 복귀했다(`NN06`–`NN08`).

현재 소스 `events/[eventId].tsx`의 헤더는 `returnTo`를 전달받아 `eventDetailBackDecision`을 사용하지만 Android Back에는 연결하지 않는다. NAV-04와 함께 일정의 헤더/Android 복귀 경로를 통일해야 한다. 알림 항목을 실제로 열었으므로 해당 알림의 읽음 상태가 갱신될 수 있다.

## 검증 기록

실행한 화면의 주요 상태와 제한을 아래에 기록한다. 서로 다른 도착 화면 6건(NAV-01~05/07)과 오류 화면의 헤더 부재 1건(NAV-06)을 구분했다. 루트 로그인 화살표와 OS 가장자리 제스처 충돌은 추가 개선 후보이며 아래 범위/관찰에 별도 기록한다.

- 5개 탭: 홈 왕복, 동일 탭 재선택, Android 홈/복귀, 루트 Back/종료·재실행 — `tab-results.json` 22/22 통과.
- 원우회 7개 메뉴: 상단/Android 뒤로 14개 비교 — FAQ Android Back 1개 실패, 나머지 13개 통과.
- 기수별 기장단/역대 원우회: 내부 상세 → 목록 → 원우회 복귀. 기장단 상세 Android 홈/복귀 상태 유지.
- 일정 상세 → Android 홈/복귀 → 직전 날짜 목록 복귀: `E09`–`E12` 정상. Home 공지 상세 → Back은 Home, 알림 목록 → Back도 Home: `H01`–`H04`.
- 마이페이지 drawer Android 홈/복귀 → Back으로 drawer만 닫힘: `D01`–`D04`. 프로필 전공 선택창은 Android 홈/복귀 후 유지되고 Back으로 닫힘: `D06`–`D10`. 프로필 사진 선택 sheet → Back: `D11`–`D13` 정상.
- 홈 이외 공지/커뮤니티/참여활동/원우회 → 가장자리 swipe로 drawer → 계정 설정 → Back drawer → Back 원래 탭: `DT01`–`DT04`, 16/16 통과. 이 4개 탭 검증은 Android **3버튼 탐색 모드**로 실행하고 원래 제스처 모드로 즉시 복원했다. 제스처 모드의 같은 가장자리 swipe는 시스템 Back이 먼저 실행되어 참여활동에서 Home으로 갔다(`R07`); drawer 복귀 결함과 구분한 OS 제스처 충돌 관찰이다. 최신 APK/실기기에서 제스처 시작 영역을 추가 확인할 필요가 있다.
- 계정 설정: 비밀번호 화면의 첫 Back은 키보드만 닫고 다음 Back은 계정 설정. 이메일 인증 정보 상단 Back, 개인정보 동의 문서 Android Back 모두 계정 설정: `A01`–`A09`.
- 탈퇴 확인창은 첫 Android Back에 닫히고, 이후 탈퇴 안내 → 계정 설정 → drawer → Home 순서로 돌아왔다: `A10`–`A16`. 캡처 이름의 `ime-back`/`modal-back`은 계획 이름이며, 실제 첫 Back은 비밀번호 창 전체를 닫았다. 비밀번호를 입력하거나 탈퇴를 제출하지 않았다.
- 내 글/스크랩 목록: 각각 Android/상단 Back으로 drawer 복귀: `M01`–`M06`.
- 내 글 → 네트워킹 상세 → Back은 내 글 목록, 스크랩 → 공지 상세 → Back은 스크랩 목록으로 복귀: `M08`–`M14`. 그다음 Back은 drawer 복귀(`M11`, `M15`).
- 사진첩: 사진 선택 후 Android 홈/복귀 및 목록 Back: `B01`–`B08`. 시험족보 상세 더보기와 신고 sheet의 Back은 sheet만 닫음: `B09`–`B14`. 댓글 초안 입력 상태의 Android 홈/복귀는 입력과 화면을 유지하고, Back은 키보드를 먼저 닫은 뒤 원래 시험족보 목록으로 복귀: `B15`–`B20`. 댓글 등록은 실행하지 않았다.
- 자료공유 글쓰기 게시판 선택 dropdown → Back은 dropdown만 닫음: `F01`–`F03`. 제목 초안과 키보드가 Android 홈/복귀 후 유지: `F04`–`F08`. 파일 선택기는 Android DocumentsUI가 열렸고 취소했다. 최초 UI dump의 일시적인 null root는 안정화 후 `F09-file-picker-settled`로 다시 캡처했으며 앱 오류로 집계하지 않는다.
- 파일 선택기 Back은 원래 초안을 유지했다(`F10`). 앱 홈 → 커뮤니티 → 같은 시험족보 글쓰기 재진입에도 제목 초안이 유지됐다(`F11`–`F15`). 다른 게시판인 스터디 모집을 열 때는 별도 빈 폼으로 열렸다(`P05`/`P06`); 서로 다른 게시판에 초안이 섞이는 현상은 재현되지 않았다.
- 스터디 모집 상세/작성 Back은 원래 스터디 목록을 유지했다: `P02`–`P07`.
- 본인 네트워킹 글 삭제 확인창 → Back 취소, 글 수정 → Android 홈/복귀 → Back 상세 → Back 목록: `O01`–`O09` 정상. 수정/삭제를 제출하지 않았다.
- 동아리 안내 상세 → Android Back은 동아리 목록 유지: `P11b`–`P12`. 최초 타이틀 탭 직후 캡처 `P11`은 전환 전 목록이므로 상세 통과 증거로 쓰지 않는다.
- 활동 인증: 날짜 선택 상태 Android 홈/복귀 유지, Back 날짜 닫기, 동아리 선택 sheet Back 닫기, 작성 Back 목록: `P14`–`P21` 정상.
- 상조회 신청: 종류/날짜/관계 선택창의 Back은 창만 닫고, 폼 Back → 상조회 목록 → 원우회 순서: `Q03`–`Q12`. 건의사항 작성 Back → 빈 건의 목록 → 원우회: `Q13`–`Q16` 정상.
- FAQ 답변을 펼친 상태는 Android 홈/복귀 후 유지되고, 헤더 Back으로 원우회 복귀: `Q18`–`Q21`. FAQ의 Android Back 결함은 NAV-01에 별도 기록했다.
- 숨겨진 레거시 `settings`, `settings/blocks` 경로는 딥링크로 열어 Back으로 빠져나오는 것까지 확인했다(`L01`–`L04`). 현재 일반 메뉴에서의 진입 흐름과 동일한 검증으로 취급하지 않는다. 보존된 settings 스택 때문에 Back에 과거 스크랩 목록이 나타났으며, 차단 관리의 상단 버튼은 상태 표시줄 영역에 가깝다. 일반 사용자 노출 경로를 복원할 경우 origin과 safe area를 함께 재검증해야 한다.
- `events/index` 딥링크는 Home으로 리다이렉트됐다(`L05`).
- 최종 복원 후 지원/문의 딥링크 → Back Home, 공개 삭제 요청 → Android 홈/복귀 유지 → Back Home을 확인했다(`Z02`–`Z07`).
- 최종 Home Back으로 런처에 나간 뒤 재실행 → 참여활동 → Android Back은 Home으로 정상 복귀했다(`Z08`–`Z12`). 기존 ‘재실행 후 참여활동 Back 시 종료’는 이번 재확인에서도 재현되지 않았다. 초기 긴 글의 키보드 닫기 후 스크롤 재검증은 `docs/qa/FOUR_REMAINING_ISSUES_2026-09-12.md`에 별도로 기록돼 있다.
- 전환 동영상: `V01`–`V08`, 프로필 2회 왕복 및 알림/계정 설정 왕복. 20fps 표본 **602프레임**, Home 배너 검출 0프레임. 원본 영상, 추출 전체 프레임, SHA-256 및 프레임별 측정값은 `video-analysis.json`, `analyze_videos.py`. 프로필 영상은 시작 drawer와 종료 profile도 시각 확인했다. 이 표본에서의 미재현이며 모든 기기·프레임 타이밍의 무결함을 보장하지 않는다.
- 현재 소스 탐색 관련 기존 자동화: 11개 테스트 파일, 107개 테스트 통과. `navigation-tests.log`. 함수 단위 테스트 통과가 실제 화면의 BackHandler 연결까지 보장하지 않는다는 점이 이번 FAQ/일정 재현에서 확인됐다.

## 35개 라우트별 범위

‘실행’은 아래 주요 상태를 APK에서 실행했다는 뜻이며 전체 상태 통과를 뜻하지 않는다. 결함이 있는 경로도 포함한다. 회원가입/삭제/게시글 등의 서버 처리 성공 이후 상태는 별도로 제한한다.

| 라우트 (`frontend/app/` 기준) | 범위와 증거 |
|---|---|
| `(tabs)/home.tsx` | 실행: 5개 탭 왕복, Android 홈/복귀, Back 종료/재실행. T05/T06, NN09 |
| `(tabs)/notices.tsx` | 실행: 탭 복귀, 목록/검색, Home 공지 상세. T01, H01/H02, S18–S24 |
| `(tabs)/community.tsx` | 실행: 사진첩/자료공유, 검색, 필터/정렬, 재선택. B/F/R, T02 |
| `(tabs)/participation.tsx` | 실행: 동아리/스터디/네트워킹, 안내/활동 인증, 검색, 탭 왕복. P/O, T03 |
| `(tabs)/council.tsx` | 실행: 7개 메뉴, 하위 목록/상세/작성 복귀. C/N/Q, T04 |
| `(tabs)/board/[boardId].tsx` | 실행: 원우회 메뉴, 중첩 기장단/역대 원우회, 상조회/건의, 탭에 삽입된 게시판. C/N/P/Q/R |
| `(tabs)/board/post/[postId].tsx` | 실행: 일반/앨범/참여 안내/내 글·스크랩 진입, 댓글 초안, 더보기/신고/게시글 삭제 취소, 오류. B/M/O/X07 |
| `(tabs)/board/post/create.tsx` | 실행: 자료공유/스터디/활동 인증/상조회/건의 폼, 선택창/파일 취소, 초안 홈 왕복. F/P/Q |
| `(tabs)/board/post/edit/[postId].tsx` | 실행: 본인 네트워킹 글 수정 진입·홈 왕복·취소, 잘못된 ID 오류. O05–O08, X11 |
| `(tabs)/events/day/[date].tsx` | 실행: 서로 다른 날짜 반복 방문, 헤더/Android Back. E02–E06, E12 |
| `(tabs)/events/[eventId].tsx` | 실행: 날짜/알림 진입 비교, Android 홈/복귀, 오류. E09–E12, NN, X09 |
| `(tabs)/events/index.tsx` | 딥링크 실행: Home 리다이렉트. L05 |
| `(tabs)/notifications.tsx` | 실행: Home 진입/Back, 알림 → 일정 → 헤더/Android Back. H03/H04, L06, NN |
| `(tabs)/search.tsx` | 실행: 공지 검색 헤더/Android Back. S18–S24. 검색 결과의 모든 데이터별 상세 조합은 제외 |
| `(tabs)/faq.tsx` | 실행: 헤더/Android 비교, 답변 펼침·Android 홈/복귀. C07, Q17–Q21 |
| `(tabs)/settings/profile.tsx` | 실행: 전공/사진 선택창, 반복 헤더/Android 복귀, 영상. D06–D13, V01/V02/V07/V08 |
| `(tabs)/settings/notifications.tsx` | 실행: 진입/Android 복귀와 영상. V03/V04. 설정값 저장 제외 |
| `(tabs)/settings/account.tsx` | 실행: 비밀번호/인증/개인정보/탈퇴 하위 진입, 5개 탭 origin 복귀. A/DT/V05/V06 |
| `(tabs)/settings/password.tsx` | 실행: 입력 포커스·키보드 닫기·계정 복귀. A02–A05. 실제 변경 제외 |
| `(tabs)/settings/email-verification.tsx` | 실행: 회원 인증 정보 → 헤더 계정 복귀. A06/A07 |
| `(tabs)/settings/account-deletion.tsx` | 실행: 동의/비밀번호 확인창 취소 → 계정 → drawer. A10–A16. 탈퇴 제출 제외 |
| `(tabs)/settings/activity.tsx` | 실행: 내 글/스크랩, 상세 → 원래 목록 → drawer. M01–M16 |
| `(tabs)/settings/index.tsx` | 레거시 딥링크 실행/Back. L03/L04. 일반 메뉴 진입 검증과 구분 |
| `(tabs)/settings/blocks.tsx` | 레거시 딥링크 실행/Back, 빈 목록. L01/L02. 실제 차단/해제 제외 |
| `(tabs)/council/mutual-aid-complete.tsx` | 소스만: 완료 확인 시 Council replace. 실제 상조회 신청 성공/실패 후 Back 미실행 |
| `admin/index.tsx` | 소스만: 권한 guard, BackButton fallback, 저장 성공 modal 회귀 테스트. 관리자 내부 편집/저장·권한별 실제 복귀 미실행 |
| `admin/migration-review.tsx` | 소스만: 관리자 fallback BackButton, 읽기 요청/상태 필터. 관리자 실데이터 탐색 미실행 |
| `index.tsx` | 실행: 회원 앱 실행/재실행 시 Home. 소스는 인증 상태에 따라 Home/Login redirect |
| `auth/login.tsx` | 별도 사용자 실행: 루트 헤더, Android 홈/복귀, Back 런처 복귀. G01c/G02, G08–G11의 실제 화면은 Login/런처(파일명 reset과 구분) |
| `auth/register.tsx` | 별도 사용자 초기 이메일 화면 실행. G03/G04b → 첫 Back 키보드 닫힘 G05 → 둘째 Back Login G06-visual. 메일 발송 이후 단계 제외 |
| `auth/password-reset.tsx` | 별도 사용자 딥링크로 초기 요청 화면 실행 G12/G13, Android Back은 외부 진입 출발점인 런처 G14. 일반 로그인 링크에서의 내부 왕복은 미완료 |
| `legal/terms.tsx` | 비회원 외부 딥링크 진입 → Android Back 런처. LT01/LT02 PNG 시각 확인 |
| `legal/privacy.tsx` | 회원 계정 설정 왕복 A08/A09; 비회원 외부 딥링크 진입 → Back 런처 LP01/LP02 |
| `legal/support.tsx` | 회원 상태 딥링크 실행 → Android Back Home. Z02/Z03. 비회원 LS01은 실패한 시도라 제외 |
| `legal/account-deletion.tsx` | 회원 상태 공개 요청 화면 딥링크 → Android 홈/복귀 → Back Home. Z04–Z07. 비회원 LD01 시도와 인증 요청/삭제 제출 제외 |

## 소스 확인만 한 추가 점검 대상

- 회원가입 `step=1/2`, 비밀번호 찾기 `code/reset`, 공개 계정 삭제 `verify`는 헤더에서 앞 단계로 돌아가는 코드를 갖고 있지만 Android BackHandler 연결은 없다. 키보드를 닫은 뒤 Android Back이 단계 전환을 건너뛸 가능성이 있다. 인증 메일을 보내지 않아 APK에서 이 중간 단계를 재현한 것으로 집계하지 않는다.
- 가입/재설정/상조회/삭제 완료, 게시글·댓글 등록/수정/삭제 성공 및 API 실패 중 연속 Back, 권한별 관리자 저장 결과는 운영 데이터 변경이 필요하여 이 감사의 실제 실행에서 제외했다. 회원 권한·폼별 모든 조합을 통과했다고 표시하지 않는다.
- 댓글의 초안/키보드/신고는 실행했으며, 대댓글 편집과 댓글 수정·삭제 확인의 모든 조합은 별도 회귀 대상이다.

## 범위 제한

- 물리 Android 기기, iOS, 프로세스 강제 종료 후 초안/내부 화면 상태 복구, 네트워크 단절/타임아웃의 모든 조합은 별도 QA 대상이다.
- 최초 에뮬레이터 부팅 시 System UI ANR가 표시되어 Wait로 회복했다. 해당 초기 캡처는 통과 증거에서 제외한다. 이 현상만으로 앱의 종료/충돌 결함이라고 판단하지 않는다.
- 비회원 초기 화면 확인을 위해 별도 Android 사용자 `NavigationQA0912`(10)를 만들었다. 초기 사용자 부팅 중 Activity 시작 오류, Process system/System UI ANR 및 UIAutomator exit 137이 발생했다. `G01-isolated-login`, `G04-register-focus-recovered`는 앱 통과 증거가 아니라 OS 응답 지연 캡처다. Wait 이후 앱이 보이는 캡처만 구분해서 사용한다. 기존 사용자 0의 앱 프로세스는 이 과정에서 종료했지만 로그인 저장 데이터는 삭제하지 않았다. 비회원 키보드/Android Home의 전체 조합은 검증 완료로 집계하지 않는다.
- 비회원 화면의 파일명은 계획된 동작명과 실제 결과가 다를 수 있다. `G08-password-reset-visual`은 Login에 남아 있었고, G09는 Android 런처, G10은 복귀한 Login, G11은 Back 후 런처였다. 이를 비밀번호 찾기 왕복 통과로 세지 않는다. 실제 비밀번호 찾기 화면은 G13에서 확인했다. 비회원 `LS01`, `LD01`은 대상 화면이 아니라 런처였고 LD03은 검은 화면이므로 해당 경로 통과 증거에서 제외한다.
- 초기 로그인에는 돌아갈 히스토리가 없어도 헤더 뒤로 버튼이 표시되고 누르면 같은 로그인 화면에 남았다(`G01c-login-ready`, `G02-login-header`). 소스도 `canGoBack()`일 때만 동작한다. 루트 로그인에서는 버튼을 숨기거나 동작을 명확히 하는 UI 개선 후보로 기록하며, 앱 종료 결함과 구분한다.

## 종료 및 환경 복원

- 임시 Android 사용자 10을 삭제했고 Owner(0)만 남은 것을 확인했다. 원래 로그인은 `Z01`/`Z10`의 ‘안녕하세요, 원우회님’으로 재확인했다.
- 화면 크기/밀도를 원래 1080×2400 / 420으로, 탐색 모드를 원래 제스처 방식으로 복원했다. 이번 검사에서 시작한 에뮬레이터를 종료했다. 증거: `cleanup.json`, `temporary-android-user.json`.
- 앱 소스 수정, 새 APK 빌드/배포, 커밋/푸시는 하지 않았다. 새 검증 보고서/계획과 gitignore된 증거만 추가했고 기존 작업 파일은 보존했다.


## 대표 캡처

| 항목 | 직전 화면 | 실제 결과 |
|---|---|---|
| NAV-01 | [열기](C:/Users/yug67/develope/personal/AISW_app_renewal/outputs/qa/navigation-audit-2026-09-12/C07-hardware-entry.png) | [결과 캡처](C:/Users/yug67/develope/personal/AISW_app_renewal/outputs/qa/navigation-audit-2026-09-12/C07-hardware-back.png) |
| NAV-02 | [열기](C:/Users/yug67/develope/personal/AISW_app_renewal/outputs/qa/navigation-audit-2026-09-12/S07-search-hide-ime.png) | [결과 캡처](C:/Users/yug67/develope/personal/AISW_app_renewal/outputs/qa/navigation-audit-2026-09-12/S08-search-hardware-back.png) |
| NAV-03 | [열기](C:/Users/yug67/develope/personal/AISW_app_renewal/outputs/qa/navigation-audit-2026-09-12/S18-notice-search.png) | [결과 캡처](C:/Users/yug67/develope/personal/AISW_app_renewal/outputs/qa/navigation-audit-2026-09-12/S19-notice-search-hardware-back.png) |
| NAV-04 | [열기](C:/Users/yug67/develope/personal/AISW_app_renewal/outputs/qa/navigation-audit-2026-09-12/E04-day2.png) | [결과 캡처](C:/Users/yug67/develope/personal/AISW_app_renewal/outputs/qa/navigation-audit-2026-09-12/E05-day2-hardware-back.png) |
| NAV-05 | [열기](C:/Users/yug67/develope/personal/AISW_app_renewal/outputs/qa/navigation-audit-2026-09-12/R03-sort-menu.png) | [결과 캡처](C:/Users/yug67/develope/personal/AISW_app_renewal/outputs/qa/navigation-audit-2026-09-12/R05-sort-back-settled.png) |
| NAV-06 | 오류 상태 | [결과 캡처](C:/Users/yug67/develope/personal/AISW_app_renewal/outputs/qa/navigation-audit-2026-09-12/X07-post-error.png) |
| NAV-07 | [열기](C:/Users/yug67/develope/personal/AISW_app_renewal/outputs/qa/navigation-audit-2026-09-12/NN02-event-settled.png) | [결과 캡처](C:/Users/yug67/develope/personal/AISW_app_renewal/outputs/qa/navigation-audit-2026-09-12/NN04-return-settled.png) |

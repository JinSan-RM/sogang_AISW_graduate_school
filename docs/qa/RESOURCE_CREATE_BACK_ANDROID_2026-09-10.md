# 자료공유 글쓰기 뒤로가기 Android 검증

- 작업 범위: WP5/WP9 P0 게시글 작성 화면 복귀.
- 환경: Pixel 7 Android 16/API 36 에뮬레이터, `emulator-5554`.
- 기존 APK: `kr.ac.sogang.aisw.campus`, `AI-SW-CAMPUS-0.1.0-3-comment-cache-fix-test.apk`.
- 수정 코드 실행: Expo Go `host.exp.exponent`, 로컬 Metro 8083. 새 APK 빌드는 전체 수정 완료 후 진행한다.
- 게시글 등록, 수정 저장, 첨부 업로드 없이 빈 작성 화면과 저장하지 않는 임시 입력만 사용한다.

## 원인과 변경

커뮤니티 > 자료공유 > 시험족보에서 글쓰기를 열면 상단 닫기(X)는 `returnTo`를 사용해 원래 커뮤니티 목록으로 돌아갔다. 하지만 작성 화면에 Android Back 구독이 없어서 시스템 뒤로가기는 부모 탭의 기본 Home 복귀로 처리되었다. 기존 APK와 수정 전 소스를 실행한 Expo Go 모두에서 재현했다.

기존 `postCreateFormBackDecision` 호출을 공통 `handleCreateBack`으로 추출해 상단 닫기와 화면 포커스 중 Android Back에서 함께 사용한다. 복귀는 탭 초기화 이벤트 없이 기존 목록을 다시 활성화한다. 독립 게시판은 기존 스택을 pop하고, 수정 취소는 수정 전 게시글 상세를 우선한다. 등록 완료 화면은 기존 확인 버튼의 완료 경로를 사용한다. 화면을 벗어나면 Android 구독을 해제한다.

자료공유 게시판 선택창은 native Modal이 아닌 인라인 드롭다운이다. 선택창/날짜 선택기가 열려 있으면 먼저 닫고 다음 Back에서 복귀한다. 활동/경조사 선택 시트와 안내 native Modal은 기존 `onRequestClose`를 유지한다.

## Android 실행 결과

캡처 원본과 UI XML은 `outputs/qa/resource-create-back-2026-09-10/`에 보관한다. `dev-*` 캡처는 foreground package가 Expo Go인지 검사한다.

| 순서 | 실행 | 확인 | 캡처 |
| --- | --- | --- | --- |
| 1 | 기존 APK 자료공유 > 시험족보 > 글쓰기 | 작성 화면 진입 | `apk-02-write.png` |
| 2 | 상단 닫기 | 기존에도 자료공유로 복귀 | `apk-03-header-return.png` |
| 3 | 다시 글쓰기 > Android Back | 잘못된 Home 복귀 재현 | `apk-04-hardware-return.png` |
| 4 | 수정 전 소스에서 같은 Android Back | Home 복귀 재현 | `dev-before-write.png`, `dev-before-hardware-home.png` |
| 5 | 수정 소스 자료공유 > 시험족보 > 글쓰기 > Android Back | 자료공유 복귀, 시험족보 선택 유지 | `dev-01-resources.png`, `dev-02-write.png`, `dev-03-hardware-return.png` |
| 6 | 다시 글쓰기 > 상단 닫기 | 한 번에 자료공유 복귀 | `dev-04-header-return.png` |
| 7 | 임시 본문 입력 > Back > Back | 첫 Back은 키보드만 닫고 임시 입력 유지, 다음 Back은 자료공유 복귀 | `dev-05-keyboard-open.png` ~ `dev-07-keyboard-then-return.png` |
| 8 | 게시판 선택창 펼치기 > Back > Back | 첫 Back은 선택창만 닫고 작성 화면 유지, 다음 Back은 자료공유 복귀 | `dev-08-board-sheet.png` ~ `dev-10-sheet-then-return.png` |

## 자동 검증 및 한계

- 실제 화면의 헤더 콜백과 포커스 구독을 실행하는 회귀 테스트: Android 구독 누락으로 6개 실패/1개 통과를 확인한 뒤 수정했다. 인라인 선택창과 달력도 복귀가 너무 일찍 실행되는 테스트 실패를 먼저 확인한 뒤 수정했다.
- `npx tsx --test tests/postCreateBack.test.ts`: 10개 통과. 완료 화면에 보이지 않는 선택기 상태가 남아 있어도 확인/Back 한 번으로 이동하는 경우를 포함한다.
- `npm test`: 574개 통과. `npm run typecheck`: 통과. 변경 파일 ESLint: 오류 0개, 기존 중복 아이콘 import 경고 2개. 읽기 전용 코드 검토에서 확인된 완료 화면 선택기 우선순위 문제도 수정하고 재검토했다.
- 웹/iOS의 Android 구독 제외, 독립 게시판, 수정 취소, 등록 완료, 날짜 선택기 동작은 자동 테스트로 검증한다. 해당 경로 전체의 실기기 검증이나 서버에 실제 게시글 등록은 수행하지 않았다.
- 최종 배포 APK의 동일 시나리오 재검증은 전체 수정 후 APK 생성 단계에서 진행한다.

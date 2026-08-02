# 출시 패키지

기준일: 2026-07-27\
범위: Apple App Store, Google Play, Expo EAS를 이용한 최초 모바일 출시 준비

이 디렉터리는 출시 준비 자료의 단일 진입점이다. 법률 자문, 브랜드 승인, 개발자 계정 상태, 실제 배포 URL처럼 저장소만으로 확정할 수 없는 값은 supporting 문서에서 `DRAFT` 또는 `BLOCKED_EXTERNAL`로 표시한다. 고정 체크리스트는 아래의 제한된 상태 집합만 사용한다.

2026-07-27 current-worktree snapshot은 local engineering 14개를 `PASS`로 확인해 **14/50 = 28%**다. 이는 store-ready 비율이며 기능 구현률이 아니다. Disposable local unsigned Android AAB 리허설의 compile, bundletool/API 36/16 KB alignment, manifest, extracted-artifact secret scan은 통과했지만 해당 임시 파일은 보존 release artifact가 아니며 placeholder/development strings와 무서명 상태 때문에 store candidate도 아니다. Strict release config의 18개 외부 입력, frontend runtime dependency audit의 33 affected entries(critical 0/high 19/moderate 14; dev 포함 전체는 40/high 26/moderate 14), signed build/device/store/live-host 검증이 남아 있다.

## 문서 지도

| 문서 | 용도 |
| --- | --- |
| [RELEASE_GATE_CHECKLIST.md](./RELEASE_GATE_CHECKLIST.md) | 50개 고정 분모 출시 게이트와 현재 상태 |
| [APPLE_SUBMISSION.md](./APPLE_SUBMISSION.md) | App Store Connect 준비·빌드·심사 절차 |
| [GOOGLE_PLAY_SUBMISSION.md](./GOOGLE_PLAY_SUBMISSION.md) | Play Console 준비·빌드·테스트·심사 절차 |
| [PRIVACY_DATA_MATRIX.md](./PRIVACY_DATA_MATRIX.md) | App Privacy 및 Data safety 초안의 공통 근거 |
| [ACCOUNT_DELETION_RETENTION.md](./ACCOUNT_DELETION_RETENTION.md) | 계정 삭제·보존 정책과 현재 구현 차이 |
| [STORE_LISTING_KO.md](./STORE_LISTING_KO.md) | 한국어 스토어 등록정보 초안 |
| [REVIEW_NOTES_TEMPLATE.md](./REVIEW_NOTES_TEMPLATE.md) | Apple/Google 심사 메모 템플릿 |
| [ASSET_REQUIREMENTS.md](./ASSET_REQUIREMENTS.md) | 아이콘·스크린샷·그래픽 규격과 촬영 계획 |
| [EXTERNAL_INPUTS.md](./EXTERNAL_INPUTS.md) | 저장소 밖에서 받아야 할 입력과 담당자 확인란 |
| [DEPENDENCY_REVIEW.md](./DEPENDENCY_REVIEW.md) | 프로덕션 SBOM, 라이선스 정책, 예외 수동 검토와 재현 명령 |
| [OFFICIAL_SOURCES.md](./OFFICIAL_SOURCES.md) | 공식 문서 URL, 확인일, 적용 요약 |

## 상태 정의

- `PASS`: 같은 커밋에서 재현 가능한 증거가 있다.
- `FAIL`: 현재 코드나 설정이 게이트 조건과 충돌한다.
- `NOT_RUN`: 검증 명령 또는 실기기/콘솔 확인이 아직 실행되지 않았다.
- `DRAFT`: 초안은 있으나 책임자의 확정이 필요하다.
- `BLOCKED_EXTERNAL`: 법무·브랜드·개발자 계정·운영 인프라 등 저장소 밖 입력이 필요하다.
- `BLOCKED_ENVIRONMENT`: 현재 작업 환경에 필요한 실기기, OS, 빌드 환경 또는 실행 가능한 artifact가 없다.
- `N/A`: 조건이 적용되지 않음이 계정·정책·artifact 증거로 확인됐다. 고정 분모에서는 0점이다.

`RELEASE_GATE_CHECKLIST.md`는 `PASS`, `FAIL`, `BLOCKED_EXTERNAL`, `BLOCKED_ENVIRONMENT`, `NOT_RUN`, `N/A`만 사용하며 `DRAFT`를 사용하지 않는다. 완료율은 항상 `PASS 개수 / 50 × 100`이다. `PASS`가 아닌 모든 상태는 0점이다. 어떤 문서에도 비밀번호, API 키, 인증서, 서비스 계정 JSON, 복구 코드 같은 비밀값을 기록하지 않는다.

## 사용 순서

1. `EXTERNAL_INPUTS.md`의 외부 입력을 확보한다.
2. 구현된 계정 hard-delete 동작과 공개 콘텐츠 익명화를 `ACCOUNT_DELETION_RETENTION.md`에서 확인하고, 외부 processor/backup/법적 고지를 `PRIVACY_DATA_MATRIX.md`와 맞춘다.
3. 플랫폼 문서에 따라 메타데이터와 에셋을 준비한다.
4. 릴리스 후보 커밋을 고정한 뒤 `RELEASE_GATE_CHECKLIST.md`의 50개 항목을 다시 판정한다.
5. 50/50을 달성해도 실제 업로드·심사 제출·프로덕션 공개는 사용자 또는 릴리스 책임자의 명시적 승인 후에만 수행한다.

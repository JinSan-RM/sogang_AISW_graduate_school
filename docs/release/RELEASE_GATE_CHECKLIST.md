# 출시 게이트 체크리스트

기준일: 2026-07-27\
고정 분모: **50개**

이 체크리스트는 기능 개발률이 아니라 실제 스토어 출시 준비도를 측정한다. 로컬 release engineering이 통과해도 signed mobile artifact, physical device, live host, developer account, 법무·브랜드 승인이 없으면 store-ready가 아니다. ID와 분모는 고정하며 항목을 삭제하거나 분모에서 제외하지 않는다.

## 판정 규칙

- 완료율(%): `PASS 항목 수 / 50 * 100`
- 허용 상태는 `PASS`, `FAIL`, `BLOCKED_EXTERNAL`, `BLOCKED_ENVIRONMENT`, `NOT_RUN`, `N/A`뿐이다. 이 표에서는 `DRAFT`를 사용하지 않는다.
- `PASS` 이외의 모든 상태는 0점이다. `N/A`도 분모를 줄이지 않는다.
- `PASS`에는 2026-07-27 current-worktree 실행 결과, 명령 로그, config/artifact, 또는 테스트처럼 재현 가능한 증거가 필요하다.
- `BLOCKED_EXTERNAL`은 법무·브랜드·계정·credential·public URL·production 값처럼 저장소 밖 입력이 먼저 필요한 상태다.
- `BLOCKED_ENVIRONMENT`는 current workspace에 physical device, OS, release artifact 또는 실행 환경이 없어 검증할 수 없는 상태다.
- 코드·설정이 바뀌면 영향받는 local `PASS`는 재검증 전 `NOT_RUN`으로 되돌린다.
- 50/50은 “제출 승인 요청 가능”을 뜻한다. 업로드, 심사 제출, production 공개는 별도 명시적 승인이 필요하다.

## 2026-07-27 스냅샷

- 현재 점수: **14/50 = 28%**
- 상태 합계: `PASS 14`, `FAIL 1`, `BLOCKED_EXTERNAL 29`, `BLOCKED_ENVIRONMENT 4`, `NOT_RUN 2`, `N/A 0`
- local release-engineering evidence:
  - backend 104/104 SQLite 및 104/104 isolated PostgreSQL;
  - frontend 7/7 tests, typecheck, lint 0 errors/0 warnings, Expo Doctor 17/17, web export; clean `npm ci --legacy-peer-deps` revalidation re-passed tests/typecheck/lint after the lockfile update;
  - clean migration, `0019`→head, `0021`→`0019`→`0021`, exact unversioned `0001` recovery, unknown schema fail-closed;
  - PostgreSQL dump/restore 30 tables with identical all-table counts and column/index/constraint fingerprints;
  - media tar/restore with identical path/size/SHA-256 inventory;
  - QA/production Compose build, database/backend/worker health, UID 10001, readiness, guest/user/admin HTTP, one-shot worker, web `/healthz` and deep-link fallback;
  - production non-authoritative seed creates no demo user and preserves operator-managed reference data; one-time initial-admin bootstrap is concurrency-safe and audited;
  - provider-neutral operational-alert adapter passes non-PII payload and webhook-secret-safe failure tests;
  - checksum-verified Gitleaks 8.30.1 found zero findings across 43 commits, 298 current non-ignored files, and the extracted local unsigned AAB; CI scans full history;
  - validated CycloneDX 1.6 SBOMs cover the backend production image and frontend production tree; forbidden, strong-copyleft-only, and unknown licenses are zero;
  - an isolated same-source Windows short-path `:app:bundleRelease` produced a 74,847,032-byte unsigned AAB (SHA-256 `5c2acf192fad9d02449cdc9acef059fb98d67655ea684aecc455f0378ee474e0`); bundletool 1.18.3 validation, API 36, 16 KB page alignment, release-manifest security, and extracted-artifact scan passed;
  - CI `permissions: contents: read`; pinned `pip-audit==2.10.1`;
  - backend dependency audit: zero known vulnerabilities.
- store boundary:
  - strict release config static check passes its internal rules but reports **18 approved external-input blockers**;
  - EAS production environment values and remote versions are absent;
  - a disposable local unsigned non-candidate AAB was produced and inspected, but it is not a retained release artifact; signed production AAB and iOS archive do not exist and remote build/credential actions were not executed;
  - no physical-device, store-console, or live-public-host verification has run.
  - operational alert provider, webhook secret, on-call routing, and live delivery test are not configured.
- unresolved risk: after the safe `postcss` 8.5.18 update, frontend runtime audit (`npm audit --omit=dev`) reports 33 affected entries: critical 0/high 19/moderate 14; the all-dependency audit reports 40: critical 0/high 26/moderate 14. Remaining remediation requires incompatible major overrides or a breaking Expo 57/React Native 0.86 upgrade, so owner risk acceptance with deadline or upgrade approval is required.

## 50개 고정 게이트

| ID | 게이트 | 완료 기준 | 현재 상태 | 2026-07-27 증거/조치 |
| --- | --- | --- | --- | --- |
| REL-01 | 공식 요구사항 기준일 고정 | Apple/Google/Expo 공식 URL과 확인일이 기록됨 | `PASS` | `OFFICIAL_SOURCES.md`, 확인일 2026-07-27 |
| REL-02 | 릴리스 대상 커밋 고정 | clean worktree의 commit SHA와 release branch/tag 기록 | `NOT_RUN` | current worktree에 미커밋 변경이 있어 immutable release SHA가 아님 |
| REL-03 | 사용자 버전·빌드 버전 확정 | `version`, iOS build, Android versionCode가 store history와 충돌하지 않음 | `BLOCKED_EXTERNAL` | local `0.1.0`/iOS `1`/Android `1`은 정합; EAS remote versions와 승인 release version 미확정 |
| REL-04 | 영구 앱 식별자 확정 | 승인 Bundle ID/package가 코드·EAS·store record에 일치 | `BLOCKED_EXTERNAL` | 두 플랫폼 모두 `com.anonymous.sogangcommunity`; strict blocker |
| REL-05 | 브랜드·법적 주체 승인 | 앱명, 개발자명, 학교/원우회 명칭·logo 권리 승인 | `BLOCKED_EXTERNAL` | `EXT-01`, `EXT-02`, `EXT-19` |
| REL-06 | backend 전체 테스트 | current release source에서 전체 test 통과 | `PASS` | SQLite 104/104 및 isolated PostgreSQL 104/104 |
| REL-07 | frontend typecheck | current release source에서 `npm run typecheck` 통과 | `PASS` | typecheck pass |
| REL-08 | frontend 테스트 | current release source에서 `npm test` 통과 | `PASS` | 7/7 pass |
| REL-09 | backend import/compile | current source에서 compile/import smoke 통과 | `PASS` | test collection/import, production image build, startup/readiness pass; production reference seed and one-time admin bootstrap regression pass |
| REL-10 | PostgreSQL 런타임 smoke | 격리 DB에서 migrate→seed→API/worker health 통과 | `PASS` | isolated PostgreSQL 104 tests, QA/production Compose health, API/worker/monitoring smoke pass; one-shot worker reported reminders/receipts/rate-limit/deletion-receipt removals all 0 |
| REL-11 | 마이그레이션 무결성 | fresh, recognized legacy, downgrade/re-upgrade, fail-closed paths 검증 | `PASS` | clean, `0019`→`0021`, `0021`→`0019`→`0021`, unversioned `0001`, unknown fail-closed pass |
| REL-12 | high/critical 취약점 처분 | critical/high 0 또는 항목별 reachability·완화·기한·위험승인 | `FAIL` | backend 0; frontend runtime 33 affected (critical 0/high 19/moderate 14), all dependencies 40 (critical 0/high 26/moderate 14) after safe `postcss` fix; incompatible major remediation 또는 owner acceptance 미결 |
| REL-13 | 비밀정보 검사 | Git history와 산출물에서 실제 secret 0, 예제값만 허용 | `NOT_RUN` | checksum-verified Gitleaks 8.30.1: 43-commit history, 현재 non-ignored 298 files, 추출한 local unsigned AAB finding 0; CI full-history scan 추가. 최종 signed artifact scan 미실행으로 보수적 미완료 |
| REL-14 | 종속성·라이선스 목록 | production dependency/SBOM과 금지 license 검토 증거 | `PASS` | `DEPENDENCY_REVIEW.md`: backend image 37 components/36 app deps, frontend production 809 instances/749 unique PURLs, CycloneDX 1.6 validation; forbidden/strong-copyleft-only/unknown 0, 예외 수동 검토 완료 |
| REL-15 | 프로덕션 auth secret | 비기본 32자 이상 secret이 배포 secret store에 있고 startup guard 통과 | `BLOCKED_EXTERNAL` | code/Compose guard는 검증; 실제 production secret 없음 |
| REL-16 | HTTPS API | production API가 유효 인증서 HTTPS만 제공하고 HTTP redirect/차단 확인 | `BLOCKED_EXTERNAL` | public domain/DNS/TLS 미정 |
| REL-17 | Android 평문 트래픽 차단 | final merged release manifest에서 cleartext false, 불필요 network 예외 없음 | `PASS` | `:app:processReleaseMainManifest`, `release:verify-android-manifest`, local unsigned AAB manifest 검증 통과; target API 36, `usesCleartextTraffic=false`, 불필요 network 예외 없음 |
| REL-18 | Android 백업·권한 최소화 | final merged manifest에서 backup false, 불필요 storage/overlay/camera 권한 없음 | `PASS` | actual release merged manifest와 local unsigned AAB 검증 통과; `allowBackup=false`, storage/overlay/camera 금지 권한 없음 |
| REL-19 | iOS 테스트 네트워크 예외 제거 | final archive Info.plist에 local-network/ATS test 예외 없음 | `BLOCKED_EXTERNAL` | app config static check 통과; approved Bundle ID/credentials와 final archive 없음 |
| REL-20 | CORS·proxy 설정 | 실제 domain만 허용하고 proxy trust boundary·rate-limit IP 처리 검증 | `BLOCKED_EXTERNAL` | production guard/local topology pass; 실제 origin/proxy 미정 |
| REL-21 | 프로덕션 이메일 | 실제 발신 domain으로 가입/재설정/삭제 code 성공, 실패 alert와 SPF/DKIM 확인 | `BLOCKED_EXTERNAL` | SMTP provider/sender/DNS 미정 |
| REL-22 | DB·미디어·백업 운영 | 암호화·접근통제·지속성·복구·삭제 전파가 production에서 검증됨 | `BLOCKED_EXTERNAL` | local pg_dump/media restore pass; production storage/encryption/lifecycle 미정 |
| REL-23 | 포괄적 개인정보 처리방침 | 실제 data·목적·processor·보존·삭제·문의가 앱/웹에 일치 | `BLOCKED_EXTERNAL` | local copy는 구현과 일치; operator, processors, retention, 법무 승인 미정 |
| REL-24 | 공개 개인정보 URL | HTTPS, 비로그인, 비지역제한, 비PDF, 앱/개발자명 일치 | `BLOCKED_EXTERNAL` | public URL 미정; strict blocker |
| REL-25 | 인앱 개인정보 접근 | 로그인 전후 쉽게 접근하고 link/text가 정상 render | `PASS` | guest legal route와 authenticated link 구현; production web export/deep-link pass |
| REL-26 | Apple App Privacy 확정 | final binary/SDK 기준 수집·연결·추적·목적 승인 및 console 입력 | `BLOCKED_EXTERNAL` | matrix 작성, final archive·privacy owner 승인·console 입력 없음 |
| REL-27 | Google Data safety 확정 | 수집·공유·필수성·목적·암호화·삭제 승인 및 console 입력 | `BLOCKED_EXTERNAL` | matrix 작성, final AAB·privacy owner 승인·console 입력 없음 |
| REL-28 | 제3자 데이터 처리 검증 | Expo Push, SMTP, hosting/DB/backups 계약·지역·삭제 절차 확인 | `BLOCKED_EXTERNAL` | actual provider와 계약 미정 |
| REL-29 | 인앱 계정 삭제 시작 | 설정에서 찾기 쉽고 server 재인증·확인 뒤 irreversible 삭제 | `PASS` | `DELETE /api/users/me` current-password 검증, UI acknowledgement, rate limit, 104-test suites pass |
| REL-30 | 연관 데이터 실제 삭제 | account/private data 삭제, retained public content 익명화, non-identifying receipt 검증 | `PASS` | hard delete, file staging/rollback, public author unlink, private content/media delete, migration `0021` tests pass |
| REL-31 | Google 외부 삭제 웹 리소스 | 앱 밖 공개 HTTPS 삭제 page와 Play URL 입력 | `BLOCKED_EXTERNAL` | local web route/API/deep-link pass; public hosting URL/SMTP/live drill 없음 |
| REL-32 | 보존·백업 만료 승인 | 항목별 기간·근거·파기·backup 만료가 privacy/legal 승인됨 | `BLOCKED_EXTERNAL` | code는 fixed legal period를 주장하지 않음; receipt days와 backup lifecycle 승인 필요 |
| REL-33 | P0 모바일 route audit | guest/user/admin 모든 P0 route가 actual release mobile build에서 도달 | `BLOCKED_ENVIRONMENT` | source route와 web deep-link는 검증; signed installable release mobile artifact와 physical device 없음 |
| REL-34 | API 권한 회귀 | guest/user/admin 경계가 API test로 통과하고 UI hiding에 의존하지 않음 | `PASS` | isolated PostgreSQL 104-test permission matrix와 HTTP guest/auth/admin smoke pass |
| REL-35 | iOS 실기기 smoke | 설치·가입·로그인·알림·이미지·삭제·deep link·회귀 통과 | `BLOCKED_ENVIRONMENT` | iOS release build와 physical device 없음 |
| REL-36 | Android 실기기 smoke | 설치·가입·로그인·알림·이미지·삭제·back navigation·회귀 통과 | `BLOCKED_ENVIRONMENT` | local unsigned AAB compile/audit만 통과; signed installable production artifact와 physical device 없음 |
| REL-37 | 접근성·권한 거부 | VoiceOver/TalkBack, 글자 확대, 사진/알림 거부·재시도 통과 | `BLOCKED_ENVIRONMENT` | physical mobile artifact/device accessibility QA 없음 |
| REL-38 | release 환경 격리 | binary에 localhost/test URL·dev menu·debuggable·sample credential/data 없음 | `BLOCKED_EXTERNAL` | production startup/demo-data guard와 Compose/web pass. Local unsigned AAB는 non-debuggable manifest지만 JS/config에 localhost 2건, development-client/dev-launcher 1건, placeholder package 2건이 있어 official production env/ID와 final signed binary 필요 |
| REL-39 | Apple 계정 준비 | membership·계약·role·세금/은행/compliance가 제출 가능 | `BLOCKED_EXTERNAL` | App Store Connect evidence 없음 |
| REL-40 | App Store 앱 record | 승인 Bundle ID, SKU, Apple ID, language, region 생성·기록 | `BLOCKED_EXTERNAL` | app record 미확인 |
| REL-41 | Xcode 26/iOS 26 IPA | EAS log와 App Store 처리 결과가 Xcode 26+/SDK 26+, 오류 0 | `BLOCKED_EXTERNAL` | compatible EAS image는 확인; production env/credential/archive 없음, remote action 미실행 |
| REL-42 | Apple asset | 승인 icon과 device-family별 1~10개 정확한 screenshot upload | `BLOCKED_EXTERNAL` | approved asset 원본 없음; strict blockers |
| REL-43 | Apple meta·policy field | 설명·keyword·support URL·age·rights·category·DSA·privacy 완료 | `BLOCKED_EXTERNAL` | copy 초안만 존재; brand/legal/URL/console 승인 없음 |
| REL-44 | Apple 심사 가능성 | live backend, valid demo, contact, review notes, export compliance, release mode 완료 | `BLOCKED_EXTERNAL` | live host/account/contact/demo 미정 |
| REL-45 | Play 개발자 계정 준비 | account type·identity·contact·device verification·payment profile 정상 | `BLOCKED_EXTERNAL` | Play Console evidence 없음 |
| REL-46 | Android 개발자/package 등록 | identity 및 package 등록 상태 확인, 2026-09-30 요건 대응 | `BLOCKED_EXTERNAL` | account/package approval 미정 |
| REL-47 | API 36 signed AAB | final AAB가 target API 36, unique versionCode, upload key, Play App Signing 통과 | `BLOCKED_EXTERNAL` | local unsigned AAB는 bundletool/API 36/16 KB alignment 통과했지만 placeholder package, versionCode 1, upload signing/Play App Signing 없음; EAS production env와 console result 필요 |
| REL-48 | Google listing·App content | text/asset/category/ads/audience/IARC/News 등 모든 선언 완료 | `BLOCKED_EXTERNAL` | console/approved asset/legal 답변 없음 |
| REL-49 | Google 테스트 자격 | 적용 시 12명/14일 closed test와 production access, 아니면 account evidence | `BLOCKED_EXTERNAL` | account type/creation date 미확인 |
| REL-50 | Google 심사·release 준비 | sign-in instruction, Data safety, deletion URL, notes, rollout 완료 | `BLOCKED_EXTERNAL` | reviewer access/public URL/console/rollout 승인 없음 |

## 하드 스톱

다음 중 하나라도 해당하면 점수와 무관하게 제출하지 않는다.

- `REL-12`가 `PASS`가 아니며 frontend high-risk dependency에 owner decision이 없다.
- strict release config의 18개 approved external-input blocker가 남아 있다.
- 개인정보 처리방침과 App Privacy/Data safety가 final binary 및 production processor와 일치하지 않는다.
- production API/DB/SMTP/media/public legal pages가 live가 아니거나 reviewer가 접근할 수 없다.
- production operational-alert provider와 on-call routing의 live delivery/recovery가 검증되지 않았다.
- signed artifact의 ID, signature, version, API level/Xcode SDK를 증명할 수 없다.
- physical-device auth, notification, media, deletion, deep-link smoke가 없다.
- release 책임자의 target commit, build IDs, release mode에 대한 명시적 승인이 없다.

## 제출 승인 기록

다음 값은 50/50 달성 후 작성한다.

- Git commit SHA: `[BLOCKED_EXTERNAL]`
- iOS EAS build ID / App Store build string: `[BLOCKED_EXTERNAL]`
- Android EAS build ID / versionCode: `[BLOCKED_EXTERNAL]`
- Apple release mode: `[BLOCKED_EXTERNAL: manual / automatic / phased release 승인]`
- Google track 및 rollout 비율: `[BLOCKED_EXTERNAL]`
- 개인정보/법무 승인자와 시각: `[BLOCKED_EXTERNAL]`
- dependency risk 승인 또는 upgrade evidence: `[BLOCKED_EXTERNAL]`
- release 승인자와 시각: `[BLOCKED_EXTERNAL]`

## 공식 근거

확인일: 2026-07-27

- [Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Console Requirements](https://support.google.com/googleplay/android-developer/answer/10788890?hl=en)
- [Google Target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Expo Build server infrastructure](https://docs.expo.dev/build-reference/infrastructure/)

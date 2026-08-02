# Google Play 제출 가이드

기준일: 2026-07-27\
상태: `DRAFT` — 실제 Play Console 값과 법무·브랜드 승인이 필요

## 날짜가 중요한 요건

- **2026-07-27 현재** 모바일 신규 앱과 업데이트는 Android 15, API 35 이상을 target해야 한다.
- **2026-08-31부터** 모바일 신규 앱과 업데이트는 Android 16, API 36 이상을 target해야 한다.
- **2026-09-30부터** 모든 Play package가 확인된 개발자에게 등록되어야 한다. Play Console의 Android developer verification 화면에서 package 등록 상태를 확인한다.
- 2023-11-13 이후 생성된 개인 개발자 계정이면 production access 신청 전에 최소 12명의 tester가 14일 연속 opt-in한 closed test가 필요하다.

이 프로젝트의 Expo SDK 54는 Android compile/target API 36을 사용하므로 2026-08-31 요건을 충족할 수 있다. 단, 실제 제출 판단은 source package 버전이 아니라 **서명된 최종 AAB를 Play Console이 판독한 target API**로 한다.

## 저장소 현황

| 항목 | 현재 값/관찰 | 판정 |
| --- | --- | --- |
| Expo SDK | `~54.0.36` | local unsigned AAB에서 API 36 및 bundletool 검증 통과; final signed AAB/Play 판독은 `BLOCKED_EXTERNAL` |
| package/applicationId | `com.anonymous.sogangcommunity` | `BLOCKED_EXTERNAL` — 영구 ID 승인 필요 |
| versionName/versionCode | app config/native Android `0.1.0` / `1`; EAS remote/autoIncrement 설정 | local 정합성 통과, remote version과 store history `BLOCKED_EXTERNAL` |
| 프로덕션 형식 | EAS production은 기본 AAB | local unsigned `bundleRelease` 통과; EAS signed production build는 `BLOCKED_EXTERNAL` |
| cleartext | main manifest `usesCleartextTraffic=false` | actual release merged manifest와 local unsigned AAB 검증 통과 |
| storage/overlay 권한 | CAMERA, READ/WRITE storage, SYSTEM_ALERT_WINDOW를 `tools:node="remove"` 및 app config blockedPermissions로 차단 | actual release merged manifest에서 금지 권한 없음 |
| backup | main manifest `allowBackup=false` | actual release merged manifest와 local unsigned AAB 검증 통과 |
| 앱 이름 | app config와 UI 명칭 불일치 | `BLOCKED_EXTERNAL` |
| 계정 삭제 | current-password hard delete 및 public email request/verify 구현 | local API/DB `PASS`; live public URL `BLOCKED_EXTERNAL` |
| 외부 삭제 URL | 미배포 | `BLOCKED_EXTERNAL` |
| Data safety | matrix 초안만 존재 | `DRAFT` |
| Play Console 계정/앱 | 확인 불가 | `BLOCKED_EXTERNAL` |

## 2026-07-27 local unsigned AAB 리허설

이 리허설은 native release compile과 정적 산출물 검증 증거이며 Play 제출 후보가 아니다.

- Windows의 긴 저장소 경로에서 CMake/Ninja 260자 제한이 발생했다. 같은 115개 frontend source file을 확인한 임시 격리 경로 `C:\aisw27\f`와 짧은 `ANDROID_CXX_BUILD_STAGING_DIR`를 사용한 전체 `:app:bundleRelease`는 721 tasks, 16분 47초에 성공했다. 이 경로는 검증 후 제거하는 일회성 작업 공간이며 release source나 보존 artifact가 아니다.
- 검증 당시 임시 산출물 경로는 `C:\aisw27\f\android\app\build\outputs\bundle\release\app-release.aab`였고, 크기는 74,847,032 bytes, SHA-256은 `5c2acf192fad9d02449cdc9acef059fb98d67655ea684aecc455f0378ee474e0`이었다. 파일 경로의 지속성을 기대하지 않으며 hash/size와 검사 결과만 historical evidence로 유지한다.
- 공식 bundletool 1.18.3 jar(SHA-256 `a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29`)의 `validate`가 통과했다. Config dump는 uncompressed native libraries와 `PAGE_ALIGNMENT_16K`를 확인했다.
- manifest는 package `com.anonymous.sogangcommunity`, versionCode `1`, versionName `0.1.0`, min API 24, target API 36, `allowBackup=false`, `usesCleartextTraffic=false`였다. camera/storage/overlay 금지 권한, debuggable attribute, dev-launcher/dev-menu manifest entry는 없었다.
- `jarsigner`는 unsigned로 판독했다. 추출한 1,461 files/219,116,528 bytes의 Gitleaks 8.30.1 검사는 finding 0이었지만, JS/config에는 localhost 2건, Expo development-client/dev-launcher 문자열 1건, placeholder package 2건이 남았다.
- 따라서 이 AAB는 REL-17/18의 로컬 manifest 증거만 보강한다. 승인 package, production EAS env, signing, unique remote version, Play App Signing, console 판독이 없으므로 REL-38/47과 제출 상태는 닫히지 않는다.

## 1. 개발자 계정과 package

Play Console에서 다음을 확인한다.

| 필드 | 값 |
| --- | --- |
| 계정 유형 | `[BLOCKED_EXTERNAL: Personal / Organization]` |
| 계정 생성일 | `[BLOCKED_EXTERNAL]` |
| 법적 주체 | `[BLOCKED_EXTERNAL]` |
| developer email/phone 검증 | `[BLOCKED_EXTERNAL]` |
| 조직 D-U-N-S/웹사이트 | `[BLOCKED_EXTERNAL 또는 계정 유형상 비적용 증거]` |
| 새 개인 계정 실제 Android 기기 검증 | `[BLOCKED_EXTERNAL 또는 비적용 증거]` |
| 앱 package | `[BLOCKED_EXTERNAL]` |
| Play App Signing | `[BLOCKED_EXTERNAL]` |
| Android developer verification | `[BLOCKED_EXTERNAL]` |
| package 등록 상태 | `[BLOCKED_EXTERNAL]` |

현재 `com.anonymous.sogangcommunity`를 프로덕션에 올리지 않는다. package는 첫 공개 뒤 바꾸기 어렵고 새 앱으로 취급될 수 있으므로 브랜드/도메인 소유권과 운영 주체가 승인한 값을 사용한다.

## 2. 앱 레코드와 스토어 등록정보

Play Console에서 앱을 만들 때:

- 기본 언어: `[DRAFT: Korean]`
- 앱 또는 게임: `DRAFT: App`
- 무료/유료: `[DRAFT: Free]`
- 사용자 연락 이메일: `[BLOCKED_EXTERNAL]`
- 정책 및 미국 수출법 선언, Play App Signing 약관을 계정 소유자가 검토한다.

`STORE_LISTING_KO.md`의 초안을 사용하되 다음 제한을 지킨다.

- 앱 이름: 30자
- 짧은 설명: 80자
- 전체 설명: 4,000자
- 512×512 Play icon
- 1024×500 feature graphic
- 최소 2개 스크린샷; 이 프로젝트는 1080×1920 portrait 6장을 목표로 한다.

카테고리, tags, 지원 이메일/전화/웹사이트, 대상 국가를 확정한다. “공식” 등 권리 승인 없는 표현과 순위·가격·과도한 키워드를 사용하지 않는다.

## 3. User Data, Data safety, 계정 삭제

필수 작업:

1. 공개 HTTPS 개인정보 처리방침을 Play Console과 앱 내부에 제공한다.
2. `PRIVACY_DATA_MATRIX.md`를 최종 AAB와 production 인프라 기준으로 승인한다.
3. Data safety에서 모든 수집·공유, required/optional, 목적, 전송 암호화, 삭제 요청을 입력한다.
4. SDK와 처리자도 포함한다. 특히 Expo push token과 알림 payload는 Expo Push Service를 거쳐 FCM/APNs로 전달된다.
5. 앱 내부 삭제 경로와 앱 밖의 공개 웹 삭제 리소스를 모두 제공한다.

외부 삭제 리소스의 조건:

- 공개 HTTPS URL이며 앱 설치/로그인 없이 페이지 자체를 열 수 있다.
- 스토어에 표시되는 앱 또는 개발자명을 명확히 쓴다.
- 삭제 요청 경로가 눈에 띄고 실제 작동한다.
- 삭제되는 데이터와 법적 사유로 보존되는 데이터 및 기간을 설명한다.
- 사용자를 다시 앱 설치 화면으로만 돌려보내지 않는다.

현재 `/legal/account-deletion` web route와 request/verify API는 구현됐고 local production-web deep-link 검증을 통과했다. 삭제 service는 account PII와 private data를 hard-delete하고 active public published content만 author 연결 없이 유지한다. SQLite/PostgreSQL 104-test suite가 authenticated/public flow, non-enumeration, rollback, FK, receipt를 검증한다.

다만 공개 production HTTPS URL, SMTP, 운영 processor/backup lifecycle, Play Console 입력은 아직 없다. 따라서 Google의 외부 삭제 리소스와 Data safety account-deletion 항목은 live 검증 전 완료로 표시하지 않는다.

## 4. App content

Play Console의 App content에서 최종 상태를 기록한다.

| 선언 | 초안 |
| --- | --- |
| Privacy policy | `[BLOCKED_EXTERNAL: URL]` |
| Ads | `DRAFT: 코드에서 광고 SDK 미관찰. 최종 AAB SDK 감사 후 No 확정` |
| App access / Sign-in details | `[BLOCKED_EXTERNAL: REVIEW_NOTES_TEMPLATE.md 기반]` |
| Target audience | `[DRAFT: 대학원 커뮤니티 성격상 성인 대상 제안, 제품/법무 확정 필요]` |
| Content rating | `[BLOCKED_EXTERNAL: UGC·신고/차단을 반영한 IARC 설문]` |
| Data safety | `[DRAFT: PRIVACY_DATA_MATRIX.md]` |
| Data deletion URL | `[BLOCKED_EXTERNAL]` |
| News app | `DRAFT: No — 공지 기능이 있어도 정책상 News 앱인지 콘솔 설명을 보고 확정` |
| Government app | `DRAFT: No — 학교/원우회 법적 주체 확인 후 확정` |
| Financial/health/VPN | `DRAFT: No — 최종 기능 감사 후 확정` |
| Sensitive permissions | `DRAFT — release merged manifest와 Play pre-launch report 확인` |

로그인 뒤 콘텐츠가 있으므로 Play reviewer용 sign-in instructions가 필수다. 계정은 만료되지 않아야 하며 학교 이메일 OTP, 운영자 수동 승인, 지역 제한 없이 리뷰가 가능해야 한다.

## 5. EAS 프로덕션 설정

목표 app config:

```json
{
  "expo": {
    "version": "[BLOCKED_EXTERNAL]",
    "android": {
      "package": "[BLOCKED_EXTERNAL]"
    }
  }
}
```

권장 버전 관리:

```json
{
  "cli": {
    "appVersionSource": "remote"
  },
  "build": {
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "android": {
        "track": "internal",
        "releaseStatus": "draft",
        "changesNotSentForReview": true
      }
    }
  }
}
```

`draft`와 `changesNotSentForReview`는 준비 중 자동 심사 제출을 막기 위한 안전 기본값 예시다. 실제 submit profile 변경은 릴리스 책임자가 대상 track과 공개 방식을 승인한 뒤 한다.

release merged manifest 확인:

- target API 36
- 승인 package와 고유 versionCode
- `debuggable=false`
- `usesCleartextTraffic=false`
- 불필요한 READ/WRITE_EXTERNAL_STORAGE, SYSTEM_ALERT_WINDOW 제거
- 알림/사진 등 실제 기능에 필요한 권한만 존재
- deep link scheme/host가 승인된 값
- production API URL이 HTTPS이며 localhost/LAN fallback 없음

## 6. AAB 빌드와 내부 테스트

아래는 절차 예시이며 실제 업로드는 명시적 승인 후 수행한다.

```powershell
Set-Location frontend
npx eas-cli@latest build --platform android --profile production
```

증거로 남길 값:

- Git commit SHA
- EAS build ID
- package, versionName, versionCode
- target/compile API
- upload certificate SHA-256 fingerprint
- AAB checksum
- dependency/permission 목록

Play App Signing을 구성하고 upload key로 서명된 `.aab`를 사용한다. 키 파일과 서비스 계정 JSON은 Git에 저장하지 않는다.

최초 release는 internal testing에서 시작한다. 2026-07-27 현재 Expo 공식 문서에 따르면 Play Console에 앱 레코드를 만들고 EAS에 최소 권한 Google 서비스 계정 키를 안전하게 등록하면 `eas submit`이 첫 internal testing release도 직접 만들 수 있다. Play Console에서 수동으로 첫 AAB를 올리는 방법도 선택할 수 있다. 서비스 계정 JSON은 Git이나 이 문서에 저장하지 않는다.

EAS Submit을 사용하는 예시는 다음과 같다.

```powershell
Set-Location frontend
npx eas-cli@latest submit --platform android --profile production
```

EAS Submit은 AAB 업로드를 자동화할 수 있지만 store listing/App content/production review를 대신 완료하지 않는다. 업로드 후:

1. Play Console이 package, versionCode, target API, signing을 정상 인식하는지 확인한다.
2. Pre-launch report, Android vitals, policy warning을 검토한다.
3. internal tester로 가입·로그인·게시·알림·미디어·계정 삭제를 실기기 검증한다.
4. 개인 계정 테스트 규칙이 적용되면 closed test로 전환하고 12명/14일 연속 opt-in 증거와 피드백을 남긴다.
5. production access가 승인된 뒤에만 production release를 만든다.

## 7. 제출과 공개

production 제출 직전:

- 개인정보 처리방침, Data safety, 계정 삭제 URL이 실제 동작과 일치한다.
- App content의 모든 항목이 `Actioned`이고 미해결 정책 경고가 없다.
- reviewer access와 데모 데이터가 유효하다.
- release notes가 실제 변경만 설명한다.
- package 등록과 개발자 신원 상태를 확인한다.
- staged rollout 비율과 중단 기준을 승인받는다.

권장 초기 공개안은 `DRAFT: managed publishing + staged rollout`이다. 실제 비율, 국가, 날짜는 외부 승인 없이 정하지 않는다.

## 증거 기록

| 항목 | 값 |
| --- | --- |
| Release SHA | `[NOT_RUN: current worktree is not pinned]` |
| EAS Android build ID | `[BLOCKED_EXTERNAL]` |
| Historical local unsigned AAB rehearsal | versionCode `1`; SHA-256 `5c2acf192fad9d02449cdc9acef059fb98d67655ea684aecc455f0378ee474e0`; disposable compile/audit evidence only |
| Signed production AAB versionCode / checksum | `[BLOCKED_EXTERNAL]` |
| Play internal test 결과 | `[NOT_RUN]` |
| Closed-test 적용/증거 | `[BLOCKED_EXTERNAL]` |
| Data safety 승인자/시각 | `[BLOCKED_EXTERNAL]` |
| Production 제출 승인자/시각 | `[BLOCKED_EXTERNAL]` |

## 공식 근거

확인일: 2026-07-27

- [Google Target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Google User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
- [Google Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Google account deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [Google testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Google package registration](https://support.google.com/googleplay/android-developer/answer/16984799?hl=en)
- [Expo SDK 54 reference](https://docs.expo.dev/versions/v54.0.0/)
- [Expo Android EAS Submit](https://docs.expo.dev/submit/android/)
- [Expo Android manual submission](https://docs.expo.dev/submit/android-manual/)

# Apple App Store 제출 가이드

기준일: 2026-07-27\
상태: `DRAFT` — 실제 App Store Connect 값과 법무·브랜드 승인이 필요

## 현재 적용되는 핵심 요건

- 2026-04-28부터 App Store Connect 업로드는 **Xcode 26 이상**과 **iOS/iPadOS 26 SDK 이상**으로 빌드해야 한다.
- 계정을 생성할 수 있는 앱은 앱 안에서 전체 계정 삭제를 시작할 수 있어야 한다. 임시 비활성화만 제공하는 것은 불충분하다.
- 개인정보 처리방침 URL, App Privacy 답변, 지원 URL, 정확한 메타데이터, 연령 등급이 필요하다.
- 로그인 뒤에 있는 기능은 심사팀이 사용할 수 있는 유효한 데모 계정 또는 완전한 데모 모드가 필요하다.
- 백엔드와 외부 서비스는 심사 기간 동안 live 상태여야 하며, 비표준 절차는 Review Notes에 구체적으로 쓴다.

## 저장소 현황

| 항목 | 현재 값/관찰 | 판정 |
| --- | --- | --- |
| Expo SDK | `~54.0.36` | SDK 54 EAS 기본 이미지가 Xcode 26을 지원하므로 기술적으로 가능. 실제 build log 검증은 `NOT_RUN` |
| Bundle ID | `com.anonymous.sogangcommunity` | `BLOCKED_EXTERNAL` — 영구 출시 ID 승인 필요 |
| 사용자 버전 | app config `0.1.0` | 로컬 설정 완료; 출시 버전 승인과 store history 확인 `BLOCKED_EXTERNAL` |
| iOS build number | app config `1`; EAS remote source/autoIncrement 설정 | remote version 미초기화, 실제 build `NOT_RUN` |
| 앱 이름 | app config `Sogang Community`, UI/문서에는 다른 명칭 존재 | `BLOCKED_EXTERNAL` |
| ATS/Local Network | arbitrary loads false; 로컬 네트워크 예외와 테스트 설명 없음 | static precheck 통과, release archive 검증 `NOT_RUN` |
| Privacy Manifest | tracking false 및 세 required-reason API 항목 설정 | static precheck 통과, 최종 archive/SDK manifests 검증 `NOT_RUN` |
| 계정 삭제 | current-password hard delete, public email flow, public content anonymization, private data deletion | 로컬 API/DB `PASS`; 공개 URL·운영 검증 `BLOCKED_EXTERNAL` |
| 개인정보 처리방침 | 실제 범주와 삭제/익명화가 인앱 문구에 반영됨; 공개 URL 없음 | local route `PASS` / public policy `BLOCKED_EXTERNAL` |
| 아이콘·스토어 스크린샷 | 승인된 원본 확인 불가 | `BLOCKED_EXTERNAL` |
| App Store Connect 앱 레코드 | 확인 불가 | `BLOCKED_EXTERNAL` |

## 1. 계정과 앱 레코드

App Store Connect에서 다음을 확정한다.

| 필드 | 값 |
| --- | --- |
| Apple Developer 법적 주체 | `[BLOCKED_EXTERNAL]` |
| Team ID | `[BLOCKED_EXTERNAL]` |
| App Store Connect 역할 | `[BLOCKED_EXTERNAL: Account Holder/Admin/App Manager 확인]` |
| App Name | `[DRAFT: STORE_LISTING_KO.md 참조]` |
| Primary Language | `[DRAFT: Korean]` |
| Bundle ID | `[BLOCKED_EXTERNAL]` |
| SKU | `[BLOCKED_EXTERNAL]` |
| Apple ID / `ascAppId` | `[BLOCKED_EXTERNAL]` |
| 무료/유료 | `[DRAFT: Free]` |
| 배포 국가/지역 | `[BLOCKED_EXTERNAL]` |
| DSA trader status | `[BLOCKED_EXTERNAL]` |

Bundle ID와 SKU는 앱 레코드/첫 빌드 이후 변경 제약이 있으므로 임시값으로 생성하지 않는다. 승인된 Bundle ID는 Expo app config, EAS submit profile, App Store Connect에 완전히 동일해야 한다.

## 2. 메타데이터

한국어 초안은 `STORE_LISTING_KO.md`를 사용하되 다음 승인을 완료한다.

- 이름: 2~30자
- 부제: 30자 이하
- 프로모션 문구: 170자 이하, 선택
- 설명: 4,000자 이하, 필수
- 키워드: 각 키워드는 2자 초과, 쉼표를 포함한 합계는 100바이트 이하, 필수
- 지원 URL: 실제 주소·이메일·전화 등 연락 수단으로 이어지는 HTTPS 페이지
- 개인정보 처리방침 URL: 실제 앱/개발자명과 처리 내용을 포함하는 공개 HTTPS 페이지
- 마케팅 URL: 선택
- 저작권: `[BLOCKED_EXTERNAL: 연도 + 권리자]`
- Primary/Secondary Category: `[DRAFT]`
- Content Rights: 학교/원우회/제3자 자료 권리를 확인한 뒤 답변
- Age Rating: UGC, 신고/차단, 외부 링크 등 실제 기능 기준으로 새 질문에 답변
- 대한민국 및 선택 지역 추가 필드: 계정 유형·앱 성격에 따라 App Store Connect가 요구하는 값을 완료

메타데이터, 스크린샷, App Privacy는 최종 바이너리의 기능과 정확히 일치해야 한다. “공식”, “학교 인증”, “보장” 같은 표현은 권리자 승인 없이는 사용하지 않는다.

## 3. 개인정보와 계정 삭제

출시 전 필수:

1. `PRIVACY_DATA_MATRIX.md`를 최종 바이너리와 production 인프라 기준으로 다시 감사한다.
2. Apple App Privacy에서 수집 데이터, 목적, 사용자 연결 여부, 추적 여부를 입력한다.
3. Expo Push, APNs, SMTP, hosting/storage 등 제3자 처리 관행을 포함한다.
4. 앱 내부와 App Store Connect에 같은 개인정보 처리방침을 쉽게 접근 가능하게 제공한다.
5. `ACCOUNT_DELETION_RETENTION.md`의 삭제 계약을 구현하고 테스트한다.

현재 `DELETE /api/users/me`는 current password를 서버에서 검증하고 user row와 계정 PII, sessions/tokens, private/draft/hidden/mutual-aid content와 private media를 hard-delete한다. Active public published posts/comments는 author link를 제거하고 `Deleted user`로 표시하며, 필요한 public attachment는 owner와 filename을 익명화한다. Public email request/verify 경로도 같은 service를 사용한다. 이 동작은 SQLite/PostgreSQL 104-test suite에서 검증됐다.

Apple 제출 전에는 실제 production URL, processor/backup lifecycle, 최종 privacy declaration, 법무 승인이 이 동작과 일치하는지 추가 확인한다. 코드에는 고정 법적 retention 기간을 주장하지 않는다.

Apple 답변 초안:

- Tracking: `DRAFT — app config는 false지만 최종 archive와 제3자 SDK 감사 후 확정`
- Data linked to user: 계정, UGC, 검색, 반응, 파일, push token은 user ID와 연결되므로 원칙적으로 `Yes`
- Purpose: 계정 관리 기능을 포함해 주로 Apple 분류의 App Functionality에 해당. 알림의 Developer Communications 해당 여부는 콘텐츠 정책과 함께 확정

## 4. EAS 프로덕션 설정

코드 수정은 별도 구현 작업으로 수행한다. 최소 목표:

```json
{
  "expo": {
    "version": "[BLOCKED_EXTERNAL]",
    "ios": {
      "bundleIdentifier": "[BLOCKED_EXTERNAL]"
    }
  }
}
```

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
      "ios": {
        "ascAppId": "[BLOCKED_EXTERNAL]"
      }
    }
  }
}
```

검증 사항:

- `npx expo config --type public` 결과에 최종 name, Bundle ID, version, permission 설명이 반영되는지 확인한다.
- EAS build log의 macOS/Xcode가 Xcode 26 이상인지 기록한다. SDK 54의 `auto`/`sdk-54` 이미지는 현재 Xcode 26을 지원하지만 이미지 별칭은 변할 수 있다.
- 프로덕션 build에서 Local Network 테스트 설명과 허용이 없어야 한다.
- `PrivacyInfo.xcprivacy`와 포함된 SDK privacy manifest를 archive에서 확인한다. Apple 이메일 경고가 있으면 required reason을 임의 추측하지 말고 실제 호출과 라이브러리 manifest를 근거로 수정한다.
- 배포 API URL은 HTTPS production 주소여야 하며 localhost/LAN fallback이 없어야 한다.
- 사용자 버전은 사람이 명시적으로 올리고, build number는 중복되지 않게 관리한다.

## 5. 빌드와 TestFlight

아래 명령은 절차 예시이며, 실제 실행은 release commit과 외부 입력이 확정된 후 수행한다.

```powershell
Set-Location frontend
npx eas-cli@latest build --platform ios --profile production
```

빌드 증거로 남길 값:

- Git commit SHA
- EAS build ID
- resolved app config
- Xcode version과 iOS SDK
- Bundle ID, marketing version, build string
- signing team
- build completion URL 및 경고 0 여부

바이너리 업로드는 명시적 승인 후에만 수행한다.

```powershell
Set-Location frontend
npx eas-cli@latest submit --platform ios --profile production
```

EAS Submit은 `.ipa`를 App Store Connect로 업로드할 뿐 App Store 공개나 App Review 제출을 자동 완료하지 않는다. 업로드 처리 후:

1. Build Uploads가 `Complete`인지 확인하고 모든 warning을 검토한다.
2. TestFlight internal group에서 smoke test를 수행한다.
3. 외부 TestFlight가 필요하면 Beta App Review 정보와 테스트 설명을 제공한다.
4. final build를 App Store 버전에 연결한다.

## 6. 심사 정보

`REVIEW_NOTES_TEMPLATE.md`를 복사해 App Store Connect에 입력한다.

- 심사 담당자의 이름, 회사 이메일, 국제 형식 전화번호
- guest/user/admin별 접근 방법
- 데모 계정이 필요한지 여부
- 학교 이메일 인증을 우회하는 reviewer 전용 안전한 방법
- 알림 권한은 선택이며 거부해도 핵심 기능을 사용할 수 있다는 설명
- 익명 게시판에서 일반 사용자에게 작성자 식별정보가 노출되지 않는다는 설명
- private media/상호부조 증빙의 reviewer 확인 절차
- 계정 삭제 위치, 재인증, 처리 결과
- production API가 live인 시간과 장애 연락 채널

데모 비밀번호는 Git 문서에 넣지 않고 App Store Connect의 심사 접근 필드에만 입력한다.

## 7. 제출 직전 확인

- App Privacy와 개인정보 처리방침이 matrix와 일치한다.
- 지원 URL·개인정보 URL·삭제 관련 페이지가 로그인 없이 열리고 모바일에서 읽힌다.
- 스크린샷이 실제 build UI를 보여주고 테스트 개인정보가 포함되지 않는다.
- updated age rating 질문, 콘텐츠 권리, DSA/지역 필드를 완료했다.
- `ITSAppUsesNonExemptEncryption=false` 답변이 실제 암호화 사용과 일치하는지 담당자가 확인했다.
- 심사 계정이 잠기거나 만료되지 않았고 reviewer가 이메일 OTP 없이 진입할 수 있다.
- backend, SMTP, push, media가 live이고 테스트 데이터가 안정적으로 존재한다.
- 공개 방식은 `[DRAFT: manual release 권장]`으로 두고 승인 전 자동 공개를 선택하지 않는다.

## 증거 기록

| 항목 | 값 |
| --- | --- |
| Release SHA | `[NOT_RUN: current worktree is not pinned]` |
| EAS iOS build ID | `[BLOCKED_EXTERNAL]` |
| App Store build string | `[BLOCKED_EXTERNAL]` |
| TestFlight smoke 결과 | `[NOT_RUN]` |
| App Privacy 승인자/시각 | `[BLOCKED_EXTERNAL]` |
| App Review 제출 승인자/시각 | `[BLOCKED_EXTERNAL]` |

## 공식 근거

확인일: 2026-07-27

- [Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple app information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information)
- [Apple platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information)
- [Expo iOS submission](https://docs.expo.dev/submit/ios/)
- [Expo build infrastructure](https://docs.expo.dev/build-reference/infrastructure/)

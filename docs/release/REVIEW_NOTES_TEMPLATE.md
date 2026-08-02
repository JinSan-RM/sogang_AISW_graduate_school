# 스토어 심사 메모 템플릿

- 문서 상태: `DRAFT`
- 심사 연락처·계정·승인: `BLOCKED_EXTERNAL`
- 공식 요구사항 확인일: `2026-07-27`
- 사용 원칙: 실제 출시 후보 빌드와 운영 환경을 확인한 뒤 콘솔에 직접 입력

이 파일에는 실사용 비밀번호, API 키, 토큰, 인증서, 개인 전화번호를 기록하지 않는다. 심사용 자격 증명은 Apple App Store Connect 또는 Google Play Console의 제한된 입력란에만 넣고, 심사 종료 후 폐기하거나 비밀번호를 교체한다.

## 1. 공통 릴리스 식별

| 필드 | 입력값 | 상태 |
|---|---|---|
| 출시 커밋 SHA | `[불변 전체 SHA]` | `DRAFT` |
| iOS 버전 / 빌드 | `[예: 1.0.0 / 1]` | `DRAFT` |
| Android 버전 / versionCode | `[예: 1.0.0 / 1]` | `DRAFT` |
| 앱 표시 이름 | `[승인된 이름]` | `BLOCKED_EXTERNAL` |
| iOS bundle identifier | `[확정된 식별자]` | `BLOCKED_EXTERNAL` |
| Android package name | `[확정된 식별자]` | `BLOCKED_EXTERNAL` |
| 운영 API 호스트 | `[HTTPS 운영 호스트]` | `BLOCKED_EXTERNAL` |
| 심사 기간 운영 책임자 | `[이름·연락 가능 시간대]` | `BLOCKED_EXTERNAL` |
| 개인정보처리방침 URL | `[공개 HTTPS URL]` | `BLOCKED_EXTERNAL` |
| 계정 삭제 웹 URL | `[공개 HTTPS URL]` | `BLOCKED_EXTERNAL` |

## 2. 심사 계정 준비

| 계정 | 필요 여부 | 콘솔 입력 | 준비 조건 |
|---|---|---|---|
| 일반 사용자 | 필요 | 사용자명과 비밀번호는 콘솔에만 입력 | 이메일 인증 완료, 만료·2단계 인증·OTP 없음 |
| 관리자 | 관리자 기능을 앱에서 심사해야 할 때만 | 별도 자격 증명을 콘솔에만 입력 | 최소 권한, 테스트 콘텐츠만 관리 가능 |
| 게스트 | 자격 증명 불필요 | 로그인·가입·비밀번호 재설정·법률·지원·계정 삭제 경로 설명 | 콘텐츠 경로는 열리지 않고 인증 화면 또는 normalized `401`로 보호됨 |

심사 계정은 운영자의 개인 계정을 재사용하지 않는다. 이메일 인증 링크, 학교망, 특정 IP, VPN, 외부 메신저 승인, 일회용 코드가 필요하면 심사가 막히므로 심사용 예외 또는 지속적으로 접근 가능한 절차를 마련하고 그 이유를 메모한다.

## 3. 공통 심사 동선

아래 단계는 출시 후보에서 재현한 뒤 실제 화면명으로 고친다.

1. 앱 실행 → 로그인 전 인증·법률·지원·계정 삭제 화면만 접근되는지 확인한다.
2. 로그인 → 심사용 일반 사용자 계정으로 진입한다.
3. 홈 → 공지와 일정을 확인한다.
4. 커뮤니티 탭 → 게시글 상세와 댓글을 읽는다.
5. 게시글 작성 → 테스트 게시판에 글을 작성하고 수정·삭제한다.
6. 게시글 상세 → 댓글, 답글, 공감, 북마크를 확인한다.
7. 검색 → 제공된 테스트 검색어로 게시글을 찾는다.
8. 알림 → 알림 목록 및 수신 설정을 확인한다. 푸시 수신 자체가 핵심 기능의 전제는 아니다.
9. 설정 → 개인정보처리방침과 계정 관리 화면을 연다.
10. 계정 삭제 → 앱에서 삭제 요청을 시작하고, 확인 화면과 결과를 검증한다.
11. 관리자 기능이 포함된 경우 관리자 계정으로 공지·일정·신고 처리 동선을 확인한다.

테스트 검색어, 테스트 게시판명, 테스트 콘텐츠 제목은 아래에 입력한다.

```text
테스트 게시판: [값]
검색어: [값]
예상 결과 제목: [값]
관리자 메뉴 경로: [해당 시 값]
```

## 4. 현재 제출 금지 항목

다음 항목은 local 구현과 외부 운영 상태를 구분해 작성한다.

- 계정 삭제 local evidence: authenticated/public hard-delete, current-password verification, published-content anonymization, private-data deletion, rollback, non-identifying receipt가 SQLite/PostgreSQL 104-test suite에서 검증됐다.
- 계정 삭제 review copy: 공개 published content는 `Deleted user`로 남을 수 있고 private/draft/hidden/mutual-aid content와 private media는 삭제된다는 실제 동작을 그대로 설명한다.
- 외부 삭제 URL: 로그인 없이 접근 가능한 공개 페이지와 요청 이행 절차가 운영 환경에 배포되어야 한다.
- 개인정보 선언: Apple App Privacy와 Google Data safety 답변이 출시 후보의 코드·SDK·서버 로그·운영 도구까지 반영해야 한다.
- 네트워크 보안: source config에서는 Android cleartext/backup/불필요 권한과 iOS local-network 예외가 제거됐다. 최종 AAB/IPA에서 다시 확인해야 한다.
- 앱 식별자: `com.anonymous...` 형태의 임시 식별자가 최종 식별자로 바뀌어야 한다.

## 5. Apple App Review 메모

### 연락처

```text
이름: [심사 중 연락 가능한 담당자]
전화: [국가번호 포함, 콘솔에만 입력]
이메일: [모니터링되는 업무용 이메일]
```

상태: `BLOCKED_EXTERNAL`

### 로그인 정보

```text
로그인 필요 여부: 예
일반 사용자 계정: [App Store Connect에만 입력]
일반 사용자 비밀번호: [App Store Connect에만 입력]
관리자 계정: [필요한 경우 App Store Connect에만 입력]
관리자 비밀번호: [필요한 경우 App Store Connect에만 입력]
```

### Notes 초안

```text
이 앱은 공지·일정 확인과 구성원 커뮤니티 기능을 제공합니다.

이 앱은 회원 전용입니다. 로그인 전에는 로그인·회원가입·비밀번호 재설정·법률·지원·계정 삭제 화면만 열립니다. 공지·일정·게시글과 참여 기능은 제공된 심사용 일반 사용자 계정으로 로그인한 뒤 확인할 수 있습니다.

권장 심사 동선:
1. [실제 경로]에서 제공된 계정으로 로그인합니다.
2. [실제 탭명]에서 공지와 일정을 확인합니다.
3. [실제 탭명]에서 게시글 상세를 엽니다.
4. [테스트 게시판명]에서 게시글·댓글·공감·북마크를 확인합니다.
5. [실제 경로]에서 개인정보처리방침을 엽니다.
6. [실제 경로]에서 계정 삭제를 시작할 수 있습니다.

사진 권한은 사용자가 게시글 또는 프로필에 이미지를 직접 추가할 때만 요청합니다. 알림 권한을 거부해도 로그인한 회원은 공지·일정·커뮤니티의 핵심 기능을 사용할 수 있습니다.

[관리자 전용 기능, 지역 제한, 하드웨어 의존성, 심사에 필요한 추가 설명]
```

### Apple 추가 확인

| 항목 | 초안 | 상태 |
|---|---|---|
| 로그인 없이 확인 가능한 범위 | 로그인·회원가입·비밀번호 재설정·법률·지원·계정 삭제 화면 | `DRAFT` |
| 계정 생성 위치 | 앱 내 회원가입 경로 | `DRAFT` |
| 계정 삭제 위치 | 설정 내 계정 관리 경로 | `DRAFT` |
| 인앱 구매 | 없음 후보 | `DRAFT` |
| 제3자 로그인 | 없음 후보 | `DRAFT` |
| 광고 | 없음 후보 | `DRAFT` |
| 암호화 수출 규정 답변 | HTTPS 및 사용 라이브러리 기준으로 담당자가 판정 | `BLOCKED_EXTERNAL` |
| 콘텐츠 권리 | 운영자가 게시 권한과 UGC 정책을 확인 | `BLOCKED_EXTERNAL` |

## 6. Google Play 심사 및 App access 메모

Google Play Console의 App access에서 로그인, 멤버십, 위치 등으로 제한되는 모든 부분에 접근 지침을 제공한다. 지침은 영어 또는 심사자가 이해할 수 있는 명확한 언어로 작성하고, 장기간 유효한 계정을 사용한다.

### App access 초안

```text
Access name: General member access

Username/email: [Play Console에만 입력]
Password: [Play Console에만 입력]

Instructions:
1. Launch the app and open [actual sign-in path].
2. Sign in with the credentials provided above. No OTP or additional verification is required.
3. Open [actual community path] to create a post and test comments, likes, and bookmarks.
4. Open [actual settings path] to review the privacy policy and account-deletion entry point.

Additional access:
[관리자 기능이 심사 대상이면 별도 최소 권한 계정과 정확한 경로를 추가]
```

### Google 추가 확인

| 항목 | 초안 | 상태 |
|---|---|---|
| 제한된 기능 전체 접근 | 일반 사용자 및 조건부 관리자 동선 | `DRAFT` |
| 계정 삭제 앱 내 경로 | `[실제 경로]` | `DRAFT` |
| 계정 삭제 웹 링크 | `[공개 HTTPS URL]` | `BLOCKED_EXTERNAL` |
| Data safety 답변 | `PRIVACY_DATA_MATRIX.md`와 일치 | `DRAFT` |
| 광고 포함 여부 | 없음 후보 | `DRAFT` |
| 타깃층·콘텐츠 등급 | UGC·연락 기능을 포함해 콘솔 설문 완료 | `DRAFT` |
| 콘텐츠 액세스의 지역/IP 제한 | 없음 후보 | `DRAFT` |

## 7. 제출 직전 재현 체크

- [ ] 콘솔에 등록할 정확한 빌드를 새 기기에 설치했다.
- [ ] 로그인·회원가입·비밀번호 재설정·법률·지원·계정 삭제 게스트 동선을 로그아웃 상태에서 재현했고, 콘텐츠 경로가 보호되는지 확인했다.
- [ ] 일반 사용자 계정으로 추가 인증 없이 로그인했다.
- [ ] 관리자 계정은 필요한 경우에만 제공하며 최소 권한이다.
- [ ] 테스트 계정과 테스트 콘텐츠가 심사 기간 동안 유지된다.
- [ ] 모든 화면명과 단계가 현재 빌드와 일치한다.
- [ ] 개인정보처리방침과 계정 삭제 URL이 외부 네트워크에서 열린다.
- [ ] 계정 삭제가 공개 보존 정책과 같은 결과를 만든다.
- [ ] 사진·알림 권한을 거부해도 앱이 중단되지 않는다.
- [ ] 장애·점검·seed 초기화가 심사 계정에 영향을 주지 않는다.
- [ ] 연락 담당자가 심사 기간 동안 이메일과 전화를 확인한다.
- [ ] 심사 종료 후 자격 증명 회수 계획이 있다.

## 8. 공식 출처

아래 문서는 모두 `2026-07-27`에 확인했다.

- Apple App Review 제출 준비: https://developer.apple.com/app-store/review/
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple App Store Connect API, App Store Review Details 필드: https://developer.apple.com/documentation/appstoreconnectapi/app-store-review-details
- Apple 앱 내 계정 삭제 제공 지침: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Google Play Console, 심사를 위한 App access 및 앱 콘텐츠 정보: https://support.google.com/googleplay/android-developer/answer/9859455?hl=en
- Google Play 계정 삭제 요구사항: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en

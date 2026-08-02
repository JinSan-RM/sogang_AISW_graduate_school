# 개인정보 및 스토어 데이터 선언 매트릭스

기준일: 2026-07-27\
상태: `DRAFT` — 법무/개인정보책임자와 실제 production 처리자의 승인 전에는 스토어에 그대로 제출하지 않는다.

이 문서는 Apple App Privacy와 Google Play Data safety의 공통 사실 원장이다. 분류는 현재 소스 코드와 모델을 바탕으로 한 초안이며, 최종 바이너리·서버 로그·클라우드/SMTP/백업 계약을 포함한 전체 데이터 흐름 감사가 필요하다.

## 판정 원칙

- Apple의 “수집”은 요청 처리에 필요한 실시간 전송보다 오래 개발자 또는 제3자가 접근할 수 있게 off-device로 전송하는 경우를 뜻한다.
- Google의 “수집”은 앱에서 사용자 기기 밖으로 전송하는 경우를 포함한다.
- 제3자 SDK/서비스의 처리도 포함한다.
- Google의 “공유”에는 서비스 제공자 등 예외가 있을 수 있으나 계약과 사용 목적을 확인하기 전에는 예외를 확정하지 않는다.
- 사용자 계정 ID와 FK로 연결된 데이터는 원칙적으로 “사용자에게 연결됨”이다.
- 코드에서 보이지 않는다고 production 인프라에서도 수집하지 않는다고 단정하지 않는다.

## 현재 구현 기반 데이터 원장

| ID | 데이터/흐름 | 저장소 근거 | Apple 분류 초안 | Google 분류 초안 | 사용자 연결 | 필수성/목적 | 제3자 전달 | 삭제 현황 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DATA-01 | 학교 이메일·username | `User.username`, `User.email`, 이메일 인증 token | Contact Info: Email Address; Identifiers: User ID | Personal info: Email address, User IDs | 예 | 가입·로그인·계정 관리, App Functionality | SMTP 제공자 `BLOCKED_EXTERNAL` | account hard delete와 email token 삭제 `PASS` |
| DATA-02 | 비밀번호·인증 자격증명 | password가 API로 전송되고 `password_hash` 저장; refresh/reset/verification token hash | 별도 password 유형 없음. 계정/보안 처리로 문서 설명 | Account management/security 처리. 콘솔 유형 선택 `DRAFT` | 예 | 필수, 인증·보안 | SMTP reset code, hosting | user/password hash와 session/reset/verification token 삭제 `PASS` |
| DATA-03 | 닉네임·기수·전공·재학/회비 상태·직장/직무/직책 | `User.nickname`, `cohort`, `major`, `enrollment_status`, `dues_status`, `company`, `job_title`, `position` | Contact Info: Name 또는 Other Data Types `DRAFT`; User ID로 쓰이는 nickname | Personal info: Name, Other info | 예 | 계정/프로필, 권한·커뮤니티 표시 | hosting/DB `BLOCKED_EXTERNAL` | user row 삭제, retained public content의 author link 제거 `PASS` |
| DATA-04 | 전화번호 | `User.phone` | Contact Info: Phone Number | Personal info: Phone number | 예 | 선택 프로필/연락 `DRAFT` | hosting/DB | user row와 함께 삭제 `PASS` |
| DATA-05 | 프로필 사진·게시물 이미지 | `MediaAsset`, `profile_image_url`, image picker | User Content: Photos or Videos | Photos and videos: Photos | 예 | 선택, 프로필/게시 기능 | production media storage `BLOCKED_EXTERNAL` | private/non-retained file 삭제; retained public attachment owner/filename 익명화 `PASS` |
| DATA-06 | 문서·상호부조 증빙 등 첨부 | `MediaAsset`가 PDF/Office/HWP 및 private upload 지원 | User Content: Other User Content; 내용에 따라 Photos or Videos | Files and docs; Photos and videos | 예 | 선택, 게시/증빙 기능 | production media storage | private evidence와 row/file 삭제 `PASS`; provider/backup 전파는 `BLOCKED_EXTERNAL` |
| DATA-07 | 게시글·댓글·답글·제안·신고 상세 | `Post`, `Comment`, `Report`, post extensions | User Content: Other User Content | App activity: Other user-generated content | 예, 익명 표시는 서버의 연결 제거가 아님 | 선택, 커뮤니티·안전 | hosting/DB; push payload에 일부 내용 가능 | public published content는 author unlink; private/draft/hidden/mutual-aid content와 신고 삭제 `PASS` |
| DATA-08 | 좋아요·북마크·차단·신고·알림 설정 | `Like`, `Bookmark`, `UserBlock`, `Report`, `NotificationSetting` | Usage Data: Product Interaction/Other Usage Data | App activity: App interactions/Other actions | 예 | 선택, 기능·안전·개인화 | hosting/DB | 삭제 transaction에서 제거 `PASS` |
| DATA-09 | 인앱 검색어 | `SearchHistory.keyword` | Search History | App activity: In-app search history | 예 | 선택, 최근 검색 기능 | hosting/DB | 삭제 transaction에서 제거 `PASS` |
| DATA-10 | Expo push token·플랫폼·알림 payload·delivery receipt | `PushToken`, `PushDelivery.token_snapshot`, `Notification`; Expo Push API | Identifiers: Device ID; Usage Data/Product Interaction `DRAFT` | Device or other IDs; App activity `DRAFT` | 예 | 선택, App Functionality/Developer Communications | Expo Push Service → APNs/FCM | account-linked token/delivery/notification 삭제 `PASS`; provider 처리 확인은 `BLOCKED_EXTERNAL` |
| DATA-11 | rate-limit subject hash | `RateLimitBucket.subject_hash`; IP/계정 subject를 hash해 제한 | Identifiers 또는 Other Data Types `DRAFT` | Device or other IDs 또는 security data `DRAFT` | 재연결 가능성 검토 필요 | 필수, fraud prevention/security | hosting/DB | email/user subject hash 삭제 `PASS`; proxy/IP 보존은 `BLOCKED_EXTERNAL` |
| DATA-12 | 운영 감사 로그 | `OperationalAuditLog.actor_id`, action, target, JSON details | Usage Data/Other Data Types `DRAFT` | App activity/App interactions `DRAFT` | 관리자 actor에 연결 | 필수성 `DRAFT`, 보안·감사 | hosting/DB | deleted actor/target unlink 및 user-target details 제거 `PASS`; 일반 로그 기간은 외부 승인 |
| DATA-13 | server/proxy/access/error logs | 저장소 밖 production 인프라 | Diagnostics, Coarse Location(IP 추론 가능) 등 `DRAFT` | App info and performance, Approximate location 등 `DRAFT` | `BLOCKED_EXTERNAL` | 운영·보안 | hosting/CDN/log provider | 업체·필드·기간 미정 |
| DATA-14 | DB·미디어 백업 | production 인프라 미정 | 원본 데이터와 같은 범주 | 원본 데이터와 같은 범주 | 예 | 재해복구 | backup provider `BLOCKED_EXTERNAL` | 만료·삭제 전파 미정 |

## 현재 코드에서 관찰되지 않은 범주

다음은 직접 dependency/source audit에서 전용 수집 기능이 관찰되지 않았다. 최종 AAB/IPA, native manifest, linked SDK를 확인한 뒤에만 “수집하지 않음”으로 확정한다.

| 범주 | 현재 초안 | 확정 조건 |
| --- | --- | --- |
| 광고·광고 ID·타사 광고 | `DRAFT: 미수집/미사용` | 최종 SDK 목록과 네트워크 trace에서 광고 SDK/AAID/IDFA 없음 |
| 사용자 추적 | `DRAFT: No tracking` | ATT 사용, cross-app/site linkage, data broker 공유 없음 |
| 위치 | `DRAFT: 미수집` | location permission/API 없음; proxy가 IP 기반 위치를 보존하는지 확인 |
| 주소록·연락처 | `DRAFT: 미수집` | contacts permission/API 없음 |
| 카메라·마이크·오디오 | app config에서 camera/microphone permission false | 최종 manifest/Info.plist와 사용 경로 확인 |
| 결제·구매·금융 | `DRAFT: 미수집` | 결제/IAP/구독 기능 및 SDK 없음 |
| 건강·피트니스·민감정보 | `DRAFT: 의도적 수집 없음` | 자유 입력/증빙에 들어올 수 있는 민감정보의 처리·최소화 안내 승인 |
| crash/analytics SDK | `DRAFT: 전용 SDK 미관찰` | production logging/EAS Observe/Sentry/Firebase 등 실제 활성화 여부 확인 |

## Apple App Privacy 제출 초안

아래 선택은 최종 감사 전 `DRAFT`다.

| 데이터 유형 | Collected | Linked to user | Tracking | 목적 초안 |
| --- | --- | --- | --- | --- |
| Email Address | Yes | Yes | No | App Functionality |
| Phone Number | Yes if user provides | Yes | No | App Functionality |
| Name | Yes — nickname을 Name으로 분류할지 확인 | Yes | No | App Functionality, Product Personalization `DRAFT` |
| User ID | Yes | Yes | No | App Functionality |
| Photos or Videos | Yes if user uploads | Yes | No | App Functionality |
| Other User Content | Yes if user posts/uploads | Yes | No | App Functionality |
| Search History | Yes if user searches | Yes | No | App Functionality |
| Product Interaction/Other Usage Data | Yes | Yes | No | App Functionality |
| Device ID | Yes if push enabled | Yes | No | App Functionality |
| Other Data Types | `DRAFT` — 학적/직무/profile fields | Yes | No | App Functionality |

Apple의 required-reason API용 Privacy Manifest는 App Privacy 답변과 별개다. `expo.ios.privacyManifests`가 현재 없으므로 final archive와 dependency의 `PrivacyInfo.xcprivacy`를 검사한다.

## Google Data safety 제출 초안

| 질문/유형 | 초안 |
| --- | --- |
| 앱이 데이터를 수집하거나 공유하는가 | Yes |
| 전송 중 암호화 | `BLOCKED_EXTERNAL` — production HTTPS와 push/SMTP 경로 증거 필요 |
| 계정 생성 | Yes |
| 계정 삭제 | `PASS` — authenticated hard delete와 public email request/verify가 104-test SQLite/PostgreSQL suite에서 검증됨 |
| 외부 삭제 URL | `BLOCKED_EXTERNAL` |
| 독립 보안 검토 | `DRAFT: No`, 실제 인증이 있을 때만 Yes |
| Personal info | Name/nickname, email, phone, user IDs, other info |
| Photos and videos | Photos |
| Files and docs | 사용자 첨부 |
| App activity | App interactions, in-app search history, other UGC, other actions |
| Device or other IDs | Expo push token |
| 수집 목적 | App functionality, Account management, Fraud prevention/security; Developer communications는 push 내용에 따라 `DRAFT` |
| Required/optional | email/account/auth는 required; phone/profile/UGC/files/search/push는 기능별 optional `DRAFT` |
| Shared | `DRAFT` — Expo/SMTP/hosting이 Google의 service-provider exception을 충족하는지 계약 확인 |

## 제3자/수탁자 확인표

| 처리자 | 전송 데이터 | 현재 근거 | 필요한 외부 확인 | 상태 |
| --- | --- | --- | --- | --- |
| Expo Push Service | Expo push token, notification title/body/data, ticket/receipt | backend가 Expo Push API 호출 | 약관, 처리 지역, 삭제/보안, enhanced push security 사용 | `BLOCKED_EXTERNAL` |
| APNs / FCM | native push token과 알림 payload | Expo가 두 서비스로 전달 | production credentials와 플랫폼 처리 설명 | `BLOCKED_EXTERNAL` |
| SMTP provider | email address, 인증/재설정 메시지 | provider는 env로 주입 | 업체, region, retention, DPA, 발신자 | `BLOCKED_EXTERNAL` |
| Operational alert provider | service/environment/event/severity/time과 제한된 route/method/error-type/count context; 앱 코드는 PII·token·body·raw exception을 보내지 않음 | provider-neutral HTTPS webhook adapter와 non-PII regression test | 업체, region, retention, DPA, 접근자, live routing | `BLOCKED_EXTERNAL` |
| API/DB/media hosting | 위 원장 대부분 | 현재 로컬/Docker 설정만 존재 | 실제 업체, region, subprocessors, encryption, logs | `BLOCKED_EXTERNAL` |
| Backup/log/CDN | 원본 데이터/네트워크 메타데이터 가능 | 저장소 밖 | 수집 필드, 접근자, 기간, 파기, 국외 이전 | `BLOCKED_EXTERNAL` |

## 불일치와 차단

- 현재 개인정보 화면은 account/profile, UGC, 첨부, 검색, 반응, push, 제3자 처리, 삭제/익명화 범위를 설명하도록 갱신됐다.
- 계정 삭제 UI, public deletion UI, backend hard-delete 동작은 공개 콘텐츠 익명화와 private 데이터 삭제 원칙에서 일치한다.
- production HTTPS, proxy logs, SMTP, operational alerts, storage, backup 업체가 미정이어서 전송 중 암호화·공유·보존 답변을 확정할 수 없다.
- UI의 “익명”은 화면 표시 정책이며 데이터베이스의 author ID 연결을 제거하지 않는다.
- `account_deletion_receipts`는 비식별 필드만 갖지만 retention days와 production backup 만료는 privacy owner 승인 전 확정하지 않는다.

위 항목이 해결되고 책임자가 승인하기 전에는 App Privacy/Data safety를 제출하지 않는다.

## 변경 관리

다음 변경이 생기면 이 matrix와 두 스토어 선언을 함께 다시 검토한다.

- 새 SDK, analytics, ads, crash reporting, push provider 추가
- 새 권한 또는 native plugin 추가
- 데이터베이스 column, 로그, 백업, retention 변경
- 업로드 파일 종류나 공개/비공개 정책 변경
- 계정 삭제 처리나 UGC 보존 정책 변경
- production processor 또는 region 변경

## 공식 근거

확인일: 2026-07-27

- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- [Google Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Google User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
- [Expo Push Service](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Expo push notifications FAQ](https://docs.expo.dev/push-notifications/faq/)

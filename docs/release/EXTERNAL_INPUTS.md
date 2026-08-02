# 외부 입력 목록

기준일: 2026-07-27

저장소만으로 확정할 수 없는 출시 입력이다. 값이 정해지기 전에는 임의값으로 대체하지 않는다. 비밀번호, API 키, 인증서, 서비스 계정 JSON, 복구 코드 등은 이 문서나 Git에 넣지 않고 승인된 비밀 저장소 또는 각 플랫폼의 자격증명 관리 기능으로 전달한다.

## 필수 입력

| ID | 입력 | 플랫폼/사용처 | 필요한 결정 또는 증거 | 담당 | 상태 |
| --- | --- | --- | --- | --- | --- |
| EXT-01 | 최종 서비스/개발자 법인명 | 공통, 개인정보 처리방침, 스토어 개발자 표시 | 법적 주체의 정확한 한글·영문명 | 법무/운영 | `BLOCKED_EXTERNAL` |
| EXT-02 | 최종 앱 브랜드명 | 공통 | “서강”, “AI·SW”, 원우회/학교 명칭 및 로고 사용 승인 | 브랜드/학교 | `BLOCKED_EXTERNAL` |
| EXT-03 | iOS Bundle ID | Apple/Expo | 역도메인 형태의 영구 ID. 현재 `com.anonymous.sogangcommunity`는 출시용으로 승인되지 않음 | 앱 소유자 | `BLOCKED_EXTERNAL` |
| EXT-04 | Android package name | Google/Expo | 역도메인 형태의 영구 ID. 현재 `com.anonymous.sogangcommunity`는 출시용으로 승인되지 않음 | 앱 소유자 | `BLOCKED_EXTERNAL` |
| EXT-05 | Apple Developer 계정 | Apple | Account Holder, Team ID, 멤버십·계약·세금/은행 상태. 비밀값은 기록 금지 | 계정 소유자 | `BLOCKED_EXTERNAL` |
| EXT-06 | App Store Connect 앱 레코드 | Apple | Apple ID(`ascAppId`), SKU, primary language. 공개 가능한 식별자만 릴리스 설정에 반영 | 계정 소유자 | `BLOCKED_EXTERNAL` |
| EXT-07 | Google Play 개발자 계정 | Google | 개인/조직 유형, 생성일, 신원·연락처·기기 확인, 결제 프로필 상태 | 계정 소유자 | `BLOCKED_EXTERNAL` |
| EXT-08 | Play 앱 레코드와 제출 권한 | Google | 앱 생성 여부, Play App Signing, 2026-09-30 패키지 등록 상태, EAS Submit 사용 시 최소 권한 서비스 계정 키의 EAS 등록 증거 | 계정 소유자 | `BLOCKED_EXTERNAL` |
| EXT-09 | 개인 계정 closed-test 적용 여부 | Google | 2023-11-13 이후 생성된 개인 계정인지 확인. 해당 시 12명/14일 증거 | 계정 소유자/QA | `BLOCKED_EXTERNAL` |
| EXT-10 | 지원 URL·이메일·전화/주소 | 공통 | 사용자가 실제 연락 가능한 HTTPS 지원 페이지와 연락처. Apple 지역 법률 요구 포함 | 운영 | `BLOCKED_EXTERNAL` |
| EXT-11 | 개인정보 처리방침 URL | 공통 | 공개·HTTPS·비로그인·비지역제한·비PDF 페이지. 앱/개발자명을 정확히 포함 | 법무/운영 | `BLOCKED_EXTERNAL` |
| EXT-12 | 계정 삭제 웹 URL | Google | 앱 이름/개발자명, 삭제 요청 경로, 삭제/보존 항목이 보이는 공개 HTTPS 페이지 | 운영 | `BLOCKED_EXTERNAL` |
| EXT-13 | 개인정보 처리·보존 법률 검토 | 공통 | 처리 목적, 법적 근거, 승인된 receipt/backup 기간, 국외 이전, 수탁자, public UGC 익명화 고지 | 법무/개인정보책임자 | `BLOCKED_EXTERNAL` |
| EXT-14 | 제3자 처리자 목록과 계약 | 공통 | 호스팅, DB, 백업, SMTP, Expo Push, APNs/FCM 등 실제 업체·지역·보존·삭제 절차 | 운영/법무 | `BLOCKED_EXTERNAL` |
| EXT-15 | 최종 App Privacy 답변 | Apple | `PRIVACY_DATA_MATRIX.md`의 수집·연결·추적·목적을 최종 바이너리 기준 승인 | 개인정보책임자 | `DRAFT` |
| EXT-16 | 최종 Data safety 답변 | Google | 수집·공유·필수/선택·목적·암호화·삭제 답변 승인 | 개인정보책임자 | `DRAFT` |
| EXT-17 | 대상 연령·콘텐츠 등급 | 공통 | UGC, 신고/차단, 성인 대상 여부를 반영한 Apple/Google 설문 답변 | 제품/법무 | `BLOCKED_EXTERNAL` |
| EXT-18 | 카테고리·배포 국가·가격 | 공통 | Apple/Google 카테고리, 무료/유료, 국가/지역, EU DSA trader 상태 | 제품/법무 | `BLOCKED_EXTERNAL` |
| EXT-19 | 콘텐츠 권리 | Apple/Google | 학교/원우회 로고, 게시 자료, 외부 링크·이미지·상표 사용 권한 | 콘텐츠 책임자 | `BLOCKED_EXTERNAL` |
| EXT-20 | 스토어 에셋 원본 | 공통 | 승인된 1024px 아이콘, feature graphic, 실기기 스크린샷, 저작권 증거 | 디자인/브랜드 | `BLOCKED_EXTERNAL` |
| EXT-21 | 릴리스 버전·출시일 | 공통 | 사용자 버전, build/versionCode 기준값, 수동/단계적 공개 일정 | 릴리스 책임자 | `BLOCKED_EXTERNAL` |
| EXT-22 | 프로덕션 API·웹 도메인 | 공통 | HTTPS API base URL, 인증서, CORS origin, 지원/개인정보/삭제 페이지 도메인 | 인프라 | `BLOCKED_EXTERNAL` |
| EXT-23 | SMTP 발신자 | 공통 | 검증된 발신 도메인/주소와 프로덕션 발송 성공 증거 | 인프라 | `BLOCKED_EXTERNAL` |
| EXT-24 | 미디어·DB·백업 운영정책 | 공통 | 암호화, 접근통제, 백업 주기/만료, 복구 테스트, 삭제 전파 방식 | 인프라/법무 | `BLOCKED_EXTERNAL` |
| EXT-25 | 심사 연락 담당자 | 공통 | 이름, 회사 이메일, 국제 형식 전화번호, 심사 기간 대응자 | 운영 | `BLOCKED_EXTERNAL` |
| EXT-26 | 심사 데모 계정 | 공통 | guest-visible 인증·법률·지원·삭제 경로와 user/admin 검토 경로. 계정이 필요한 경로의 자격증명은 스토어 콘솔에만 입력 | QA/운영 | `BLOCKED_EXTERNAL` |
| EXT-27 | 최종 제출 승인 | 공통 | 대상 커밋, 빌드 ID, 스토어 버전, 공개 방식이 적힌 명시적 승인 | 릴리스 책임자 | `BLOCKED_EXTERNAL` |
| EXT-28 | 운영 알림 provider | backend/worker | HTTPS webhook secret 등록, on-call 수신자·severity routing·재시도/장애 절차, live test 증거 | 인프라/운영 | `BLOCKED_EXTERNAL` |

## 조건부 입력

| ID | 조건 | 입력 | 상태 |
| --- | --- | --- | --- |
| EXT-C01 | EU 배포 | Apple DSA trader/non-trader 결정과 필요한 공개 연락정보 | `BLOCKED_EXTERNAL` |
| EXT-C02 | 한국에서 조직 계정으로 Apple 배포 | App Store Connect의 대한민국 이용 가능성 관련 조직 정보 | `BLOCKED_EXTERNAL` |
| EXT-C03 | 결제/구독 추가 | Apple/Google 결제, 세금, 환불, 구독 삭제 전 처리 정책 | `BLOCKED_EXTERNAL` |
| EXT-C04 | 광고/분석 SDK 추가 | ATT, 추적 여부, 광고 선언, SDK별 개인정보와 consent 설계 | `BLOCKED_EXTERNAL` |
| EXT-C05 | 규제 대상 데이터 보존 | 법률명·조문·보존 항목·기간·접근자·파기 방식 | `BLOCKED_EXTERNAL` |
| EXT-C06 | iPad 지원 | 13인치 iPad 스크린샷과 iPad 실기기 검증 | `BLOCKED_EXTERNAL` |

## 자동 strict check 스냅샷

2026-07-27 `node scripts/validate-release-config.mjs --ci`는 저장소 내부 정적 release 설정을 통과시키고 외부 입력 18개가 남았다고 보고했다.

1. 승인된 Android application ID
2. 승인된 iOS bundle ID
3. 1024×1024 앱 아이콘
4. Android adaptive foreground icon
5. Android monochrome icon
6. 승인된 splash plugin 설정
7. 실제 splash image 파일
8. EAS file variable로 주입할 package 일치 `google-services.json`
9. public HTTPS API URL
10. public HTTPS support URL
11. public HTTPS privacy URL
12. public HTTPS account-deletion URL
13. support/privacy/deletion 세 URL의 상호 구분
14. API URL의 `/api` suffix
15. 모니터링되는 support email
16. 승인된 법적 operator name
17. privacy effective date
18. privacy policy version

이는 서로 다른 승인 티켓이 반드시 18개라는 뜻이 아니라 strict validator가 보고한 18개 미충족 조건이다. EAS production environment에는 아직 이 값들이 등록되지 않았고, remote versions와 production AAB/IPA도 생성되지 않았다. 2026-07-27 local unsigned Android AAB 리허설은 compile/정적 검증 증거일 뿐 이 외부 입력이나 signed production artifact를 대체하지 않는다.

## 전달 규칙

- 공개 식별자(Bundle ID, package name, App Store Connect Apple ID)는 승인을 받은 뒤 코드와 릴리스 문서에 기록할 수 있다.
- 비밀값은 문서에 값 대신 저장 위치의 논리적 이름만 적는다. 예: `EAS secret: PRODUCTION_API_TOKEN`.
- 데모 계정 비밀번호는 `REVIEW_NOTES_TEMPLATE.md`에 쓰지 않고 App Store Connect/Play Console의 제한된 심사 접근 필드에만 입력한다.
- 외부 입력이 바뀌면 `PRIVACY_DATA_MATRIX.md`, 스토어 선언, 개인정보 처리방침, 심사 메모를 함께 갱신한다.

## 공식 근거

확인일: 2026-07-27

- [Apple App information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information)
- [Apple App Review details](https://developer.apple.com/documentation/appstoreconnectapi/app-store-review-details)
- [Google Play Console Requirements](https://support.google.com/googleplay/android-developer/answer/10788890?hl=en)
- [Google developer identity verification](https://support.google.com/googleplay/android-developer/answer/10841920?hl=en)
- [Expo app version management](https://docs.expo.dev/build-reference/app-versions/)

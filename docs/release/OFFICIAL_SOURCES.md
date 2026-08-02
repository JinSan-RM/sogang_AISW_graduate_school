# 공식 문서 근거 목록

확인일: 2026-07-27\
허용 출처: Apple Developer, Google Play/Android Developers, Expo 공식 문서만 사용

아래 URL은 이 출시 패키지를 작성할 때 직접 확인한 공식 문서다. 플랫폼 정책은 바뀔 수 있으므로 실제 제출일에 다시 열어 변경 여부를 확인한다.

## Apple

| 주제 | 공식 URL | 2026-07-27 적용 요약 |
| --- | --- | --- |
| 최신 제출 요구사항 | [Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/) | 2026-04-28부터 App Store Connect 업로드는 Xcode 26 이상과 iOS/iPadOS 26 SDK 이상이 필요하다. 새 연령 등급 질문도 적용 중이다. |
| 심사 원칙 | [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) | 정확한 메타데이터, 개인정보 처리방침, 계정 삭제, 심사 가능한 완성 상태와 데모 접근 정보를 요구한다. |
| 심사 준비 | [App Review](https://developer.apple.com/app-store/review/) | 지원 URL, 개인정보 처리방침, 로그인 기능용 유효한 데모 계정과 특수 설정 안내를 준비한다. |
| 계정 삭제 | [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/) | 계정 생성 앱은 앱 안에서 전체 계정 삭제를 시작할 수 있어야 하며 임시 비활성화만 제공해서는 안 된다. 원칙적으로 연관 UGC도 삭제한다. |
| App Privacy | [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/) | 앱과 통합된 제3자 파트너가 수집하는 데이터 유형·목적·사용자 연결·추적 여부를 모두 신고한다. |
| App Privacy 입력 | [Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/) | 개인정보 처리방침 URL과 데이터 유형별 답변을 App Store Connect에서 관리하고 최신 상태로 유지한다. |
| 공통 앱 정보 | [App information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information) | 이름 2~30자, 부제 30자 이하, iOS 개인정보 처리방침 URL, Bundle ID, 연령 등급, 카테고리 등을 설정한다. |
| 버전 메타데이터 | [Platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information) | 프로모션 문구 170자, 설명 4,000자, 키워드 100바이트, 실제 연락처가 있는 지원 URL과 저작권 정보 등을 요구한다. |
| 필수 필드 | [Required, localizable, and editable properties](https://developer.apple.com/help/app-store-connect/reference/app-information/required-localizable-and-editable-properties/) | 앱/버전별 필수 정보와 지역별 항목, DSA 상태 등 제출 필드를 확인한다. |
| 스크린샷 | [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) | 기기군별 1~10장, JPEG/JPG/PNG, 투명도 없는 허용 해상도를 사용한다. |
| 아이콘 | [App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons/) | iOS/iPadOS 레이아웃 원본은 1024×1024px이며 시스템이 마스크와 축소 변형을 적용한다. |
| 빌드 업로드 | [Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/) | Bundle ID, 버전, build string으로 빌드를 연결하며 처리 완료·경고·오류를 확인한다. |
| 심사 정보 필드 | [App Store review details](https://developer.apple.com/documentation/appstoreconnectapi/app-store-review-details) | 심사 연락처와 데모 계정 필요 여부, 필요 시 데모 자격증명을 제공한다. |

## Google Play / Android

| 주제 | 공식 URL | 2026-07-27 적용 요약 |
| --- | --- | --- |
| Target API | [Target API level requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en) | 현재 신규 앱/업데이트는 API 35 이상이며, 2026-08-31부터 모바일 신규 앱/업데이트는 API 36 이상이다. |
| 사용자 데이터 정책 | [User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en) | 모든 앱은 공개 개인정보 처리방침을 Play Console과 앱 내부에 제공하고 정확한 수집·공유·보존·삭제를 설명해야 한다. 비활성화는 삭제가 아니다. |
| Data safety | [Provide information for Google Play's Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en) | SDK를 포함한 모든 수집·공유를 신고하고, 비수집 앱도 양식과 개인정보 처리방침을 제출한다. |
| 계정 삭제 | [Understanding Google Play’s app account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en) | 계정 생성 앱은 앱 내부 경로와 앱 밖의 작동하는 웹 삭제 리소스를 모두 제공하고 연관 데이터를 삭제해야 한다. |
| 앱 생성·텍스트 제한 | [Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en) | 앱 이름 30자, 짧은 설명 80자, 전체 설명 4,000자 제한이다. |
| 그래픽 에셋 | [Add preview assets to showcase your app](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en) | 512px 아이콘, 1024×500 feature graphic, 최소 2개 스크린샷 등 필수 규격을 정의한다. |
| App content·심사 접근 | [Prepare your app for review](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en) | 개인정보 처리방침, 광고, 로그인 접근, 대상 연령, 콘텐츠 등급, Data safety 등 App content 선언을 완료한다. |
| 개인 계정 테스트 | [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) | 2023-11-13 이후 생성된 개인 계정은 프로덕션 신청 전에 12명 이상이 14일 연속 참여한 closed test가 필요하다. |
| 개발자 확인 | [Verify your developer identity information](https://support.google.com/googleplay/android-developer/answer/10841920?hl=en) | 계정 유형별 신원·연락처·조직 정보를 확인하고, 새 개인 계정은 실제 Android 기기 확인이 필요할 수 있다. |
| 패키지 등록 | [Registering Play package names](https://support.google.com/googleplay/android-developer/answer/16984799?hl=en) | 2026-09-30부터 모든 Play 패키지는 확인된 개발자에게 등록되어야 한다. |
| 콘텐츠 등급 | [Content rating requirements](https://support.google.com/googleplay/android-developer/answer/9859655?hl=en) | 새 앱은 IARC 콘텐츠 등급 설문을 정확히 완료한다. |
| 앱 서명 | [Sign your app](https://developer.android.com/studio/publish/app-signing) | 새 Play 앱은 Play App Signing을 구성하고 업로드 키로 서명한 AAB를 올린다. |

## Expo

| 주제 | 공식 URL | 2026-07-27 적용 요약 |
| --- | --- | --- |
| SDK 54 플랫폼 기준 | [Expo SDK 54 reference](https://docs.expo.dev/versions/v54.0.0/) | SDK 54는 Android compile/target API 36이며 Xcode 16.1 이상을 지원한다. |
| Xcode 26 EAS 이미지 | [Build server infrastructure](https://docs.expo.dev/build-reference/infrastructure/) | `sdk-54`/기본 자동 선택에 Xcode 26 이미지가 제공되며 실제 빌드 로그에서 선택 이미지를 확인해야 한다. |
| 프로덕션 빌드 | [Build your project for app stores](https://docs.expo.dev/deploy/build-project/) | 기본 Android 프로덕션 산출물은 AAB이며, 스토어 계정과 서명 자격증명이 필요하다. |
| 버전 관리 | [App version management](https://docs.expo.dev/build-reference/app-versions/) | `version`, `android.versionCode`, `ios.buildNumber`를 관리하며 remote source와 auto-increment 사용이 권장된다. |
| 제출 동작 | [Submit to app stores](https://docs.expo.dev/deploy/submit-to-app-stores/) | EAS Submit은 바이너리를 업로드하지만 기본적으로 스토어 메타데이터·스크린샷·출시 노트를 관리하지 않는다. |
| iOS 제출 | [Submit to the Apple App Store with EAS Submit](https://docs.expo.dev/submit/ios/) | `.ipa`를 App Store Connect/TestFlight에 올린 뒤 App Store Connect에서 별도로 App Review에 제출한다. |
| Android EAS 제출 | [Submit to the Google Play Store with EAS Submit](https://docs.expo.dev/submit/android/) | Play 앱 레코드와 EAS의 Google 서비스 계정 키가 준비되면 첫 제출도 기본 internal testing track에 만들 수 있다. |
| Android 수동 제출 | [Manually submit an Android app](https://docs.expo.dev/submit/android-manual/) | 첫 AAB의 수동 업로드는 선택 사항이며, 선택 시 Play App Signing, 고유 versionCode, 내부 테스트와 나머지 대시보드 작업을 완료한다. |
| Apple Privacy Manifest | [Privacy manifests](https://docs.expo.dev/guides/apple-privacy/) | required-reason API를 사용하는 라이브러리의 `PrivacyInfo.xcprivacy`를 최종 아카이브에서 점검한다. |
| Expo Push Service | [Send notifications with Expo Push Service](https://docs.expo.dev/push-notifications/sending-notifications/) | Expo push token과 알림 payload가 Expo를 거쳐 APNs/FCM으로 전달되며 receipt를 확인해야 한다. |
| Push 데이터 처리 | [Push notifications FAQ](https://docs.expo.dev/push-notifications/faq/) | Expo는 알림 내용을 전달에 필요한 기간보다 오래 저장하지 않는다고 설명하며, push token 폐기 처리가 필요하다. |

## 재검증 규칙

- 제출일이 2026-08-31 이후이면 Google API 36 규칙을 다시 확인한다.
- 제출일이 2026-09-30 이후이면 Play 패키지 등록 상태를 반드시 확인한다.
- Apple `Upcoming Requirements`, Google Target API 및 Play 정책 변경 공지는 제출 직전 다시 확인한다.
- Expo EAS의 `auto` 이미지는 변할 수 있으므로 빌드 로그에 기록된 Xcode/SDK/Gradle/target API를 증거로 저장한다.

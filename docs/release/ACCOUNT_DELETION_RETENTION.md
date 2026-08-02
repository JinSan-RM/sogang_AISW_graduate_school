# 계정 삭제 및 데이터 보존 정책

기준일: 2026-07-27\
구현 상태: 로컬 코드·DB·API 테스트 `PASS`\
출시 상태: 공개 URL, 운영 처리자·백업 정책, 법적 고지 승인 `BLOCKED_EXTERNAL`

## 결론

현재 구현은 비활성화가 아니라 되돌릴 수 없는 hard delete다.

- 인증 사용자는 `DELETE /api/users/me`에 `current_password`를 보내며 서버가 비밀번호를 검증한다.
- 로그인할 수 없는 사용자는 공개 이메일 request/verify API에서 학교 이메일 코드와 현재 비밀번호를 검증한다. 요청 응답과 검증 오류는 계정 존재 여부를 노출하지 않는다.
- user row와 계정 PII, sessions/tokens, 반응·검색·신고·차단·알림 기록, 비공개·초안·숨김·상호부조 콘텐츠, 비공개 및 보존 대상이 아닌 media row/file을 삭제한다.
- 활성 공개 게시글·댓글은 커뮤니티 맥락을 위해 본문만 남기고 `author_id`를 null로 만든다. 필요한 공개 첨부는 `owner_id`와 원본 파일명을 익명화한다.
- migration `0021_account_deletion_receipts`는 UUID, channel, completed result, timestamp만 저장한다. 사용자 ID, 이메일, IP 주소, 사유, 삭제 건수는 저장하지 않는다.
- 관리자 계정은 운영 책임을 이전하고 다른 관리자가 일반 사용자로 변경하기 전에는 스스로 삭제할 수 없다.

이 문서의 `public published content` 또는 “활성 공개 콘텐츠”는 비공개·초안·숨김·상호부조 신청이 아닌 게시 완료 콘텐츠를 뜻한다. 앱 전체는 회원 전용이므로 “public”이 비로그인 콘텐츠 접근을 뜻하지는 않는다.

이 로컬 구현과 104-test DB 회귀는 통과했지만, Google에 등록할 공개 HTTPS 삭제 URL, 실제 SMTP/hosting/storage/backups, 법적 고지와 승인된 보존 기간은 외부 차단 상태다.

## 현재 사용자 계약

최종 문구는 법무 승인을 받아야 하며 최소 다음 사실을 정확히 말해야 한다.

1. 사용자는 앱 설정에서 현재 비밀번호를 재입력하고 계정 삭제를 즉시 완료할 수 있다.
2. 앱에 로그인할 수 없는 사용자는 guest-visible 페이지에서 이메일 코드와 현재 비밀번호로 삭제할 수 있다. production에서는 이 페이지를 공개 HTTPS로 호스팅해야 한다.
3. 재인증과 명시적 확인은 오삭제 방지에만 사용하며, 완료 후 계정은 복구할 수 없다.
4. 같은 transaction에서 user row, session/token, private activity와 private content를 제거한다.
5. 공개 published 콘텐츠는 작성자를 식별할 수 없도록 연결을 제거한 뒤에만 유지한다.
6. 완료 응답은 식별정보 없는 receipt ID와 완료 시각을 반환한다.
7. receipt 만료와 backup lifecycle에는 코드가 임의의 법적 기간을 부여하지 않는다. 운영자가 법적 근거·목적·기간·접근자·파기 방법을 승인해야 한다.

## 구현 처리 순서

| 단계 | 서버 동작 | 실패 처리/증거 |
| --- | --- | --- |
| 1. 재인증 | 현재 password 또는 승인된 강한 재인증을 backend에서 검증 | UI 사전 검증만 신뢰하지 않음; rate limit |
| 2. 확인 | 앱이 삭제·익명화 범위를 표시하고 destructive confirmation을 받음 | public flow는 이메일 코드도 검증 |
| 3. 파일 staging | 삭제 대상 파일을 API에서 접근할 수 없는 `.account-delete` 임시명으로 원자 이동 | DB 실패 시 원위치 복구 |
| 4. 본 삭제 | 아래 disposition matrix에 따라 DB row 삭제·public content 익명화 | 하나의 DB transaction |
| 5. user hard delete | FK 정리 뒤 `users` row 삭제 | 기존 access token은 이후 사용자 조회에서 `401` |
| 6. receipt 기록 | 식별정보 없는 완료 receipt를 같은 transaction에 기록 | channel과 completed timestamp만 보존 |
| 7. file finalize | commit 뒤 staged file 삭제 | 실패 시 startup cleanup이 재시도 |
| 8. 완료 응답 | `deleted`, receipt ID, completion timestamp 반환 | 처리되지 않은 상태에서 완료를 반환하지 않음 |

transaction이 실패하면 DB rollback과 staged-file 원복을 수행한다. 외부 처리자·backup에 대한 삭제 전파는 실제 production topology가 확정된 뒤 운영 절차로 검증해야 한다.

## 데이터 disposition matrix

기간과 법적 근거는 임의로 채우지 않는다.

| 데이터 | 현재 관계/위험 | 기본 목표 | 보존 예외 | 상태 |
| --- | --- | --- | --- | --- |
| `users` 계정·프로필·password hash | account PII | transaction에서 user row hard delete | 없음이 현재 코드 기본 | `PASS` |
| refresh/password-reset tokens | 계정 인증정보 | delete | 없음 | `PASS` |
| email verification tokens | email 문자열로 연결, FK 없음 | 해당 email token delete | 없음 | `PASS` |
| public published posts/comments | 커뮤니티 맥락 | 본문 유지, `author_id=NULL`, `Deleted user` 표시, count 재계산 | 사용자 연결 없는 공개 콘텐츠 | `PASS` |
| private/draft/hidden/deleted posts와 comments | 비공개 또는 비활성 UGC | delete | 없음 | `PASS` |
| suggestions/mutual-aid metadata | private workflow 포함 | 비공개 parent post와 함께 delete | 없음 | `PASS` |
| likes/bookmarks/blocks/reports | user activity | delete | 없음 | `PASS` |
| search history | user activity | delete | 없음 | `PASS` |
| notifications/settings | user activity | 소유 notification/settings delete; 타 사용자 메시지의 nickname scrub | 없음 | `PASS` |
| push tokens/deliveries | token과 snapshot | delete | 없음 | `PASS` |
| retained public media | 공개 post attachment | owner unlink, original filename anonymize | 공개 맥락 유지 | `PASS` |
| private/non-retained media | DB metadata와 실제 file | transaction staging 후 row/file delete | 없음 | `PASS` |
| operational audit logs | actor/target/details | user link 제거, user target details 제거 | 운영 로그 자체 기간은 외부 승인 | `PASS` / `BLOCKED_EXTERNAL` |
| rate-limit bucket | email/user hash | account-linked subject delete | 인프라 IP 로그는 별도 | `PASS` |
| application/proxy logs | production 미정 | PII 최소화와 자동 만료 | `[BLOCKED_EXTERNAL]` | `BLOCKED_EXTERNAL` |
| DB/media backups | production 미정 | lifecycle 만료 후 완전 제거, 일반 복구 금지 | `[BLOCKED_EXTERNAL: 기간]` | `BLOCKED_EXTERNAL` |
| 삭제 완료 receipt | UUID/channel/result/time만 저장 | 승인된 기간 후 purge 가능 | 기간은 privacy owner 승인 필요 | `PASS` / `BLOCKED_EXTERNAL` |

## FK·파일 처리 주의사항

- migration `0020`은 public content 익명화를 위해 post/comment/media owner FK를 nullable `SET NULL`로 바꾸고 like/bookmark user FK는 `CASCADE`로 바꾼다.
- service는 private post와 media row/file을 명시적으로 삭제하며 attachment cascade만 신뢰하지 않는다.
- private asset이 legacy public directory에 남아 있을 가능성까지 포함해 두 위치를 staging/delete한다.
- “익명 작성” 게시글도 삭제 전에는 실제 author ID와 연결돼 있으므로 public/private 판정 후 같은 규칙을 적용한다.
- `OperationalAuditLog`, notification message, push delivery snapshot, rate-limit hash 등 간접 연결을 명시적으로 정리한다.
- post like/comment count를 재계산한다. 실제 production에 CDN/search cache가 추가되면 삭제 무효화 절차도 추가해야 한다.

## 외부 웹 삭제 리소스

Google Play에 넣을 공개 URL: `[BLOCKED_EXTERNAL]`

필수 조건:

- 공개 HTTPS이며 비로그인 상태에서 페이지가 열린다.
- 스토어의 정확한 앱명/개발자명을 표시한다.
- 사용자가 앱 재설치 없이 요청할 수 있다.
- 계정 확인은 최소한으로 하고 password를 저장하거나 로그에 남기지 않는다.
- 삭제 대상, 보존 예외, 완료 예상 시간, 문의 방법을 제공한다.
- 요청 후 모호한 “비활성화 완료”가 아니라 접수/완료 상태를 구분한다.

Expo Router의 `/legal/account-deletion` 화면과 request/verify API는 구현됐고 local production-web deep-link 검증을 통과했다. 하지만 production web hosting, public DNS/TLS, API CORS, SMTP delivery, rate limiting, abuse monitoring을 live 환경에서 검증해야 한다. 로컬 route 존재만으로 Google 외부 리소스 요건을 충족했다고 표시하지 않는다.

## API 응답 계약 초안

```json
{
  "status": "success",
  "data": {
    "deleted": true,
    "receipt_id": "c2467e45-494d-4e9a-b0cc-39a920a80d85",
    "completed_at": "2026-07-27T08:15:00"
  }
}
```

`deleted: true`는 DB commit이 완료된 뒤에만 반환한다. response와 receipt에는 삭제된 사용자 ID나 건수 정보를 포함하지 않는다.

## 검증 시나리오

- 잘못된 password와 만료/탈취 access token으로 삭제할 수 없다.
- public request는 known/unknown account에 같은 응답을 반환하며 code/password/account 오류를 하나의 generic error로 처리한다.
- 완료 뒤 기존 access/refresh token과 모든 기기의 push token을 사용할 수 없다.
- 삭제 후 login, refresh, password reset으로 계정을 복구할 수 없다.
- user ID/email/nickname로 모든 관계 테이블을 조회해 허용되지 않은 row가 0이다.
- public/private storage와 CDN/cache에 파일이 없다.
- Expo/APNs/FCM으로 더 이상 해당 token에 알림을 보내지 않는다.
- 익명/일반 게시글과 댓글 모두 승인된 정책대로 처리된다.
- production backup lifecycle에서 삭제 계정이 일반 서비스로 재노출되지 않는지는 외부 운영 검증 항목이다.
- 앱 내부와 외부 웹 경로 모두 screen reader와 keyboard로 완료 가능하다.
- privacy policy, App Privacy, Data safety, UI 안내가 실제 처리와 일치한다.

## 완료 승인

| 승인 | 값 |
| --- | --- |
| 법률 근거·보존 기간 승인자 | `[BLOCKED_EXTERNAL]` |
| 개인정보책임자 | `[BLOCKED_EXTERNAL]` |
| backend 구현 | `account_deletion.py`, auth/users routers |
| migration/cleanup | `0020_account_hard_delete`, `0021_account_deletion_receipts`, startup staging/receipt cleanup, daily worker receipt expiry cleanup |
| 통합 테스트 결과 | `PASS` — 2026-07-27 SQLite/PostgreSQL 104/104 suites에 포함 |
| production deletion drill | `[NOT_RUN]` |
| local UI/API 문구 동기화 | `PASS` |
| public URL·스토어 선언 동기화 | `[BLOCKED_EXTERNAL]` |

## 공식 근거

확인일: 2026-07-27

- [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Apple App Review Guidelines 5.1.1](https://developer.apple.com/app-store/review/guidelines/)
- [Google account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [Google User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)

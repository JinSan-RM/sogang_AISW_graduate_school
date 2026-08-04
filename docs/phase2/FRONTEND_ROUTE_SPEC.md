# Phase 2 Frontend Route and Screen Spec

2026-07-05 override: the AISW policy definition makes the app member-only. `/auth/login`, `/auth/register`, `/auth/password-reset`, `/legal/terms`, `/legal/privacy`, `/legal/support`, and `/legal/account-deletion` are guest-visible screens. Signup/email-verification, password recovery, public account-deletion request/verify, refresh, and registration-option API calls support those screens. All tab, board, post, search, event, FAQ, guide, notification, settings, and admin routes require an authenticated session.

Status: implemented baseline, checked 2026-07-27

## 1. Navigation Shape

The 2026-07-27 implementation baseline follows the current `AISW UI.pdf` and uses five bottom-tab areas plus auth and content stacks:

- Auth stack
- Home
- Notices
- Community
- Participation
- Student Council

My Page/Settings opens from the profile action rather than a sixth bottom tab. Do not collapse Notices into Home without a new product decision.

## 2. Route Map

| Screen ID | Route | Purpose | Auth |
| --- | --- | --- | --- |
| `S_017` | `/auth/login` | Login | guest |
| `S_018` | `/auth/register` | Signup | guest |
| `S_019` | `/auth/password-reset` | Password reset | guest |
| Legal | `/legal/terms` | Terms of service | guest |
| Legal | `/legal/privacy` | Privacy policy | guest |
| Legal | `/legal/support` | Support and privacy contact | guest |
| Legal | `/legal/account-deletion` | Public email request/verify deletion and completion state | guest |
| Home | `/(tabs)/home` | Quick menu, latest notices, upcoming schedule | user |
| Notices | `/(tabs)/notices` | Notice category list entered from Home | user |
| Community hub | `/(tabs)/community` | Event album and resource sharing | user |
| Participation hub | `/(tabs)/participation` | Club, study, networking, and activity certification | user |
| Student council hub | `/(tabs)/council` | Council content, suggestion, mutual aid, FAQ | user |
| Settings hub | `/(tabs)/settings` | Profile/settings entry | user |
| `S_001` | `/board/[boardId]` | Board post list | user |
| `S_002` | `/board/post/[postId]` | Post detail | user |
| `S_003` | `/board/post/create?boardId=` | Create post | user/admin |
| `S_003` | `/board/post/edit/[postId]` | Edit post | owner/admin |
| `S_006` | `/events/calendar` | Calendar | user |
| `S_006A` | `/events/day/[date]` | Events for the selected calendar date | user |
| `S_007` | `/events` | Event list | user |
| `S_011` | `/faq` | FAQ accordion | user |
| `S_013` | `/settings/profile` | Profile edit | user |
| `S_014` | `/settings/notifications` | Notification settings | user |
| `S_015` | `/settings/account` | Account settings | user |
| `S_016` | `/settings/activity` | My activity | user |
| Search | `/search` | Global search | user |
| Admin | `/admin` | Launch-critical content and account administration | admin |

The root layout must guard all member routes and must guard `/admin` by role. The UI guard is navigation hygiene only; every admin mutation also uses a backend admin dependency.

## 3. Home Screen Requirements

Sections:

- Quick menu for P0 flows.
- Latest pinned notices.
- Upcoming schedule.
- Recent community posts.

Quick menu:

- Academic notices
- Event notices
- Calendar
- Lecture reviews
- Exam archive
- Suggestions

The Home schedule card changes its displayed month and `GET /events` range in place when the previous/next arrows are pressed. Empty upcoming-schedule copy is not interactive. Multi-day events mark every KST calendar date from `start_at` through `end_at`, inclusive, in both the Home card and full calendar; day routes rely on the same overlap behavior from the events API.

## 4. Board List Screen Requirements

Community tab opens the `event-album` board when available and exposes `행사 사진첩 / 자료공유` as section tabs. Resource sharing offers `강의후기`, `시험족보`, `종합시험`, and `졸업논문`; `graduation-thesis` is a member-writable resource board. Participation activity certification uses a source-post selection sheet instead of free-text activity names.

The participation club and networking guide lists are backed by `club-promo` and `networking-programs`. Only admins see their create entry points. Create/edit requires a representative image and an HTTP(S) participation URL; detail binds the `가입 신청` or `참가 신청` button to that URL.

Board and post back navigation never uses the hidden `/(tabs)/boards` screen as a user-facing destination. A post opened from a board records that board as its origin and returns to the same list; a directly opened post falls back to its own `/board/[boardId]` list. Android hardware back uses the same rule. Leaving a standalone board returns to its product hub, while legacy community boards such as `community-major` return to Home because they are entered there.

Study recruitment is backed by `study-recruit` and remains writable by every authenticated member, including recruitment status and contact metadata.
The recruitment list follows the approved Figma text-row layout: status pill, title, up to two preview lines, and `cohort + author · YY.MM.DD(weekday)`. It does not use the image-heavy club/networking guide card and does not show reaction counts in the list.

Club, study, and networking activity certification remains available to every authenticated member. The create flow supports multiple image previews, activity date, account, and participant inputs, followed by a dedicated completion state. The edit flow reuses the same calendar and eligible-member participant picker, hydrates the stored date, participant chips, source post, and attachments, and preserves the hidden account value when the author saves. Detail supports image paging; account data is rendered only for admins.

Council content is managed by admins except suggestion and mutual-aid submissions. Admins manage executive name/cohort/role/profile images from the executive section. Notice create/edit can opt into council activity-history linkage; linked notices reuse their title, body, date, and image attachments in the council list and detail screens.

Mutual-aid lists and search results show only the signed-in member's own requests (admins see all), use processing/completed/rejected status pills, require private evidence, allow the remarks field to be left empty, and end creation on a dedicated completion screen. Its calendar disables every date before KST D+2, opens on the first selectable month when necessary, and displays the first selectable date beside the field. Submission repeats the validation and maps the server's `MUTUAL_AID_DATE_TOO_SOON` response to the same user-facing guidance. Opening another member's request, comments, or attachments by guessed ID must render the same not-found state as a missing object.
The admin console has a dedicated mutual-aid queue with processing/completed/rejected filters. Opening a request exposes the private evidence to admins and allows `processing`, `completed` (shown as `처리 완료`), or `rejected`; rejection requires a reason.
Suggestion lists use `대기중` and `답변완료` status pills and preserve anonymous presentation. Creation ends on a dedicated completion screen. The admin console has a suggestion queue where admins open a suggestion and write the official reply; saving a reply marks it answered and notifies the author.
The admin console has a cohort-leader section for managing multiple cohorts, captain/vice-captain names, greeting, introduction, representative image, and profile images. The member council screen reads this structured metadata and keeps legacy post parsing only as a fallback.
Past councils and FAQ are separate admin sections. Past councils render a council-number list and member/activity detail tabs from `past_councils` metadata; FAQ renders from its dedicated API and table.

Notification delivery surfaces:

- iOS/Android register an Expo push token using the EAS project ID; Android creates the `default` notification channel before permission/token requests.
- Web polls the authenticated notification API and can show the browser Notification API while the site is open after explicit browser permission.
- Closed-site background web push is not provided by `expo-notifications`; it requires a separate service worker, VAPID keys, and web-push provider.
- Logout deactivates the current native push token before clearing the session.

Required controls:

- Search input.
- Filter menu when board supports categories/status.
- Sort menu: latest, popular, views.
- Floating create button when user has write permission.

Presentation rules from the approved Figma capture set:

- Community, notice, My Posts/Scrap, council, mutual-aid, and activity-feed dates use `YY.MM.DD(weekday)` in Korean, calculated in `Asia/Seoul`.
- Comment metadata appends `· N분 전` for activity under one hour and `· HH:mm` afterward.
- Activity-certification date inputs, feeds, and details use `YY.MM.DD(weekday)`. Certification feeds use the selected activity date, falling back to the post creation date only for legacy data.
- Schedule day headers use `YY.MM.DD(weekday)`, rows use `HH:mm`, and schedule detail metadata uses `YY.MM.DD(weekday) · HH:mm`.
- Home schedule summaries use `MM.DD(weekday)`.
- Home banners are image-only assets registered by an administrator. The app renders the selected responsive image without synthesized title, badge, description, deadline, theme overlay, or gradient; only the carousel page indicator and optional navigation link remain app UI.
- Notification rows are an explicit exception: today's items use `오전/오후 h:mm`, and older rows use `YY.MM.DD` without a weekday.
- Council activity-history rows contain date and title only; their detail contains title, divider, and body without reactions or comments.
- Mutual-aid member list status labels are `처리중`, `완료`, and `반려`.

States:

- Loading skeleton.
- Empty state.
- Error state with retry.
- Guest write attempt routes to login.

## 5. Post Detail Requirements

Required sections:

- Title.
- Board/category metadata.
- Author display, respecting anonymous rules.
- Body.
- Attachments.
- Like/bookmark actions for logged-in users.
- Comments and replies.
- Edit/delete actions for owner/admin. Destructive comment confirmation is rendered in-app so the delete request works consistently on native and web.
- Pin action for admin.

Resource-board exceptions:

- `lecture-reviews` keeps forced-anonymous presentation and has no comments.
- `exam-archive` shows the cohort/author and supports comments as shown in the latest approved Figma capture.
- Comment rows display `cohort + author`, content, and `YY.MM.DD(weekday) · N분 전` for recent comments or `YY.MM.DD(weekday) · HH:mm` afterward when the author still exists.

## 6. Create/Edit Requirements

Required fields:

- Title.
- Content, except optional mutual-aid remarks.
- Attachments when supported.
- Anonymous option when board allows.
- Type-specific metadata.
- Club guide metadata: administrator-managed participation URL.

Required behavior:

- Local draft autosave is a deferred P1/v1.1 item and is not required for the Phase 5 entry gate.
- Validate required title and content while allowing mutual-aid remarks to remain empty.
- For mutual-aid creation, accept only `Asia/Seoul` today + 2 calendar days or later. Recompute the boundary at submission time; do not rely only on disabled calendar cells.
- Prevent duplicate submit.
- Show upload progress when attachments exist.

## 7. Auth Screens

Login:

- Email.
- Password.
- Login button.
- Register link.
- Password reset link.

Register:

- Step 1: school email verification.
- Step 2: six-digit email verification code.
- Step 3: name/nickname, cohort, active major, phone, password/confirmation, and current privacy-policy consent.
- Major options and privacy-policy version come from the public registration-options API and are managed by admins.
- Privacy consent opens the same full document used by the My Page legal screen. The sheet cannot close until the user reaches the end; returning to signup does not auto-check consent, so the user still makes an explicit checkbox choice.

Password reset:

- Email request.
- Reset token confirmation.
- New password.

Find ID decision:

- Email is the only login ID, so v1 does not add a separate ID-discovery API or screen.
- Login and recovery copy should direct the user to their `@sogang.ac.kr` email and password reset.

## 8. Settings Screens

Profile:

- Name/nickname and cohort are read-only identity fields.
- Major is selected from currently active administrator-managed options.
- Phone.
- Company/job fields if retained.
- Profile image.

Notifications:

- Comment.
- Like.
- Notice.
- Event.

Account:

- Password change.
- Logout.
- Irreversible account deletion with current-password input, explicit acknowledgement, error recovery, and completed-session cleanup.

Public account deletion:

- The guest route first requests a six-digit school-email code without disclosing whether the account exists.
- Verification requires email, code, current password, and the exact destructive-action confirmation phrase.
- The page distinguishes request, verification, and completion states, but intentionally does not distinguish unknown account, wrong code, or wrong password errors.
- The copy states that private/draft/hidden/mutual-aid content and private data are deleted, while retained public published content is disconnected from the author.
- The same route can show the completion state after authenticated deletion and links back to login/privacy.

My activity:

- My posts.
- My comments.
- Bookmarks.
- Header and Android hardware back return to `/(tabs)/settings` so opening My activity from the profile drawer never falls through to the previously visible main tab.

## 9. Design Gate

Before frontend expansion, Figma should provide:

- Colors.
- Typography.
- Button/input/card/list item components.
- Home.
- Login/register/password reset.
- Board list.
- Post detail.
- Create/edit.
- Calendar.
- FAQ.
- Settings/profile.
- Search.

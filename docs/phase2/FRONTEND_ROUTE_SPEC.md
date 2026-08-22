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
| Admin | `/admin` | Launch-critical content, account, and independent dues-payer-roster administration | admin |

The root layout must guard all member routes and must guard `/admin` by role. The UI guard is navigation hygiene only; every admin mutation also uses a backend admin dependency.

## 3. Home Screen Requirements

Sections:

- Quick menu for P0 flows.
- Latest two notices across every active notice board, ordered by creation time without pin priority.
- Upcoming schedule.
- Recent community posts.

Quick menu:

- Academic notices
- Event notices
- Calendar
- Lecture reviews
- Exam archive
- Suggestions

The Home schedule card changes its displayed month and `GET /events` range in place when the previous/next arrows are pressed. Empty upcoming-schedule copy is not interactive. Multi-day events mark every KST calendar date from `start_at` through `end_at`, inclusive, in both the Home card and full calendar; day routes rely on the same overlap behavior from the events API. A day route opened from the Home schedule returns directly to the existing Home tab when its header back control is pressed instead of popping the hidden events stack; other event-entry back behavior remains unchanged.

QA 161: Home, Notices, and shared board lists refresh through native pull gestures while retaining cached content, current filters/search, and scroll-rendering keys. Protected media access URLs do not refresh on a timer; `MediaImage` and `MediaImageBackground` explicitly refresh them after an image load error. Notification delivery and bootstrap refresh continue independently of the removed Home badge poll.

QA 173: Explicitly pressing an inactive Notices, Community, or Participation bottom tab recreates that tab root at its product default and the top of the list: `전체`, `행사 사진첩`, or `동아리 > 안내`, respectively. Repressing the already-active tab does not reset it. Header/Android Back from detail routes and programmatic My Page returns do not emit this reset and continue preserving the mounted list state described below.

## 4. Board List Screen Requirements

Community tab opens the `event-album` board when available and exposes `행사 사진첩 / 자료공유` as section tabs. Resource sharing offers `강의후기`, `시험족보`, `종합시험`, and `졸업논문`; `graduation-thesis` is a member-writable resource board. Exam-archive list rows show the author cohort/name alongside the post date, while lecture-review and suggestion anonymity remains unchanged. The resource post edit screen exposes a board picker limited to these active resource boards, and moving a post preserves its existing detail URL and related content. After a move, the target resource board is authoritative for the post tag across the resource list, post detail, and My Activity, so a stale stored category must never override the target board label. The `comprehensive-exam` and `graduation-thesis` detail more menus omit the author-block action while preserving report and owner actions; existing blocks and block-based filtering remain global. Participation activity certification uses the existing source-post selection sheet instead of free-text activity names and loads every published `club-promo` page. The new club picker shows only SG_LLM, 알바트로스냅, 서강의 봄, 서뽈링, 서강와인, 인간지능투자, and FC리턴윈 in that order, selecting each club's newest guide by `created_at` with ID as the tie-breaker rather than using pin order. All legacy club posts and existing certification links remain readable and unchanged, and study/networking source selection is unchanged. List/detail tags prefer the API's canonical `activity_source_title`, then use stored category or legacy metadata only as a historical fallback. Renaming a guide updates existing certification tags, while retiring it removes it from new choices but preserves the last official name on linked history. This behavior does not change the current UI structure, styling, or copy.

The participation club and networking guide lists are backed by `club-promo` and `networking-programs`. Only admins see their create entry points. Create/edit requires a representative image and an HTTP(S) participation URL; detail binds the `가입 신청` or `참가 신청` button to that URL.

Board and post back navigation never uses the hidden `/(tabs)/boards` screen as a user-facing destination. A post opened from a stateful app list carries a validated internal `returnTo`; header back and Android hardware back navigate to the already-mounted list screen, preserving participation section tabs, board filters, search/sort state, and scroll position. Allowed return targets are limited to the app's home, notice, community, participation, council, search, notification, My Activity, and positive board-ID routes. This applies consistently to study, club, networking, notices, community, search, notification, and My Activity detail entry. Without a valid `returnTo`, normal history is used; a directly opened post with no usable history falls back to a valid recorded `fromBoardId` list when present, otherwise to the post board's product hub. Leaving a standalone board returns to its product hub, while legacy community boards such as `community-major` return to Home because they are entered there.

Study recruitment is backed by `study-recruit` and remains writable by every authenticated member, including recruitment status and contact metadata.
The common post edit screen always shows persistent `제목` and `내용` labels above their inputs so existing values never obscure each field's purpose; these labels do not depend on board lookup or slug detection.
The recruitment list follows the approved Figma text-row layout: status pill, title, up to two preview lines, and `cohort + author · YY.MM.DD(weekday)`. It does not use the image-heavy club/networking guide card and does not show reaction counts in the list.

Club, study, and networking activity certification remains available to every authenticated member. The create and edit forms keep `활동 사진` and `활동 소감` labels visible independently of their current values. Their activity calendars allow only KST today and past dates, disable navigation beyond the current KST month, and repeat the same future-date validation before submission; this maximum-date rule does not apply to non-certification calendars such as mutual aid. The create flow supports multiple image previews, activity date, required account, and participant inputs, followed by a dedicated completion state. Their single shared subsidy-participant picker searches the independent current dues-payer roster by name or student number and displays `name major student_number` with spaces; it never queries member accounts or auto-selects the author. The edit flow reuses the same calendar and roster picker, hydrates current participant IDs or historical name-only chips, source post, and attachments, but never hydrates the private stored account into the client. Its account field remains editable and optional: leaving it blank preserves the hidden stored account, while entering a new non-empty value replaces it. A changed legacy participant list requires complete roster reselection. Detail supports image paging; account data is rendered only for admins.

The admin console exposes one Board Management entry. It groups every board as All, Notices, Community/Resources, Participation, or Council, then selects an actual board and either Content or Settings. Board-type content editors stay in the selected board instead of navigating to separate notice, suggestion, mutual-aid, council-introduction, FAQ, or calendar sections. Existing slugs, categories, board types, privacy policies, content formats, APIs, and server-side admin authorization remain unchanged. `club-promo` and `networking-programs` cards additionally show the current representative-image thumbnail and allow an administrator to replace the first image attachment in place while preserving the post body, participation URL metadata, deadline, anonymity, and every other attachment. This uses the existing media and post-update APIs and requires no database schema change.

The admin console includes a separate `원우회비` tab. It uploads a headerless three-column XLSX using student-number upsert, searches the current roster, paginates the result, shows atomic validation failures without partial changes, and requires `start -> irreversible warning -> exact 진짜 삭제 phrase` before permanent deletion. Member-account cards no longer display or mutate a dues status.

Council content is managed by admins except suggestion and mutual-aid submissions. The current-council route opens its single introduction directly, while cohort leaders and past councils use an admin-created summary list followed by a selected detail screen. All three detail views share the same representative-image, greeting, introduction, and variable-length fixed-profile-card layout. Admins edit the single current-council introduction and can add, edit, reorder through list order, and delete cohort/past organization cards and all member cards; each member includes name, cohort, role, and an optional profile image. Notice create/edit can opt into council activity-history linkage; linked notices reuse their title, body, date, and image attachments in the council list and detail screens.

Mutual-aid lists and search results show member-readable request content with processing/completed/rejected status pills, require private evidence, allow the remarks field to be empty, and end creation on a dedicated completion screen. Evidence filenames, links, previews, open controls, and downloads are administrator-only. A requester edit receives only the boolean `mutual_aid.has_evidence`; it can retain the protected evidence without seeing it or replace it by submitting a new file/link. Its calendar disables only dates before KST today, opens on the first selectable month when necessary, and maps `MUTUAL_AID_DATE_TOO_SOON` to the same guidance. Processing requests expose edit/delete, completed requests expose neither, and rejected requests expose delete only. A non-admin guessed evidence media ID renders the same not-found state as a missing object.
The admin console has a dedicated mutual-aid queue with processing/completed/rejected filters. Opening a request exposes the private evidence to admins and allows `processing`, `completed` (shown as `처리 완료`), or `rejected`; rejection requires a reason.
Suggestion lists use `대기중` and `답변완료` status pills and preserve anonymous presentation. Creation ends on a dedicated completion screen. The admin console has a suggestion queue where admins open a suggestion and write the official reply; saving a reply marks it answered and notifies the author.
The admin console has a cohort-leader section for managing multiple cohorts, captain/vice-captain names, greeting, introduction, representative image, and profile images. The member council screen reads this structured metadata and keeps legacy post parsing only as a fallback.
Past councils and FAQ are separate admin sections. Past councils render a council-number list and member/activity detail tabs from `past_councils` metadata; FAQ renders from its dedicated API and table. Expanded FAQ answers render ordered protected image attachments at their natural aspect ratio.

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
- Home notice metadata uses `학사공지`, `행사공지`, or `기타공지`; webinar and special-lecture aliases are presented as `행사공지`, and raw codes such as `other` are never shown.
- Home banners are image-only assets registered by an administrator. The app renders the selected responsive image without synthesized title, badge, description, deadline, theme overlay, or gradient; only the carousel page indicator and optional navigation link remain app UI.
- Notice-detail and participation-detail images use the available full width and each image's natural aspect ratio so landscape and portrait images avoid internal letterboxing. When the calculated natural height exceeds 500px, the detail shows a top-anchored 500px preview with a `사진 전체보기` control that opens the complete image in a vertically scrollable in-app viewer. The threshold does not apply to council activity history, photo albums, mutual-aid evidence, general community attachments, or any list thumbnail; their existing image policies remain unchanged.
- Notification rows are an explicit exception: today's items use `오전/오후 h:mm`, and older rows use `YY.MM.DD` without a weekday.
- QA 153: lecture-review bookmarks in My Activity render only `YY.MM.DD(weekday)`; they omit `Anonymous`, cohort, and the author/date separator. Other bookmark metadata is unchanged.
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
- Selecting a top-level comment reply shows a compact composer target using the same visible `cohort + author` label followed by `님에게 답글`. The target strip never exposes the internal parent comment ID or `작성 중`; reply mode uses `답글을 남겨보세요`, and cancel or successful submission restores the ordinary comment composer.
- Root comments use thin dividers and two-depth replies use indented rounded neutral rows. Every comment keeps a right-aligned `신고` entry; owner rows place the applicable `답글`, `수정`, and `삭제` text actions on one compact line. Edit mode replaces the content with a primary-blue bordered field and shows only `저장` and `취소`.
- Post and comment reports use one bottom sheet with the ordered reasons `스팸/광고입니다`, `욕설 및 비방이 포함되어 있어요`, `허위 정보예요`, and `기타`. Selecting `기타` reveals the multiline detail field and requires nonblank detail before submission. Owner post/comment report attempts are blocked locally with explanatory feedback and never send a report request.
- Edit/delete actions for owner/admin. Destructive comment confirmation is rendered in-app so the delete request works consistently on native and web.
- Post and comment delete confirmations use centered rounded cards, neutral `취소`, destructive `삭제`, and explicit irreversible-deletion copy consistent with the approved mobile reference.
- Pin action for admin.

Resource-board exceptions:

- `lecture-reviews` keeps forced-anonymous presentation and has no comments.
- `exam-archive` shows the cohort/author and supports comments as shown in the latest approved Figma capture.
- Comment rows display `cohort + author`, content, and `YY.MM.DD(weekday) · N분 전` for recent comments or `YY.MM.DD(weekday) · HH:mm` afterward. After account deletion, the writing-time author/cohort snapshot remains visible; only historical orphan rows without any snapshot use `Deleted user`.

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
- For mutual-aid creation, accept `Asia/Seoul` today or later and reject past dates. Recompute the boundary at submission time; do not rely only on disabled calendar cells.
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
- The privacy checkbox toggles consent directly. Only the right chevron opens the same full document used by the My Page legal screen, and the sheet can close at any scroll position. Signup still requires explicit consent to the active privacy-policy version.

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
- Irreversible account deletion with current-password input, explicit acknowledgement, error recovery, and completed-session cleanup. After an authenticated deletion, the explicit `completed=1` state uses the compact approved completion UI (`탈퇴가 완료되었어요!`, `확인`) and returns to login without exposing the protected settings stack.

Public account deletion:

- The guest route first requests a six-digit school-email code without disclosing whether the account exists.
- Verification requires email, code, current password, and the exact destructive-action confirmation phrase.
- The page distinguishes request, verification, and completion states, but intentionally does not distinguish unknown account, wrong code, or wrong password errors.
- The copy states that private/draft/hidden/mutual-aid content and private data are deleted, while retained public published content is disconnected from the author.
- The same route distinguishes completion sources: authenticated `completed=1` uses the compact in-app completion state, while public email-code deletion keeps the detailed retention explanation and login/privacy links.

My activity:

- My posts.
- My comments.
- Bookmarks.
- Header and Android hardware back return to `/(tabs)/settings` so opening My activity from the profile drawer never falls through to the previously visible main tab.

My Page drawer return and avatar:

- QA 145-147: when the drawer opens, it records the mounted Home, Notices, Community, Participation, or Council origin. Profile, Notifications, and Account header Back and Android hardware Back use one guarded return action that explicitly reactivates that mounted origin and then reopens the drawer; unrelated settings history is ignored, and Home is used only without a valid origin. Reactivating the mounted tab preserves its nested list, filters, search/sort, and scroll state. Profile-save navigation remains unchanged.
- QA 148: a positive integer profile media ID or trimmed nonempty profile URL renders the profile image. Missing, blank, or invalid media renders `DefaultAvatarIcon`; no nickname initial, `?`, or other character fallback is rendered inside the avatar.

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

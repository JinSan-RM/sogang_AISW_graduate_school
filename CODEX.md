# Codex Work Backlog

This file turns the Notion Phase 1-4 planning into concrete work for coding agents.

## Immediate Goal

Use the Phase 2 contracts as the foundation, then execute Notion Phase 3 and Phase 4 as development sprints.

2026-07-05 policy alignment: implement against `정책_정의서_260705.pdf` and AISW UI/design PDFs where they are more specific than Phase 2. Content routes are member-only; guest access is limited to login, signup/email verification, password recovery, refresh, registration options, legal screens, and health/docs.

## Required Reading Before Coding

- Product plan: `PLAN.md`
- Agent rules: `AGENTS.md`
- API changes: `docs/phase2/API_CONTRACT.md`
- DB changes: `docs/phase2/DB_SCHEMA_DECISIONS.md`
- Auth and permissions: `docs/phase2/AUTH_PERMISSION_SPEC.md`
- Frontend routes/screens: `docs/phase2/FRONTEND_ROUTE_SPEC.md`

## Current Baseline

Already implemented or partially implemented:

- Boards, posts, comments, likes, bookmarks.
- Auth backend: login, register, email verification, refresh, logout, password reset.
- User profile backend.
- Search backend and global search screen.
- Media upload backend/client foundation.
- Events backend and list screen.
- FAQ backend and screen.
- Notifications backend, settings API, notification settings screen.

Known gaps:

- The 2026-07-27 current-worktree verification reached `0021_account_deletion_receipts`: 104/104 backend tests passed on both SQLite and isolated PostgreSQL. Clean migration, `0019`→head, `0021`→`0019`→`0021`, exact unversioned `0001` recovery, and unknown-schema fail-closed checks passed.
- Frontend verification passed 7/7 tests, typecheck, Expo Doctor 17/17, web export, and lint with zero errors and zero warnings. After the lockfile update, a clean `npm ci --legacy-peer-deps` install re-passed tests 7/7, typecheck, and lint 0/0.
- Local production Compose config/build, backend/worker/database health, UID 10001, readiness, guest/user/admin HTTP checks, one-shot worker, and web `/healthz` plus deep-link fallback passed. An isolated Windows short-path build also produced and validated an unsigned Android release AAB from the same 115 frontend source files; signed native artifacts and physical-device checks have not run.
- Backend `pip-audit` reports zero known vulnerabilities. After the safe `postcss` 8.5.18 update, frontend runtime dependencies (`npm audit --omit=dev`) report 33 affected entries: critical 0, high 19, moderate 14; the all-dependency audit reports 40: critical 0, high 26, moderate 14. The remaining automated remediation requires incompatible major overrides or a breaking Expo 57 / React Native 0.86 upgrade, so release remains blocked until the owner accepts the risk with a deadline or approves the upgrade.
- Production startup uses non-authoritative reference seeding: it creates no demo user, preserves operator edits, and leaves custom boards active. Deterministic demo credentials remain non-production-only. A production-only, advisory-lock-protected one-time command promotes an existing active member as the first administrator and records a detail-free audit event.
- CI declares `permissions: contents: read` and installs pinned `pip-audit==2.10.1` through `requirements-test.txt`; the daily worker receives the approved account-deletion receipt retention value and reports its cleanup count.
- Checksum-verified Gitleaks 8.30.1 found zero findings across 43 commits and 298 current non-ignored files, and CI now scans full history. The final signed artifact still needs an independent secret scan.
- Reproducible CycloneDX 1.6 SBOM and license review passed for the production backend image and frontend production tree: forbidden, strong-copyleft-only, and unknown licenses are all zero. Weak/file-level copyleft, dual-license, font exceptions, and final signed native notices remain artifact-level review items.
- Local Android release rehearsal: `:app:bundleRelease` succeeded after using a short CMake staging path; bundletool 1.18.3 validation passed, API 36 and 16 KB page alignment were confirmed, and the extracted unsigned AAB had zero Gitleaks findings. Its placeholder package/version and bundled localhost/development-client strings make it explicitly non-candidate evidence.
- A provider-neutral operational-alert adapter sends structured non-PII events for unhandled API exceptions, notification-worker failures, and push send/ticket/receipt failures. Production requires an approved HTTPS webhook in both backend and worker environments; provider setup and live alert delivery are deployment blockers.
- Mobile password reset screen exists.
- Profile edit and account management screens exist; profile image selection, protected upload, display, replacement, and removal are implemented.
- Post create/edit attachment linking and native document/image picking are implemented; upload-progress and physical-device edge cases remain Phase 5 QA.
- Calendar/list/detail routes, admin event CRUD, and idempotent D-day/D-1 notification hooks exist; recurring events are deferred to v1.1 and physical-device QA remains.
- Expo push token/provider integration, ticket/receipt logging, retry, and invalid-token cleanup exist. Production FCM/APNs credentials and physical-device delivery QA remain.
- Admin route now covers banners, launch-critical notice posts, board settings, accounts, the independent dues-payer roster, reports, FAQ, and events.
- My activity screen exists; guide cards are not fully implemented.
- Figma function-alignment pass 1-5 is implemented: five-tab IA (Home, Notices, Community, Participation, Student Council), direct community feed, private activity bank-account metadata, dedicated council notification setting, structured mutual-aid status/rejection workflow, activity source selection sheets, and study recruitment status/contact fields.
- Legacy Swing2App reconciliation now uses the cleaned article/comment workbooks, strict local `fileStorageId` attachment lookup, explicit dry-run/apply modes, isolated-target guards, idempotent source hashes, PII redaction, same-post content-hash deduplication, FAQ media links, author name/cohort snapshots, and an admin-only provenance ledger. Alembic head is `0025_author_content_snapshots`. Raw XLSX/CSV/attachment sources remain local-only because this repository is public and the files contain personal data.
- Board IA now includes legacy notice, webinar, academic schedule, alumni directory, GSA intro/cohort, and roadmap/benefit boards from the production app review.
- Post/report UX now includes post and comment report submission hooks plus admin report review/status handling.
- Author blocking API/UI is now implemented for post lists, comments, and search results.
- Admin user management now supports member search, role changes, and activation status changes.
- Design gate is intentionally deferred for Phase 3 UI polish.
- Native session persistence uses Expo SecureStore; web keeps the existing localStorage fallback.
- PostgreSQL-backed production rate limiting covers auth, reports, post/comment writes, and media upload.
- Protected local storage with signed access URLs is the v1 decision. Object storage is a future deployment enhancement, not a Phase 5 entry blocker.

## Launch Replacement Readiness

Updated: 2026-07-27

Goal: replace the existing Sogang app for day-to-day production use, then move into formal store release QA.

P0 already covered:

- Legacy production app IA was reviewed against the new board IA.
- Legacy Excel/CSV board data was imported into local Docker PostgreSQL.
- Authenticated member board browsing, post detail, comments, likes, bookmarks, search, notifications, events, FAQ, reports, and basic admin workflows exist.
- Admin can review reports, delete reported targets through protected APIs, manage events, and manage users.
- Users can block authors; blocked authors are hidden from post lists, comments, and search.
- Users can manage blocked authors from settings.
- Native/web document attachment picking is connected to media upload for post create and edit.
- Profile image selection, upload, save, display, and removal are connected.
- Admin can manage FAQ content from the app without direct DB edits.
- Admin can manage home banners, notice posts, board settings, and account status/roles from the app.
- Completed P0 Figma alignment: home/notice sample fallbacks were removed, home banners are administrator-uploaded image-only assets, and notice deadlines are driven by admin data with D-day display and notification dispatch.
- Completed P0 board-presentation alignment: member board dates follow the per-surface Figma matrix (`YY.MM.DD(weekday)` by default, schedule/home/notification exceptions documented in `docs/phase2/FRONTEND_ROUTE_SPEC.md`), activity feeds use the selected activity date, Past Council activity dates survive admin edits, and comment timestamps switch from recent minutes to `HH:mm` as captured. Study recruitment and council activity rows match the approved variants, while `lecture-reviews` remains anonymous and comment-free.
- Completed P0 privacy alignment: mutual-aid evidence uses private storage and short-lived signed downloads limited to administrators; members receive neither evidence metadata nor a usable direct media lookup.
- Completed P0 dues-payer alignment: participant eligibility no longer comes from member accounts. Admins upsert the independent current roster from a headerless XLSX with `name`, `major`, and `student number` columns, search it by name or student number, and use a three-step irreversible-delete flow. The shared subsidy activity-certification picker searches only this roster, while the API resolves every selected roster ID and stores participant-name snapshots.
- Completed P0 account/calendar alignment: password changes revoke refresh sessions, event categories match the mobile UI, and month-end event queries include the final day.
- Completed P0 account-deletion alignment: authenticated deletion requires the current password and the public email request/verify path is non-enumerating. User PII, sessions, likes, bookmarks, searches, notifications, and unattached uploads are deleted. All authored posts/comments and connected media remain regardless of visibility/status, their account links are cleared, and writing-time name/cohort snapshots preserve the author display. This includes mutual-aid applications and evidence. Migration `0021` records a non-identifying receipt; migration `0025` adds and backfills the author snapshots.
- Completed production bootstrap hardening: startup creates no demo credential and non-authoritative reference seeding preserves operator-managed content and custom boards. The first administrator must be an existing active member promoted once with the production-only advisory-lock-protected bootstrap command.
- Completed participation club alignment: only admins manage club guide posts, every club post requires a representative image, and admins configure the detail CTA through `metadata.application_url`.
- Completed activity-certification alignment: all authenticated members can submit image-only certifications, receive a dedicated completion state, page through detail images, and only admins can read the stored bank-account metadata.
- Completed participation write-policy alignment: study recruitment and every activity certification are member-writable; club/networking guide posts, representative images, and application CTA links are admin-managed.
- Completed council content alignment: only suggestions and mutual-aid submissions are member-writable; admins manage executive profiles/images and opt notice photo/text posts into the council activity history without duplicate content.
- Completed mutual-aid privacy/UI alignment: authenticated members can read application content, admins can review all private evidence, evidence is API-required, and non-admin detail/media responses never expose evidence filenames, links, or signed URLs.
- Completed P0 bug #28 alignment: mutual-aid remarks are optional end to end, while ordinary post content remains required by board-aware API validation.
- Completed web keyboard-submit alignment for bug-report items #52 and #53: Enter on the login password field runs the guarded login action; the multiline comment field submits on Enter, preserves Shift+Enter newlines, ignores Korean IME composition Enter/229 events, rejects whitespace-only text, and uses a synchronous ref lock against rapid duplicate submissions.
- Completed P0 bug #13 alignment: comment authors can delete their own comments through an in-app confirmation that works on native and web; backend author permission and comment-count updates have regression coverage.
- Completed P0 bug #92 alignment: comprehensive-exam and graduation-thesis post-detail menus omit the design-excluded author-block action while preserving report, owner actions, and global block semantics.
- Completed bug #16 navigation alignment: post links opened from a board retain the originating board ID, direct post links fall back to the post's own board, header and Android hardware back share that behavior, and no user-facing fallback routes to the hidden all-boards tab.
- Completed bug #12 schedule alignment: Home month arrows update the embedded calendar and its API range without navigating, empty upcoming-schedule rows are inert, and inclusive multi-day overlap rules are shared by the Home calendar, full calendar, and day API queries.
- Completed bug #51 navigation alignment: My Posts, My Comments, and Bookmarks return to My Page from both the header and Android hardware back instead of exposing the tab that happened to be behind the profile drawer.
- Completed P0 bugs #10, #12, #20, #24, #34, and #37 alignment: exam-archive tags are normalized to `시험족보`, duplicate cohort prefixes are removed from author labels, edit success no longer stacks duplicate detail routes, the activity account placeholder matches the approved copy, suggestion details omit author blocking, and mutual-aid detail labels use regular font weight.
- Completed P1 bugs #69 and #70 alignment: activity-certification edits hydrate and update the participant picker and activity calendar while preserving attachments, source linkage, and hidden bank-account metadata.
- Aligned the activity-certification participant design: eligible authors can find and add themselves through the existing name search, and the form explicitly reminds them to do so for support-payment eligibility.
- Completed P1 bug #36 alignment: profile photo selection uploads a real browser `File` on web and a native file descriptor on iOS/Android; image-only changes no longer resubmit or validate unchanged legacy profile fields, and the refreshed profile cache is committed before returning to My Page.
- Completed functional bugs #3 and #4: the notice feed now combines every active notice board, excludes the calendar board, and applies academic/event/webinar/other filtering consistently so the all/other tabs no longer omit valid posts. Home uses the same active notice-board set and shows the two newest deduplicated notices without pin priority. Home notice metadata resolves post and board aliases to user-facing tags, groups webinar and special-lecture notices under `행사공지`, and replaces raw `other` with `기타공지`.
- Completed functional bugs #9, #14, and #15: the resource board set now seeds and routes the member-writable `graduation-thesis` board, and the home event-album shortcut returns to the community tab root so the bottom navigation and back behavior remain intact.
- Completed resource-post edit alignment: authors and administrators can move an existing resource-sharing post among the active resource boards; the API enforces target permissions, preserves the post's related content, and canonicalizes the stored/displayed tag from the target board (`강의후기`, `시험족보`, `종합시험`, or `졸업논문`).
- Verified completion candidates #19, #22, #27, and #32: the in-progress tag uses the approved green state, activity dates share the `YY.MM.DD` formatter, mutual-aid cards expose processing/completed/rejected states, and member detail shows the rejection reason in the pink rejection panel. Regression contracts cover each behavior.
- Completed admin mutual-aid workflow: dedicated processing queue, status filters, private evidence review, required rejection reason, and user notification for processing/completed/rejected changes.
- Completed suggestion workflow: anonymous pending/answered list states, dedicated creation completion, admin reply queue, reply-required answered validation, and author notification.
- Completed cohort-leader administration: admin-only structured multi-cohort registration with captain/vice-captain profiles, representative images, greeting/intro content, and legacy content fallback.
- Completed past-council/FAQ separation: new admin-only past-council board and structured management UI, member read-only list/detail, while FAQ remains on dedicated admin CRUD and user route.
- Completed notification surface audit: Expo project/channel/plugin configuration, native token cleanup on logout, browser permission/test notification and open-site web system notifications. Closed-site web push remains a separate provider/service-worker integration.
- Historical 2026-07-12 and early 2026-07-27 runs reached `0016` and `0019`. The current 2026-07-27 gate reaches `0021`; clean, legacy, downgrade/upgrade, failure-safety, API/media/worker/monitoring, backup/restore, and 104-test PostgreSQL checks pass.
- Completed clean non-production database migration and deterministic seed verification (`users=1`, `boards=32`, `banners=1`); production reference seeding and initial-admin bootstrap are separately regression-tested.
- Completed native SecureStore session persistence, public terms/privacy routes, runtime production secret/CORS/SMTP validation, and PostgreSQL-backed abuse rate limiting.
- Added a daily KST notification worker plus backup/restore rehearsal instructions in `OPERATIONS.md`.
- Backfilled missing notice deadlines for 131 active notice posts; inferred dates use related events or notice text, with a 14-day fallback.
- FAQ has category filtering and accordion-style reading.
- Roadmap, student council fee benefits, club/study, and alumni networking guide content is available from the home flow.

Functional Swing2App replacement estimate:

- UI/menu coverage is high, but release readiness is tracked separately from feature presence.
- Store readiness remains `NO-GO` until signed builds, device/store/live-host checks, approved external inputs, and the frontend dependency-risk decision are complete; do not infer production readiness from menu parity or local Compose success.

P0 launch-candidate hardening:

- Implemented in code: mutual-aid evidence is administrator-only across post detail and media access; non-admin direct media lookup returns object-hiding `404`.
- Implemented in code: public `/uploads` is removed; every media access URL is authorized, uploads stream in chunks, and size/MIME/extension limits are configurable.
- Implemented in code: required post/comment text is trimmed and validated, and FastAPI validation/HTTP errors use the normalized envelope.
- Implemented in code: unknown unversioned schemas are never stamped automatically; clean and exactly recognized legacy paths have regression coverage.
- Implemented in CI: pytest uses a separate PostgreSQL test database and the frontend job verifies lint, focused tests, typecheck, Expo Doctor, and web export.
- Decided for v1: guide content continues to use protected board/post administration; a dedicated guide CRUD domain is deferred to v1.1.
- Completed in code: authentication codes are keyed, email-only, one-time and attempt-limited; deployed SMTP requires verified STARTTLS/implicit TLS, bounded timeouts, and `SMTP_REQUIRED=true`. A digest-pinned optional Compose Cloudflare connector now follows `CLOUDFLARE_ENABLED` with token-file and exact-proxy validation. External gate: create the Named Tunnel/routes, install real token/provider values, and pass the connector/container/inbox/restart signup runbook.
- Completed in code: transactional authentication emails use a provider-aligned SMTP envelope sender and explicit branded From, monitored Reply-To, Date, Message-ID, and automated-message headers. Header-injection and transport behavior have regression coverage; SPF/DKIM/DMARC results and Sogang inbox placement remain external deployment checks.
- Completed: add production rate limiting for login, verification, password reset, reports, post/comment writes, and media upload.
- Completed in code: native token storage uses SecureStore. Physical-device refresh/logout verification remains Phase 5 QA.
- Run full route audit for guest/user/admin on iOS, Android, and web.
- Completed locally: isolated Docker/API smoke reached `0021_account_deletion_receipts` on 2026-07-27 and the 2026-08-02 PostgreSQL migration rehearsal reached `0022_legacy_import_records`. On 2026-08-04 an isolated PostgreSQL database passed clean upgrade and `0023`→`0024`→`0023`→`0024`; the full local legacy-media import, 594-file manifest verification, API fetch, and web image-render smoke also passed.
- Completed locally: the coordinated legacy transfer set (`database.dump`, public/private media archives, redacted reports, and SHA-256 manifest) restored into a fresh PostgreSQL database and fresh media directories; all 594 files and 635,375,068 bytes reproduced the pre-transfer manifest exactly.
- Completed locally: PostgreSQL `pg_dump`/restore reproduced 30 tables with identical all-table row counts and column/index/constraint fingerprints; protected-media tar/restore reproduced identical checksums.
- Completed locally: an unsigned Android release AAB built and passed bundletool, API 36, 16 KB page-alignment, merged-manifest, and extracted-artifact secret checks. It is not a production candidate because official release inputs and signing are absent and placeholder/development strings remain.
- External release gate: `npm run release:check` remains blocked by 18 approved identifiers, assets, Firebase, URL, contact, operator, and policy inputs. EAS production variables, remote versions, production AAB, and iOS archive do not exist yet.
- Store blocker: replace `com.anonymous.sogangcommunity`, add the official iOS bundle identifier, and confirm store version/build numbers.
- Store blocker: provide the official support email/contact URL and final store privacy-policy URL.
- Phase 5 QA: verify push registration/delivery on physical Android/iOS devices and complete the iOS build on macOS/EAS.
- Prepare final store screenshots/icon/feature graphic and the Phase 5 QA issue list.

P1 strongly recommended:

- Completed: Expo Push ticket/receipt logging, two-attempt transport retry, and invalid-token deactivation.
- Completed: immediate notice notifications and idempotent event D-day/D-1 dispatch.
- Completed: admin statistics dashboard and operational audit log.
- Completed: signup display names allow duplicate real names while school email remains the unique account identity.
- Completed: signup privacy consent reuses the My Page policy content, lets the checkbox toggle consent directly, and opens the freely closable full document only from the right chevron.
- Completed: pagination and empty/error/loading states for notifications, search, and activity lists.
- Completed: Argon2id for new passwords with transparent PBKDF2 rehash on login.
- Completed P1 bug #47: mutual-aid event dates are disabled and revalidated before KST D+2 in the mobile form, and the API rejects direct create/date-change bypasses while allowing unchanged historical dates during other edits.
- Completed mutual-aid status/edit alignment: completed requests cannot be deleted, rejected requests can be deleted, and processing-request edits reuse the full application form with existing private-evidence open/remove/add support.
- Completed P1 bug #46: missing required fields, attachments, invalid dates/links, upload failures, and server rejections use an in-app notice modal that renders consistently on native and web instead of relying on React Native Web's no-op `Alert.alert()`.

P2 or v1.1:

- Draft autosave.
- Recurring events.
- Advanced analytics.
- Full-text PostgreSQL search index tuning.

## Work Package 1: Phase 3 Runtime and CI Setup

Source: Notion `Project initial setup (repo, CI/CD)`.

Scope:

- Define branch policy: `main`, `develop`, `feature/*`, `fix/*`.
- Add or document lint/typecheck/test commands.
- Add backend and frontend `.env.example` files.
- Add CI for backend compile/import checks, migration syntax checks, and frontend typecheck.
- Document local, staging, and production environment separation.
- Document secret handling rules.

Definition of done:

- A new developer can clone, configure env files, and run the app from README instructions.
- CI fails on TypeScript errors, backend syntax errors, and migration syntax errors.
- Docker runtime smoke test is passed or blocked with the exact reason.

## Work Package 2: Phase 3 DB Build and Initial Data

Source: Notion `DB build and initial data setup`.

Scope:

- Verify Alembic migrations against PostgreSQL.
- Verify seed data matches the target IA from `PLAN.md`.
- Add local development dummy data only where useful.
- Keep deterministic users/credentials non-production-only; production startup may add missing reference records but must not overwrite operator edits or deactivate custom boards.
- Provision the first production administrator only by promoting an existing active member through the one-time audited bootstrap command.
- Document backup policy and data reset policy.
- Keep DB schema aligned with SQLAlchemy models and Pydantic schemas.

Definition of done:

- `alembic upgrade head` succeeds on a clean database.
- Non-production deterministic seed and production non-authoritative reference seed both succeed with their distinct safety guarantees.
- Initial boards, local demo accounts, and the production-only first-admin bootstrap are documented.

## Work Package 3: Phase 3 Auth and Account Completion

Source: Notion `Auth/login feature development`.

Scope:

- Completed: mobile password reset request/verify/confirm screens.
- Completed: frontend token refresh failure handling and logout fallback.
- Completed in code: provider-independent STARTTLS/implicit-TLS transport, connection-only preflight, normalized signup delivery failure, one-time registration claim, remote-client timeout handling, and an optional Compose-managed Named Tunnel connector. Deployment-only: supply the Cloudflare token/dashboard routes and run the container SMTP/inbox and external-network restart signup tests described in `OPERATIONS.md`.
- Completed: Argon2id for new passwords with transparent PBKDF2 rehash on successful login.
- Completed: PostgreSQL-backed rate limiting for login, verification, password reset, reports, write-heavy endpoints, and media upload.

Definition of done:

- Guest, user, and admin auth paths can be smoke-tested.
- Password reset works from mobile UI through backend API.
- Logout invalidates refresh tokens.
- Auth errors are readable and do not leak sensitive details.

## Work Package 4: Phase 3 Profile and Account UI

Source: Notion `User profile feature development`.

Scope:

- Add profile view/edit screen.
- Add account screen for password change and irreversible account deletion.
- Add profile image upload using the media foundation.
- Keep signup name/nickname required and normalized, but allow duplicate real names.
- Decide whether banned-word filtering is required for launch.

Definition of done:

- User can edit backend-supported profile fields.
- Profile image upload stores media and shows the updated image.
- Password change and authenticated account deletion are available from settings; a signed-out user can use the public email request/verify deletion flow.

## Work Package 5: Phase 3 Core Community Feature A

Source: Notion `Core feature A: boards/community`.

Scope:

- Add post create/edit image/file picker and upload progress.
- Polish pagination or infinite scroll.
- Add report model/API hooks for later moderation.
- Add draft autosave if accepted as P1 for launch.
- Confirm anonymous post behavior in list/detail/admin contexts.
- Add board category/filter UX where each board type needs it.

Definition of done:

- User can browse boards, create/edit/delete posts, comment/reply, like, bookmark, search, and attach media from mobile.
- Permission failures are handled cleanly.
- Community flows pass mobile route testing.

## Work Package 6: Phase 4 Notifications and Notices

Source: Notion `Core feature B: notifications/notices`.

Scope:

- Completed: admin notice CRUD.
- Completed: notification trigger rules for comments, likes, notices, and events.
- Completed: push token model and API.
- Completed: Expo provider adapter with disabled/local fallback, retry, and ticket/receipt logging.
- Completed: in-app notification list/read state/settings UX.
- Completed: notification categories and D-day/D-1 timing; physical-device delivery remains Phase 5 QA.

Definition of done:

- In-app notifications are created by real app events.
- Users can read and configure notification categories.
- Push integration has provider env variables, local fallback, and error logging.

## Work Package 7: Phase 4 Schedule and Events

Source: Notion `Core feature C: schedule/events`.

Scope:

- Completed: calendar view route.
- Completed: event detail screen.
- Completed: admin event create/update/delete UI.
- Completed: event categories `academic`, `event`, `exam`, `council`, `external`, and `other`.
- Decided: recurring events are deferred to v1.1.
- Completed: idempotent D-day/D-1 notifications are connected to the notification system.

Definition of done:

- Authenticated members can browse list/calendar/detail views; guest requests return normalized `401`.
- Admin users can manage events.
- D-day notification behavior is documented and testable.

## Work Package 8: Phase 4 Admin Surface

Source: Notion `Admin page development`.

Scope:

- Decide admin surface location: separate web app, Expo admin routes, or backend-served admin.
- Implement admin login guard and backend role checks.
- Add user management: list, role/status update, deactivate.
- Add moderation: posts/comments/report review/delete.
- Add content management: notices, FAQs, events, guide cards.
- Add basic statistics: users, active users, posts, comments, notices.

Definition of done:

- Admin actions are protected by backend admin dependencies.
- Admin can manage launch-critical content without direct DB edits.
- Audit/logging needs are documented, even if deferred.

## Work Package 9: Phase 4 Full Frontend-Backend Integration

Source: Notion `Frontend-backend full integration`.

Scope:

- Normalize API base URL handling for local, staging, and production.
- Run login -> feature use -> logout flows.
- Test all mobile routes from the target IA.
- Run backend checks, frontend typecheck, and runtime API smoke test.
- Verify iOS and Android builds or document blockers.
- Prepare Phase 5 QA issue list.

Definition of done:

- Critical bug count is zero.
- Every P0 route is reachable and connected to backend data.
- Phase 5 QA can begin with a known test matrix and no undocumented blockers.

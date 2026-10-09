# Supplied-reference poll alignment — 2026-10-08

WP6/WP8/WP9 P0. The user supplied two images and requested that the member poll
screen match them and omit features absent from the reference. This supersedes
the earlier `POLL_VISUAL_DESIGN` and member progress/receipt decisions in
`POLL_USABILITY`; administrator permission/workflow safeguards remain.

## Implemented

- Bordered rounded cards with question title, two count rows, proportional
  full-row blue fills and total participation. Server-confirmed choices use a
  blue outline/check. Option tap saves immediately; no separate submit action.
- Participant access appears after voting or on closed/read-only results.
  Voted open cards offer a neutral revote button. Closed cards show 마감 and
  마감됨 and never offer revoting. Removed progress/receipt/extra explanations,
  generic status headers, manual refresh, winner badges and result buttons.
- Participant bottom sheet has a subtle handle, title and option/count tabs.
  Rounded cards show a placeholder person avatar, cohort/name and current major.
  Option switching queries that question/option only; pagination loads on scroll
  and deduplicates users. Backdrop, handle and system back close the sheet.
- Only voted API profiles gain nullable `major`; nonparticipant profiles and
  existing member/post authorization are unchanged. Contact, company, email and
  roster data are excluded. No schema migration or dependency was introduced.
- Read-only administrator draft previews use the revised row styling, without
  creating votes or inventing current option counts.

## Preserved contracts

Independent cards, explicit administrator closure, first-vote structural locks,
legacy results, account-scoped query caches, server conflict messages and
double-tap guards remain. A pending vote retains its previous saved selection;
failed requests allow another option tap. Space/Enter activation works on web.
Existing legacy photo choices retain their identifying thumbnails in both member
results and administrator previews; current binary polls have no photo controls.

The existing attendance API has no scheduled poll end (`ends_at=null`); the
reference's example deadline is therefore omitted for open cards. Notice
application deadlines remain independent. No automatic closure was added.

## Verification

- Red tests reproduced separate-submit/extra-tab behavior and missing major.
- Focused member component tests: 12 passed; vote/revote/pending/error/closed/
  legacy/question scope, participant tabs/paging/deduplication and web keyboard.
- Focused backend poll/participation/attendance tests: 23 passed.
- Final full frontend suite: **938 passed, zero failed/skipped**.
- Full backend suite: **626 passed, 3 skipped**. These are PostgreSQL
  transaction-lock tests; the local suite uses SQLite and reports
  `PostgreSQL is required to verify transaction locks`. One existing Starlette
  test-client deprecation warning remains. Backend compile check passes.
- Final frontend typecheck and scoped lint pass. The complete frontend lint also
  passed before the final thumbnail/style delta. Final Expo web export succeeds:
  `entry-e0915382a7fdaec415329eef8fa42bc7.js`.
- Independent read-only review approved the corrected diff with no remaining
  findings and an empty declined-to-judge list. It reproduced the legacy
  thumbnail omission before correction, then confirmed restored thumbnails and
  disabled legacy voting. Root's regression test also observed red then green.

## Browser verification

Real protected local preview API at `127.0.0.1:8000`, Expo at `localhost:8083`.
Created only a clearly labelled local synthetic notice 13 and 21 fixture voters;
original notice 11 remains available. Production data and GCP were untouched.

- Unvoted card shows 20/1 option counts and 21 participants with no extra action.
  Tapping 참석 persists immediately, shows the saved check/outline, 21/1 counts,
  22 participants and the reference's participant/revote controls.
- Space-key revoting changes the persisted answer to 불참 (20/2 counts, same
  total). The previous saved check remains during the pending request. Restored
  참석 afterwards, then closed only the created fixture through its admin API.
  Closed results retain the selection/counts, show 마감/마감됨, and omit revoting.
- Participant tabs show only the selected option's profiles and current major.
  Scrolling loads the 21st 참석 person after the first 20. Switching to 불참
  resets the list to its single person and shrinks the sheet to its content.
  Escape and backdrop dismissal work; handle dismissal is also wired/tested.
- Cards and participant sheets inspected at 390px and 320px. At 320px the
  document's client and scroll widths both equal 320; no horizontal overflow.
- A stale pre-merge Metro file map initially rejected existing `AdminTable.tsx`.
  Restarted only the disposable preview/Metro processes, clearing Metro cache;
  the bundle returned 200 and the app rendered normally. No code workaround.

Evidence in ignored `outputs/qa/poll-reference-2026-10-08/`: full-suite/build/check
logs, `before-vote-390.jpg`, `after-vote-390.jpg`, `closed-390.jpg`,
`participants-390.jpg`, `participants-absent-390.jpg`, `participants-320.jpg`,
`revote-320.jpg`, local fixture setup and closure metadata. Browser viewport
override is reset after verification.

## Limits

Physical Android/iOS gestures, font scaling and screen reader runtime remain
Phase 5 QA. This follow-up edits local development code; it does not update the
earlier deployed GCP version.

## Verification after merged-main pull — 2026-10-09

The user merged PR #31 and requested pulling main, committing and pushing this
poll follow-up. Main fast-forwarded to `3b32d6a`; the preserved poll changes
reapplied without conflicts. The merged shared-route/tab-stack implementation
is retained. Its moved member detail and administrator routes resolve the poll
component and dedicated notice preview/editor correctly.

- Fresh full frontend suite: **966 passed, zero failed/skipped**.
- Fresh full backend suite with isolated in-memory SQLite: **626 passed,
  3 PostgreSQL-only transaction-lock skips**, one existing Starlette warning.
- Frontend typecheck, complete lint, backend compile and diff checks pass.
- Fresh Expo web export succeeds with
  `entry-4401d9413b5cf935e07c291c06d3118c.js`.
- Independent read-only review of this diff against merged main reports no
  actionable Critical, Important or Minor issues. Physical native runtime,
  production deployment and reconsideration of the already-merged navigation
  design were explicitly outside its scope; fresh suites were verified by the
  coordinating agent.

Logs and the disposable web export are in ignored
`outputs/qa/poll-push-2026-10-09/`. This request updates Git; GCP deployment and
native/store release remain separate. Existing local browser captures above
verify the poll design; no fresh physical iOS/Android validation is claimed.

## GCP deployment — 2026-10-09

The user subsequently authorized GCP deployment. Previous VM checkout/runtime
was `7a2cffe`; deployed application code is
`462c826a824c8aacbec4a75ae1ecb32dd1e5972c`, including merged PR #31 and these poll
changes. The server is `sogang-aisw-app` in `asia-northeast3-b`, repository
`/opt/aisw-app`, canonical site `https://www.aisw-campus.com`.

- Candidate backend/worker/frontend production builds completed before replacing
  the running services. No migration or deployment configuration changed.
- Coordinated private DB/public-media/private-media backup completed in
  `/srv/aisw-backups/poll-20261009-462c826`. Archive parsing and SHA-256 checks
  passed; each artifact has mode 600. Previous runtime images and environment
  snapshots were retained privately on the VM.
- The real custom-format database dump was restored successfully into an isolated
  temporary PostgreSQL container with networking disabled. Its migration head
  remained `0034_attendance_polls`; the temporary container was removed.
- Production-domain deployment and verification jobs exited **0**. Recovery
  coverage remained active through verification. Error scanning began before
  service replacement, including startup.
- Production Alembic current/check passed with one head
  `0034_attendance_polls` and no new upgrade operations.
- Backend and worker each match **all 134** tracked runtime/migration source
  hashes. Backend, worker, web, database and ingress are running with restart
  count **0**. Backend/worker post-switch error-marker counts are **0**.
- HTTPS certificate/readiness, IP compatibility and canonical/alias redirect
  smoke checks passed. External login/privacy/detail/admin deep links served
  the current web shell. Unauthenticated poll/participant/admin APIs returned
  normalized **401** errors.
- External served index and JavaScript bytes match the frontend container.
  Bundle: `entry-46d51e82bdf3e87f0f36b76c0f50d28c.js`, 3,992,857 bytes, SHA-256
  `8ce57c623eb0453a014cc0d6a92d563b15c2cc90ff7447183f4cceb8731750c7`.
  Index SHA-256:
  `9c13fcdcafef14e528da49b0ba81b9138bdee60de058ac1b968001c50b47bc00`.

No production users, votes, notices or notifications were created for checks.
Operational script review findings were corrected before switching: explicit
clean-checkout guards, network-isolated restore, recovery through verification,
and startup-inclusive error scanning. Corrected scripts had no remaining
concrete review blockers.

Redacted verification evidence is in ignored
`outputs/qa/gcp-poll-deploy-2026-10-09/`; backups and private restore diagnostics
remain on the VM. This deployment does not publish Android/iOS packages or
replace the outstanding physical-device QA. The final deployment-record commit
changes documentation only; application sources remain identical to `462c826`.

## Participant sheet width follow-up — 2026-10-09

The user's screenshot exposed a web-only frame mismatch: at a 669px viewport,
the centered member shell spans x=132–537 (405px), while the participant sheet
spanned x=124.5–544.5 (420px). It protruded 7.5px on each side. The Modal is
portaled outside the shell, so its own width must follow the web frame.

The sheet now caps its width at 405px on web above the existing 430px frame
breakpoint. Smaller web widths and native retain the previous 420px cap.
Browser measurements verify:

| Viewport | Sheet width | Outside frame/viewport | Content overflow |
| --- | --- | --- | --- |
| 320px | 320px | No | No |
| 390px | 390px | No | No |
| 430px | 420px | No | No |
| 431px | 405px | No | No |
| 669px | 405px, x=132–537 | No | No |
| 1280px | 405px | No | No |

Checks ran while resizing the open sheet, including the breakpoint transition.
Option-tab switching and handle dismissal passed. Existing 12 poll component
tests, frontend typecheck and scoped lint passed; independent read-only review
found no concrete regressions. No new style-mirroring unit test was added; the
real browser bounds check failed before the fix and passed afterward.

Ignored evidence: `outputs/qa/poll-sheet-width-2026-10-09/geometry.json`,
`before-669.jpg`, `after-669.jpg`, `after-669-compact.jpg` and `after-320.jpg`.
The local Metro preview was restarted after the merged route file changes;
its temporary cold-start network state recovered through the existing Retry
action before final measurements. This follow-up is verified locally; the
earlier GCP deployment above still identifies the previous runtime. Physical
native runtime was not re-tested for this web-only change.

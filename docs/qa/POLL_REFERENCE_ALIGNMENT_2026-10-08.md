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
